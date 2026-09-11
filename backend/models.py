import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class RoleEnum(str, enum.Enum):
    seeker = "seeker"
    agent = "agent"
    admin = "admin"
    lawyer = "lawyer"

class PropertyTypeEnum(str, enum.Enum):
    rent = "rent"
    sale = "sale"
    short_let = "short_let"

class PropertyStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    taken = "taken"

class InspectionStatusEnum(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"

class LegalRequestStatusEnum(str, enum.Enum):
    pending = "pending"
    contacted = "contacted"
    completed = "completed"
    cancelled = "cancelled"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(RoleEnum), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Lawyer profile fields
    specializations = Column(String, nullable=True)  # Comma-separated tags
    bio = Column(String, nullable=True)
    years_of_experience = Column(Integer, nullable=True)

    properties = relationship("Property", back_populates="agent")
    legal_requests = relationship("LegalRequest", back_populates="lawyer", foreign_keys="LegalRequest.lawyer_id")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

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
    inspection_requests = relationship("InspectionRequest", back_populates="property", cascade="all, delete-orphan")

class PropertyImage(Base):
    __tablename__ = "property_images"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    cloudinary_url = Column(String, nullable=False)
    is_main = Column(Boolean, default=False)

    property = relationship("Property", back_populates="images")

class InspectionRequest(Base):
    __tablename__ = "inspection_requests"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    preferred_date = Column(String, nullable=False)  # free-text date/time the seeker proposes
    message = Column(String, nullable=True)
    status = Column(Enum(InspectionStatusEnum), default=InspectionStatusEnum.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    property = relationship("Property", back_populates="inspection_requests")

class LegalRequest(Base):
    __tablename__ = "legal_requests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    service_type = Column(String, nullable=False)
    message = Column(String, nullable=True)
    lawyer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(LegalRequestStatusEnum), default=LegalRequestStatusEnum.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lawyer = relationship("User", back_populates="legal_requests", foreign_keys=[lawyer_id])

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )
    recipient_role = Column(Enum(RoleEnum), nullable=True)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_user_lookup", "user_id", "is_read", "created_at"),
        Index("ix_notifications_role_lookup", "recipient_role", "is_read", "created_at"),
    )
