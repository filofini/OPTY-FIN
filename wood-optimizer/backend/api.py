from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import crud, models, schemas, database, optimization, schemas_enums, auth
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from fastapi import WebSocket, WebSocketDisconnect
import pandas as pd
import os
import io
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import barcode
from barcode.writer import ImageWriter

router = APIRouter()

# --- WebSockets ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We just need to keep connection open and listen, though we expect mostly to push
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(auth.get_current_user)):
    return current_user

# --- Stock ---
@router.get("/stock", response_model=List[schemas.Stock])
def read_stock(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    return crud.get_stock(db, skip=skip, limit=limit)

@router.post("/stock", response_model=schemas.Stock)
def create_stock(stock: schemas.StockCreate, db: Session = Depends(get_db)):
    return crud.create_stock(db=db, stock=stock)

@router.put("/stock/{stock_id}", response_model=schemas.Stock)
def update_stock(stock_id: int, stock: schemas.StockUpdate, db: Session = Depends(get_db)):
    db_stock = crud.update_stock(db, stock_id, stock)
    if db_stock is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return db_stock

@router.delete("/stock/{stock_id}")
def delete_stock(stock_id: int, db: Session = Depends(get_db)):
    db_stock = crud.delete_stock(db, stock_id)
    if db_stock is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return {"ok": True}

@router.get("/stock/{stock_id}/pdf")
def print_stock_label(stock_id: int, db: Session = Depends(get_db)):
    db_stock = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
    if not db_stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    filename = f"lotto_{stock_id}_etichetta.pdf"
    filepath = f"/tmp/{filename}"
    
    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4
    y = height - 50
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, f"Etichetta Ingresso Merce - Lotto #{stock_id}")
    y -= 40
    
    c.setFont("Helvetica", 14)
    c.drawString(50, y, f"Materiale: {db_stock.woodType} {db_stock.thickness}x{db_stock.width} L={db_stock.length_mm}mm")
    y -= 20
    c.drawString(50, y, f"Quantità: {db_stock.qty} pz")
    y -= 20
    c.drawString(50, y, f"Origine: {db_stock.source}")
    y -= 40
    
    barcode_id = f"LOT-{stock_id}"
    try:
        code128 = barcode.get_barcode_class('code128')
        bc = code128(barcode_id, writer=ImageWriter())
        options = {"write_text": True, "font_size": 10, "text_distance": 5, "module_height": 5}
        bc_filename = f"/tmp/bc_{barcode_id}"
        bc.save(bc_filename, options)
        
        c.drawImage(f"{bc_filename}.png", 50, y - 60, width=200, height=60)
        if os.path.exists(f"{bc_filename}.png"):
            os.remove(f"{bc_filename}.png")
    except Exception as e:
        c.drawString(50, y, f"[Barcode Error: {str(e)}]")
        
    c.save()
    return FileResponse(path=filepath, filename=filename, media_type='application/pdf')

@router.post("/stock/{stock_id}/consume")
async def consume_stock(stock_id: int, db: Session = Depends(get_db)):
    db_stock = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
    if not db_stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    db_stock.qty = 0
    db.commit()
    await manager.broadcast("UPDATE")
    return {"ok": True, "message": "Lot consumed"}

# --- Templates ---
@router.get("/templates", response_model=List[schemas.Template])
def read_templates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    return crud.get_templates(db, skip=skip, limit=limit)

@router.post("/templates", response_model=schemas.Template)
def create_template(template: schemas.TemplateCreate, db: Session = Depends(get_db)):
    # Check if internalCode exists
    db_temp = db.query(models.Template).filter(models.Template.internalCode == template.internalCode).first()
    if db_temp:
        raise HTTPException(status_code=400, detail="Internal code already exists")
    return crud.create_template(db=db, template=template)

@router.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    db_temp = crud.delete_template(db, template_id)
    if db_temp is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"ok": True}

