from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
import enum
import datetime
from database import Base

class SourceEnum(str, enum.Enum):
    PURCHASE = "PURCHASE"
    OFFCUT = "OFFCUT"

class OrderStatusEnum(str, enum.Enum):
    NEW = "NEW"
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    SHIPPED = "SHIPPED"

class ItemStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    CUTTING = "CUTTING"
    ASSEMBLING = "ASSEMBLING"
    READY = "READY"

class RoleEnum(str, enum.Enum):
    OFFICE = "Office"
    PRODUCTION = "Production"

class Stock(Base):
    __tablename__ = "stock"
    id = Column(Integer, primary_key=True, index=True)
    woodType = Column(String, index=True)
    thickness = Column(Float)
    width = Column(Float)
    length_mm = Column(Float)
    qty = Column(Integer, default=0)
    source = Column(Enum(SourceEnum))
    note = Column(String, nullable=True)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow)

class Template(Base):
    __tablename__ = "templates"
    id = Column(Integer, primary_key=True, index=True)
    internalCode = Column(String, unique=True, index=True)
    title = Column(String)
    pieces = relationship("TemplatePiece", back_populates="template", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="template")

class TemplatePiece(Base):
    __tablename__ = "template_pieces"
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("templates.id"))
    woodType = Column(String)
    thickness = Column(Float)
    width = Column(Float)
    length_mm = Column(Float)
    qty = Column(Integer)
    
    template = relationship("Template", back_populates="pieces")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    orderCode = Column(String, unique=True, index=True)
    status = Column(Enum(OrderStatusEnum), default=OrderStatusEnum.NEW)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    messages = relationship("OrderMessage", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    palletTemplateId = Column(Integer, ForeignKey("templates.id"))
    qty = Column(Integer)
    status = Column(Enum(ItemStatusEnum), default=ItemStatusEnum.PENDING)
    
    order = relationship("Order", back_populates="items")
    template = relationship("Template", back_populates="order_items")

class OrderMessage(Base):
    __tablename__ = "order_messages"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    authorRole = Column(Enum(RoleEnum))
    text = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    order = relationship("Order", back_populates="messages")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(RoleEnum))
