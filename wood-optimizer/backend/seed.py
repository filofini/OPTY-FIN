import sys
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parent))

from database import SessionLocal, engine
import models, schemas_enums

# Create tables
models.Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    import auth
    
    # Try to seed users
    if not db.query(models.User).filter(models.User.username == "ufficio").first():
        office_user = models.User(
            username="ufficio",
            hashed_password=auth.get_password_hash("password"),
            role=schemas_enums.RoleEnum.OFFICE
        )
        db.add(office_user)
        
    if not db.query(models.User).filter(models.User.username == "produzione").first():
        prod_user = models.User(
            username="produzione",
            hashed_password=auth.get_password_hash("password"),
            role=schemas_enums.RoleEnum.PRODUCTION
        )
        db.add(prod_user)
        
    db.commit()
    
    # Check if stock exists
    existing = db.query(models.Stock).filter(models.Stock.woodType == "A").first()
    if existing:
        print("Data already seeded.")
        db.close()
        return

    # Seed stock: woodType A, 80x20, length 4000, qty 2
    stock1 = models.Stock(
        woodType="A",
        thickness=20,
        width=80,
        length_mm=4000,
        qty=2,
        source=schemas_enums.SourceEnum.PURCHASE,
        note="Seed stock"
    )
    db.add(stock1)
    
    # Seed a template for matching demand: 4 pieces of 2000
    template1 = models.Template(
        internalCode="TPL-001",
        title="Test Pallet"
    )
    db.add(template1)
    db.commit()
    db.refresh(template1)
    
    piece1 = models.TemplatePiece(
        template_id=template1.id,
        woodType="A",
        thickness=20,
        width=80,
        length_mm=2000,
        qty=4
    )
    db.add(piece1)
    
    # Seed an order that demands this template
    order1 = models.Order(
        orderCode="ORD-001",
        status=schemas_enums.OrderStatusEnum.NEW
    )
    db.add(order1)
    db.commit()
    db.refresh(order1)
    
    order_item1 = models.OrderItem(
        order_id=order1.id,
        palletTemplateId=template1.id,
        qty=1
    )
    db.add(order_item1)
    
    db.commit()
    print("Seed data inserted successfully.")
    print(f"Order ID: {order1.id}, Template ID: {template1.id}")
    db.close()

if __name__ == "__main__":
    seed_data()
