from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from models import RoleEnum, PropertyTypeEnum, PropertyStatusEnum

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    role: RoleEnum

class UserCreate(UserBase):
    pass

class UserRead(UserBase):
    id: int
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Property Image Schemas ---
class PropertyImageBase(BaseModel):
    cloudinary_url: str
    is_main: bool = False

class PropertyImageCreate(PropertyImageBase):
    pass

class PropertyImageRead(PropertyImageBase):
    id: int
    property_id: int

    class Config:
        from_attributes = True

# --- Property Schemas ---
class PropertyBase(BaseModel):
    title: str
    description: str
    price: int = Field(gt=0, description="Price in Naira")
    property_type: PropertyTypeEnum
    bedrooms: int = Field(ge=0)
    bathrooms: int = Field(ge=0)
    neighborhood: str
    address: str

class PropertyCreate(PropertyBase):
    agent_id: int

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    property_type: Optional[PropertyTypeEnum] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    neighborhood: Optional[str] = None
    address: Optional[str] = None
    status: Optional[PropertyStatusEnum] = None
    is_verified: Optional[bool] = None

class PropertyRead(PropertyBase):
    id: int
    agent_id: int
    is_verified: bool
    status: PropertyStatusEnum
    created_at: datetime
    agent: UserRead
    images: List[PropertyImageRead] = []

    class Config:
        from_attributes = True
