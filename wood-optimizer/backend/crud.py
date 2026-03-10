from sqlalchemy.orm import Session
import models, schemas, schemas_enums
import datetime

# -- Stock --
def get_stock(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Stock).offset(skip).limit(limit).all()

def create_stock(db: Session, stock: schemas.StockCreate):
    db_stock = models.Stock(**stock.model_dump())
    db.add(db_stock)
    db.commit()
    db.refresh(db_stock)
    return db_stock

def update_stock(db: Session, stock_id: int, stock: schemas.StockUpdate):
    db_stock = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
    if db_stock:
        for key, value in stock.model_dump().items():
            setattr(db_stock, key, value)
        db.commit()
        db.refresh(db_stock)
    return db_stock

def delete_stock(db: Session, stock_id: int):
    db_stock = db.query(models.Stock).filter(models.Stock.id == stock_id).first()
    if db_stock:
        db.delete(db_stock)
        db.commit()
    return db_stock

# -- Templates --
def get_templates(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Template).offset(skip).limit(limit).all()

def create_template(db: Session, template: schemas.TemplateCreate):
    db_template = models.Template(internalCode=template.internalCode, title=template.title)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    for piece in template.pieces:
        db_piece = models.TemplatePiece(**piece.model_dump(), template_id=db_template.id)
        db.add(db_piece)
    db.commit()
    db.refresh(db_template)
    return db_template

def delete_template(db: Session, template_id: int):
    db_template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if db_template:
        db.delete(db_template)
        db.commit()
    return db_template

# -- Orders --
def get_orders(db: Session, skip: int = 0, limit: int = 100, include_archived: bool = False):
    query = db.query(models.Order)
    if not include_archived:
        # Hide SHIPPED orders older than 5 days
        cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=5)
        
        # A bit convoluted in pure SQLAlchemy to do conditional filtering on an optional value cleanly here,
        # Let's filter in python since the DB scale is small, or use SQL OR logic.
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.Order.status != schemas_enums.OrderStatusEnum.SHIPPED,
                models.Order.updatedAt >= cutoff_date,
                models.Order.updatedAt.is_(None)
            )
        )
    return query.offset(skip).limit(limit).all()

def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def create_order(db: Session, order: schemas.OrderCreate):
    db_order = models.Order(orderCode=order.orderCode, status=order.status)
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    for item in order.items:
        db_item = models.OrderItem(**item.model_dump(), order_id=db_order.id)
        db.add(db_item)
    db.commit()
    db.refresh(db_order)
    return db_order

def update_order_status(db: Session, order_id: int, status: schemas_enums.OrderStatusEnum):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if db_order:
        db_order.status = status
        db_order.updatedAt = datetime.datetime.utcnow()
        db.commit()
        db.refresh(db_order)
    return db_order

def update_order_item_status(db: Session, item_id: int, status: schemas_enums.ItemStatusEnum):
    db_item = db.query(models.OrderItem).filter(models.OrderItem.id == item_id).first()
    if db_item:
        db_item.status = status
        db.commit()
        db.refresh(db_item)
    return db_item

# -- Auth --
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    import auth
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_order(db: Session, order_id: int):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if db_order:
        db.delete(db_order)
        db.commit()
    return db_order

# -- Chat messages --
def create_order_message(db: Session, order_id: int, message: schemas.OrderMessageCreate):
    db_msg = models.OrderMessage(**message.model_dump(), order_id=order_id)
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg
