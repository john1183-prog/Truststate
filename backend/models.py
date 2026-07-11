import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class RoleEnum(str, enum.Enum):
    seeker = "seeker"
    agent = "agent"
    admin = "admin"

class PropertyTypeEnum(str, enum.Enum):
    rent = "rent"
    sale = "sale"
    short_let = "short_let"

class PropertyStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    taken = "taken"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(RoleEnum), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    properties = relationship("Property", back_populates="agent")

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    property_type = Column(Enum(PropertyTypeEnum), nullable=False)
    bedrooms = Column(Integer, nullable=False)
    bathrooms = Column(Integer, nullable=False)
    neighborhood = Column(String, nullable=False)
    address = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    status = Column(Enum(PropertyStatusEnum), default=PropertyStatusEnum.pending)
    views = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    agent = relationship("User", back_populates="properties")
    images = relationship("PropertyImage", back_populates="property", cascade="all, delete-orphan")

class PropertyImage(Base):
    __tablename__ = "property_images"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    cloudinary_url = Column(String, nullable=False)
    is_main = Column(Boolean, default=False)

    property = relationship("Property", back_populates="images")
