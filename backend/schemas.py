from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from datetime import datetime
from models import RoleEnum, PropertyTypeEnum, PropertyStatusEnum, InspectionStatusEnum, LegalRequestStatusEnum

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    role: RoleEnum
    specializations: Optional[List[str]] = None
    bio: Optional[str] = None
    years_of_experience: Optional[int] = None

    @field_validator("specializations", mode="before")
    @classmethod
    def parse_specializations(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None
    specializations: Optional[List[str]] = None
    bio: Optional[str] = None
    years_of_experience: Optional[int] = None

class UserRead(UserBase):
    id: int
    is_verified: bool
    is_active: bool = True
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
    views: int = 0
    created_at: datetime
    agent: UserRead
    images: List[PropertyImageRead] = []

    class Config:
        from_attributes = True

# Lightweight summary used inside InspectionRequestRead — avoids re-fetching
# the whole property (with its images/agent) just to show which listing an
# enquiry is about.
class PropertySummary(BaseModel):
    id: int
    title: str
    neighborhood: str

    class Config:
        from_attributes = True

# --- Inspection Request Schemas ("Schedule a View" / Enquiries) ---
class InspectionRequestBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    preferred_date: str
    message: Optional[str] = None

class InspectionRequestCreate(InspectionRequestBase):
    pass

class InspectionRequestUpdate(BaseModel):
    status: InspectionStatusEnum

class InspectionRequestRead(InspectionRequestBase):
    id: int
    property_id: int
    status: InspectionStatusEnum
    created_at: datetime
    property: PropertySummary

    class Config:
        from_attributes = True

# --- Legal Services Schemas ---
class LawyerSummary(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str
    specializations: Optional[List[str]] = None
    bio: Optional[str] = None
    years_of_experience: Optional[int] = None
    is_verified: bool

    @field_validator("specializations", mode="before")
    @classmethod
    def parse_specializations(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    class Config:
        from_attributes = True

class LegalRequestBase(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    service_type: str
    message: Optional[str] = None
    lawyer_id: Optional[int] = None

class LegalRequestCreate(LegalRequestBase):
    pass

class LegalRequestUpdate(BaseModel):
    status: LegalRequestStatusEnum

class LegalRequestRead(LegalRequestBase):
    id: int
    status: LegalRequestStatusEnum
    created_at: datetime
    lawyer: Optional[LawyerSummary] = None

    class Config:
        from_attributes = True
