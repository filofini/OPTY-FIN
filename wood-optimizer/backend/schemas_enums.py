from enum import Enum

class SourceEnum(str, Enum):
    PURCHASE = "PURCHASE"
    OFFCUT = "OFFCUT"

class OrderStatusEnum(str, Enum):
    NEW = "NEW"
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    SHIPPED = "SHIPPED"

class ItemStatusEnum(str, Enum):
    PENDING = "PENDING"
    CUTTING = "CUTTING"
    ASSEMBLING = "ASSEMBLING"
    READY = "READY"

class RoleEnum(str, Enum):
    OFFICE = "Office"
    PRODUCTION = "Production"
