from typing import List, Dict
from sqlalchemy.orm import Session
import models
import schemas_enums

def aggregate_order_demand(db: Session, order_id: int) -> Dict[str, List[float]]:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        return {}

    demand = {}
    for item in order.items:
        template = item.template
        qty_multiplier = item.qty
        for piece in template.pieces:
            group_key = f"{piece.woodType}_{piece.thickness}_{piece.width}"
            if group_key not in demand:
                demand[group_key] = []
            
            # Add piece 'qty * template_qty' times
            demand[group_key].extend([piece.length_mm] * (piece.qty * qty_multiplier))

    return demand

def optimize_group(demand_lengths: List[float], stock: List[dict]):
    # stock format: [{"id": 1, "length": 4000, "source": "OFFCUT", "qty": 2}, ...]
    # order the lengths descending
    demand_lengths.sort(reverse=True)
    
    # split stock into individual boards, prioritizing OFFCUT
    available_boards = []
    for s in stock:
        # Priority: OFFCUT before PURCHASE
        priority = 0 if s["source"] == schemas_enums.SourceEnum.OFFCUT else 1
        for _ in range(s["qty"]):
            available_boards.append({
                "id": s["id"], 
                "length": s["length"], 
                "source": s["source"],
                "rem": s["length"],
                "cuts": [],
                "priority": priority
            })
            
    # Sort available boards by priority
    available_boards.sort(key=lambda x: x["priority"])
    
    used_boards = []
    insufficient = []
    
    for req in demand_lengths:
        best_board_idx = -1
        best_rem = float('inf')
        
        # 1. Best fit checking existing 'used_boards'
        for i, b in enumerate(used_boards):
            rem = b["rem"] - req
            if rem >= 0 and rem < best_rem:
                best_rem = rem
                best_board_idx = i
                
        if best_board_idx != -1:
            used_boards[best_board_idx]["rem"] -= req
            used_boards[best_board_idx]["cuts"].append(req)
        else:
            # 2. Need a new board from available_boards
            if len(available_boards) > 0:
                # Find the one that leaves smallest positive remainder >= 0
                best_avail_idx = -1
                best_avail_rem = float('inf')
                for i, ab in enumerate(available_boards):
                    rem = ab["rem"] - req
                    # To minimize waste, try to match the smallest board that fits
                    if rem >= 0 and rem < best_avail_rem:
                        best_avail_rem = rem
                        best_avail_idx = i
                        
                if best_avail_idx != -1:
                    new_board = available_boards.pop(best_avail_idx)
                    new_board["rem"] -= req
                    new_board["cuts"].append(req)
                    used_boards.append(new_board)
                else:
                    # No board big enough
                    insufficient.append(req)
            else:
                # No boards left
                insufficient.append(req)

    # Note: A real 'swapping' improvement algorithm would try to swap items between used_boards
    # to reduce scrap here. To keep it simple, best-fit decreasing usually is quite optimal for 1D bin packing.
    
    return used_boards, insufficient

def process_optimization(db: Session, order_id: int):
    # 1. Aggregate demand
    demand_by_group = aggregate_order_demand(db, order_id)
    if not demand_by_group:
        return {"status": "ERROR", "message": "Order not found or no items"}

    results = {}
    is_insufficient = False
    
    # 2. Iterate by group
    for group_key, lengths in demand_by_group.items():
        parts = group_key.split("_")
        woodType = parts[0]
        thickness = float(parts[1])
        width = float(parts[2])
        
        # 3. Retrieve stock for group
        db_stock = db.query(models.Stock).filter(
            models.Stock.woodType == woodType,
            models.Stock.thickness == thickness,
            models.Stock.width == width,
            models.Stock.qty > 0
        ).all()
        
        stock_list = []
        for s in db_stock:
            stock_list.append({
                "id": s.id,
                "length": s.length_mm,
                "source": s.source,
                "qty": s.qty
            })
            
        # 4. Optimize
        used_boards, missing = optimize_group(lengths, stock_list)
        
        group_results = []
        for b in used_boards:
            is_offcut = b["rem"] >= 200
            leftover_type = "OFFCUT" if is_offcut else "SCRAP"
            group_results.append({
                "board_id": b["id"],
                "original_length": b["length"],
                "source": b["source"],
                "cuts": b["cuts"],
                "leftover": b["rem"],
                "leftover_type": leftover_type
            })
            
        results[group_key] = {
            "group": {"woodType": woodType, "thickness": thickness, "width": width},
            "used_boards": group_results,
            "missing": missing
        }
        
        if len(missing) > 0:
            is_insufficient = True
            
    # 5. Determine outcome
    if is_insufficient:
        return {"status": "INSUFFICIENT", "data": results, "message": "Not enough material for all parts. Stock NOT modified."}

    # 6. Apply stock mutations ONLY if sufficient
    for group_key, group_data in results.items():
        # group_data["used_boards"] maps to reductions in db
        woodType = group_data["group"]["woodType"]
        thickness = group_data["group"]["thickness"]
        width = group_data["group"]["width"]

        board_usage_count = {}
        for b in group_data["used_boards"]:
            bid = b["board_id"]
            board_usage_count[bid] = board_usage_count.get(bid, 0) + 1
            
        for bid, used_qty in board_usage_count.items():
            stock = db.query(models.Stock).filter(models.Stock.id == bid).first()
            if stock:
                stock.qty -= used_qty
                if stock.qty == 0:
                    stock.note = "Esaurito - In attesa di completamento ordine"
                
        # create OFFCUTS
        for b in group_data["used_boards"]:
            if b["leftover_type"] == "OFFCUT":
                # Create offcut as new stock row
                new_offcut = models.Stock(
                    woodType=woodType,
                    thickness=thickness,
                    width=width,
                    length_mm=b["leftover"],
                    qty=1,
                    source=schemas_enums.SourceEnum.OFFCUT,
                    note="Generated from optimization"
                )
                db.add(new_offcut)
                
    db.commit()
    return {"status": "OK", "data": results}
