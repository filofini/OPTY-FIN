from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from enum import Enum
import schemas_enums

class StockBase(BaseModel):
    woodType: str
    thickness: float
    width: float
    length_mm: float
    qty: int
    source: schemas_enums.SourceEnum
    note: Optional[str] = None

class StockCreate(StockBase):
    pass

class StockUpdate(StockBase):
    pass

class Stock(StockBase):
    id: int
    updatedAt: datetime
    model_config = ConfigDict(from_attributes=True)

class TemplatePieceBase(BaseModel):
    woodType: str
    thickness: float
    width: float
    length_mm: float
    qty: int

class TemplatePieceCreate(TemplatePieceBase):
    pass

class TemplatePiece(TemplatePieceBase):
    id: int
    template_id: int
    model_config = ConfigDict(from_attributes=True)

class TemplateBase(BaseModel):
    internalCode: str
    title: str

class TemplateCreate(TemplateBase):
    pieces: List[TemplatePieceCreate]

class Template(TemplateBase):
    id: int
    pieces: List[TemplatePiece]
    model_config = ConfigDict(from_attributes=True)

class OrderItemBase(BaseModel):
    palletTemplateId: int
    qty: int
    status: schemas_enums.ItemStatusEnum = schemas_enums.ItemStatusEnum.PENDING

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    order_id: int
    model_config = ConfigDict(from_attributes=True)

class OrderMessageBase(BaseModel):
    authorRole: schemas_enums.RoleEnum
    text: str

class OrderMessageCreate(OrderMessageBase):
    pass

class OrderMessage(OrderMessageBase):
    id: int
    order_id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class OrderBase(BaseModel):
    orderCode: str
    status: schemas_enums.OrderStatusEnum = schemas_enums.OrderStatusEnum.NEW

class OrderCreate(OrderBase):
    items: List[OrderItemCreate]

class Order(OrderBase):
    id: int
    items: List[OrderItem]
    messages: List[OrderMessage] = []
    updatedAt: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    username: str
    role: schemas_enums.RoleEnum

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[schemas_enums.RoleEnum] = None