# --- Orders ---
@router.get("/orders", response_model=List[schemas.Order])
def read_orders(skip: int = 0, limit: int = 100, include_archived: bool = False, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    return crud.get_orders(db, skip=skip, limit=limit, include_archived=include_archived)

@router.get("/orders/{order_id}", response_model=schemas.Order)
def read_order(order_id: int, db: Session = Depends(get_db)):
    db_order = crud.get_order(db, order_id=order_id)
    if db_order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return db_order

@router.post("/orders", response_model=schemas.Order)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    db_order = db.query(models.Order).filter(models.Order.orderCode == order.orderCode).first()
    if db_order:
        raise HTTPException(status_code=400, detail="Order code already exists")
    return crud.create_order(db=db, order=order)

@router.put("/orders/{order_id}/status", response_model=schemas.Order)
async def update_order_status(order_id: int, status: schemas_enums.OrderStatusEnum, db: Session = Depends(get_db)):
    db_order = crud.update_order_status(db, order_id, status)
    if db_order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    await manager.broadcast("UPDATE")
    return db_order

@router.put("/orders/{order_id}/items/{item_id}/status", response_model=schemas.OrderItem)
async def update_order_item_status(order_id: int, item_id: int, status: schemas_enums.ItemStatusEnum, db: Session = Depends(get_db)):
    db_item = crud.update_order_item_status(db, item_id, status)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Order item not found")
    await manager.broadcast("UPDATE")
    return db_item

@router.delete("/orders/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    db_order = crud.delete_order(db, order_id)
    if db_order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"ok": True}

# --- Chat Messages ---
@router.post("/orders/{order_id}/messages", response_model=schemas.OrderMessage)
async def add_order_message(order_id: int, message: schemas.OrderMessageCreate, db: Session = Depends(get_db)):
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    msg = crud.create_order_message(db=db, order_id=order_id, message=message)
    await manager.broadcast("UPDATE")
    return msg

# --- Optimization & Excel Export ---
@router.post("/orders/{order_id}/optimize")
def optimize_order(order_id: int, db: Session = Depends(get_db)):
    # Run optimization
    result = optimization.process_optimization(db, order_id)
    if result["status"] == "ERROR":
        raise HTTPException(status_code=400, detail=result["message"])
        
    # Update order status to PLANNED if OK
    if result["status"] == "OK":
        crud.update_order_status(db, order_id, schemas_enums.OrderStatusEnum.PLANNED)
        
    return result

@router.get("/orders/{order_id}/export")
def export_order_plan(order_id: int, db: Session = Depends(get_db)):
    db_order = crud.get_order(db, order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Re-run optimization to get the plan data without modifying stock
    # Normally we would save the plan to the DB, but for simplicity we re-run logic on frozen demand
    # Wait, the optimization function mutates stock if it's OK! 
    # Let's adjust optimization so it doesn't mutate or just assume we have the optimized result.
    # Actually, we should probably run optimization without mutations just for export or save the cut plan to DB.
    # Since Excel format is specific, let's re-generate just the demand and run the logic without commit for data.
    
    # We will build a read-only pass
    demand_by_group = optimization.aggregate_order_demand(db, order_id)
    if not demand_by_group:
        raise HTTPException(status_code=400, detail="Order has no items")
        
    results = {}
    is_insufficient = False
    
    for group_key, lengths in demand_by_group.items():
        parts = group_key.split("_")
        woodType, thickness, width = parts[0], float(parts[1]), float(parts[2])
        
        db_stock = db.query(models.Stock).filter(
            models.Stock.woodType == woodType,
            models.Stock.thickness == thickness,
            models.Stock.width == width,
            models.Stock.qty > 0
        ).all()
        
        stock_list = [{"id": s.id, "length": s.length_mm, "source": s.source, "qty": s.qty} for s in db_stock]
        used_boards, missing = optimization.optimize_group(lengths, stock_list)
        
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
        if missing:
            is_insufficient = True
            
    # Prepare data for Excel
    summary_data = []
    cut_plan_data = []
    
    for group_key, data in results.items():
        g = data["group"]
        group_name = f"{g['woodType']} {g['thickness']}x{g['width']}"
        total_req = sum([len(b['cuts']) for b in data['used_boards']]) + len(data['missing'])
        total_scrap = sum([b['leftover'] for b in data['used_boards'] if b['leftover_type'] == "SCRAP"])
        offcut_boards = [b for b in data['used_boards'] if b['leftover_type'] == "OFFCUT"]
        total_offcut_mm = sum([b['leftover'] for b in offcut_boards])
        
        summary_data.append({
            "Gruppo": group_name,
            "Pezzi richiesti totali": total_req,
            "Tavole usate": len(data['used_boards']),
            "Scarto totale (mm)": total_scrap,
            "Offcut generati (numero)": len(offcut_boards),
            "Offcut generati (mm totali)": total_offcut_mm,
            "Esito": "INSUFFICIENT" if is_insufficient else "OK"
        })
        
        # Group identical boards
        from collections import defaultdict
        grouped_boards = defaultdict(lambda: {"qty": 0, "leftover": 0, "cuts_str": ""})
        
        for b in data['used_boards']:
            cuts_str = "|".join(map(lambda x: f"{int(x)}", b["cuts"]))
            key = (b["original_length"], cuts_str, b["leftover"])
            grouped_boards[key]["qty"] += 1
            grouped_boards[key]["leftover"] = b["leftover"]
            grouped_boards[key]["cuts_str"] = cuts_str
            
        sorted_keys = sorted(grouped_boards.keys(), key=lambda k: k[0])
        current_len = None
        
        for key in sorted_keys:
            length, cuts_str, leftover = key
            qty = grouped_boards[key]["qty"]
            
            if length != current_len:
                cut_plan_data.append({
                    "Gruppo": group_name,
                    "Lunghezza originale": length,
                    "Schema di Taglio": "",
                    "Quantità": "",
                    "Scarto singolo (mm)": ""
                })
                current_len = length
                
            cut_plan_data.append({
                "Gruppo": group_name,
                "Lunghezza originale": "",
                "Schema di Taglio": cuts_str,
                "Quantità": qty,
                "Scarto singolo (mm)": leftover
            })

    # Write Excel
    filename = f"ordine_{db_order.orderCode}_cutplan.xlsx"
    filepath = f"/tmp/{filename}"
    
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        df_summary = pd.DataFrame(summary_data)
        df_summary.to_excel(writer, sheet_name='SUMMARY', index=False)
        
        df_cutplan = pd.DataFrame(cut_plan_data)
        df_cutplan.to_excel(writer, sheet_name='CUT_PLAN', index=False)
        
    return FileResponse(path=filepath, filename=filename, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@router.get("/orders/{order_id}/pdf")
def export_order_pdf(order_id: int, db: Session = Depends(get_db)):
    db_order = crud.get_order(db, order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    order_items = db.query(models.OrderItem).filter(models.OrderItem.orderId == order_id).all()
    if not order_items:
        raise HTTPException(status_code=400, detail="Order has no items")

    filename = f"ordine_{db_order.orderCode}_etichette.pdf"
    filepath = f"/tmp/{filename}"
    
    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4
    y = height - 50
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, f"Etichette Bancali - Ordine: {db_order.orderCode}")
    y -= 40
    
    for item in order_items:
        template = db.query(models.Template).filter(models.Template.id == item.palletTemplateId).first()
        if not template:
            continue
            
        if y < 150:
            c.showPage()
            y = height - 50
            
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, f"Bancale: {template.title} ({template.internalCode})")
        y -= 20
        c.setFont("Helvetica", 12)
        c.drawString(50, y, f"Qt: {item.qty}")
        y -= 20
        c.drawString(50, y, f"Ordine: {db_order.orderCode}")
        
        # Barcode for Pallet Type in this order
        barcode_id = f"ORDPLT-{db_order.id}-{item.id}"
        try:
            code128 = barcode.get_barcode_class('code128')
            bc = code128(barcode_id, writer=ImageWriter())
            options = {"write_text": True, "font_size": 10, "text_distance": 5, "module_height": 5}
            bc_filename = f"/tmp/bc_{barcode_id}"
            bc.save(bc_filename, options)
            
            # Draw barcode image
            c.drawImage(f"{bc_filename}.png", 300, y - 20, width=200, height=60)
            if os.path.exists(f"{bc_filename}.png"):
                os.remove(f"{bc_filename}.png")
        except Exception as e:
            c.drawString(300, y, f"[Barcode Error: {str(e)}]")
            
        y -= 60
        c.line(50, y, width - 50, y)
        y -= 30

    c.save()
    return FileResponse(path=filepath, filename=filename, media_type='application/pdf')

# --- Statistics ---
@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user = Depends(auth.require_office_role)):
    orders = crud.get_orders(db, limit=10000, include_archived=True)
    total_orders = len(orders)
    completed_orders = len([o for o in orders if o.status == schemas_enums.OrderStatusEnum.DONE or o.status == schemas_enums.OrderStatusEnum.SHIPPED])
    
    stock = db.query(models.Stock).all()
    total_stock_qty = sum(s.qty for s in stock)
    
    # Mock some timeline data for the chart
    monthly_orders = [
        {"name": "Gennaio", "ordini": 10},
        {"name": "Febbraio", "ordini": 15},
        {"name": "Marzo", "ordini": total_orders}
    ]
    
    return {
        "kpi": {
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "total_stock_qty": total_stock_qty,
            "scrap_percent": "12.5%" # Mock value. In a real scenario we save this during optimization
        },
        "chart_data": monthly_orders
    }
