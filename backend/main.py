from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import os
import logging

logger = logging.getLogger(__name__)

import models
import schemas
import database
import cloudinary_utils
import security
from auth_router import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with database.engine.begin() as conn:
        # Idempotent PostgreSQL schema patch for Legal Services:
        # - This exists because Base.metadata.create_all() does not alter existing tables or enums.
        # - It safely upgrades deployed databases (e.g. Neon) that already contain the users table.
        # - It is temporary/minimal MVP migration infrastructure; a proper migration framework
        #   (such as Alembic) can be introduced later when schema complexity warrants it.
        # - Handled safely with IF EXISTS so it executes cleanly on both existing and fresh databases.
        await conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roleenum') THEN
                    ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'lawyer';
                END IF;
            END
            $$;
        """))
        await conn.execute(text("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS specializations VARCHAR;"))
        await conn.execute(text("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS bio VARCHAR;"))
        await conn.execute(text("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;"))

        # Idempotent PostgreSQL schema patch for Authentication (Phase 1):
        await conn.execute(text("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash VARCHAR;"))
        await conn.execute(text("ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;"))
        await conn.execute(text("UPDATE users SET token_version = 1 WHERE token_version IS NULL;"))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                consumed BOOLEAN NOT NULL DEFAULT FALSE,
                consumed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS ix_auth_sessions_user_id ON auth_sessions (user_id);
            CREATE INDEX IF NOT EXISTS ix_auth_sessions_expires_at ON auth_sessions (expires_at);

            CREATE TABLE IF NOT EXISTS auth_rate_limits (
                id SERIAL PRIMARY KEY,
                key VARCHAR(255) NOT NULL UNIQUE,
                attempts INTEGER NOT NULL DEFAULT 1,
                window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """))

        # Create new tables on startup (for MVP purposes)
        await conn.run_sync(models.Base.metadata.create_all)

    # Seed one default agent so the frontend's hardcoded AGENT_ID=1 resolves to a
    # real row. There was previously no route to create the users that
    # properties.agent_id depends on at all. Remove this once real signup/auth exists.
    async with database.AsyncSessionLocal() as session:
        result = await session.execute(select(models.User))
        if result.scalars().first() is None:
            seed_agent = models.User(
                name="Demo Agent",
                email="agent@trustestate.ng",
                phone="2348012345678",
                role=models.RoleEnum.agent,
                is_verified=True,
            )
            session.add(seed_agent)
            await session.commit()

        lawyer_result = await session.execute(select(models.User).where(models.User.role == models.RoleEnum.lawyer))
        if lawyer_result.scalars().first() is None:
            seed_lawyer = models.User(
                name="Barrister Tunde Adeleke",
                email="adeleke.legal@trustestate.ng",
                phone="2348023456789",
                role=models.RoleEnum.lawyer,
                specializations="Title Verification, Due Diligence, Governor's Consent Guidance, Contract Drafting",
                bio="Over 12 years of specialized property law experience across Lagos and Abuja land registries. Focuses on title verification, deed perfection, and governor's consent processing.",
                years_of_experience=12,
                is_verified=True,
                is_active=True,
            )
            session.add(seed_lawyer)
            await session.commit()

        # Development-only demo-account password backfill (Phase 2):
        # Existing demo users may have password_hash=NULL if created before authentication.
        # Production MUST NEVER automatically assign development/demo passwords.
        if not security.IS_PRODUCTION:
            dev_pw_hash = security.hash_password("ChangeMe123!")

            agent_res = await session.execute(
                select(models.User).where(models.User.email == "agent@trustestate.ng")
            )
            agent_user = agent_res.scalar_one_or_none()
            if agent_user and agent_user.password_hash is None:
                agent_user.password_hash = dev_pw_hash
                session.add(agent_user)

            lawyer_res = await session.execute(
                select(models.User).where(models.User.email == "adeleke.legal@trustestate.ng")
            )
            lawyer_user = lawyer_res.scalar_one_or_none()
            if lawyer_user and lawyer_user.password_hash is None:
                lawyer_user.password_hash = dev_pw_hash
                session.add(lawyer_user)

            await session.commit()

    yield
    # Nothing to clean up on shutdown — NullPool holds no persistent connections,
    # and Vercel only gives shutdown handlers ~500ms anyway.

app = FastAPI(title="Trust Estate MVP API", lifespan=lifespan)

# CORS configuration for cross-origin frontend communication with credentials
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
if "*" in allowed_origins:
    allowed_origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# --- Users Routes ---

@app.get("/users/", response_model=List[schemas.UserRead])
async def list_users(
    role: Optional[schemas.RoleEnum] = Query(None),
    current_user: models.User = Depends(security.require_admin),
    db: AsyncSession = Depends(database.get_db),
):
    """Admin route: lists users, optionally filtered by role (e.g. agents, lawyers)."""
    query = select(models.User)
    if role:
        query = query.where(models.User.role == role)
    query = query.order_by(models.User.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/users/{user_id}", response_model=schemas.UserRead)
async def get_user(
    user_id: int,
    current_user: models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Fetches a single user by id (admin or self)."""
    if current_user.role != models.RoleEnum.admin and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user profile",
        )
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.patch("/users/{user_id}", response_model=schemas.UserRead)
async def update_user(
    user_id: int,
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(security.require_admin),
    db: AsyncSession = Depends(database.get_db),
):
    """Admin route: verify or suspend/reactivate a user (e.g. an agent or lawyer)."""
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)
    if "specializations" in update_data and isinstance(update_data["specializations"], list):
        update_data["specializations"] = ", ".join(update_data["specializations"])
    for field, value in update_data.items():
        setattr(db_user, field, value)
    await db.commit()
    await db.refresh(db_user)
    return db_user

# --- Properties Routes ---

@app.post("/properties/", response_model=schemas.PropertyRead, status_code=status.HTTP_201_CREATED)
async def create_property(
    property_in: schemas.PropertyCreate,
    current_user: models.User = Depends(security.require_agent),
    db: AsyncSession = Depends(database.get_db),
):
    """Creates a new property. Defaults to pending status. Ownership is strictly server-derived from current_user.id."""
    prop_data = property_in.model_dump()
    new_property = models.Property(**prop_data)
    new_property.agent_id = current_user.id
    new_property.status = models.PropertyStatusEnum.pending  # Enforce business rule
    new_property.is_verified = False
    db.add(new_property)

    admin_notification = models.Notification(
        user_id=None,
        recipient_role=models.RoleEnum.admin,
        notification_type="property_pending",
        title="New Property Pending Review",
        message=f'New listing "{new_property.title}" in {new_property.neighborhood} submitted for review.',
        link="/admin?tab=listings",
    )
    db.add(admin_notification)
    await db.commit()
    
    # Eagerly load images + agent (images will be empty on creation) before returning
    result = await db.execute(
        select(models.Property)
        .where(models.Property.id == new_property.id)
        .options(selectinload(models.Property.images), selectinload(models.Property.agent))
    )
    return result.scalar_one()

@app.get("/properties/", response_model=List[schemas.PropertyRead])
async def get_approved_properties(
    db: AsyncSession = Depends(database.get_db),
    neighborhood: Optional[str] = Query(None, description="Case-insensitive partial match"),
    property_type: Optional[schemas.PropertyTypeEnum] = Query(None),
    min_price: Optional[int] = Query(None, ge=0),
    max_price: Optional[int] = Query(None, ge=0),
    bedrooms: Optional[int] = Query(None, ge=0, description="Minimum number of bedrooms"),
    bathrooms: Optional[int] = Query(None, ge=0, description="Minimum number of bathrooms"),
    verified_only: bool = Query(False),
    sort: str = Query("newest", pattern="^(newest|price_asc|price_desc)$"),
):
    """Returns approved properties for public viewing, filtered and sorted server-side."""
    query = select(models.Property).where(models.Property.status == models.PropertyStatusEnum.approved)

    if neighborhood:
        query = query.where(models.Property.neighborhood.ilike(f"%{neighborhood}%"))
    if property_type:
        query = query.where(models.Property.property_type == property_type)
    if min_price is not None:
        query = query.where(models.Property.price >= min_price)
    if max_price is not None:
        query = query.where(models.Property.price <= max_price)
    if bedrooms is not None:
        query = query.where(models.Property.bedrooms >= bedrooms)
    if bathrooms is not None:
        query = query.where(models.Property.bathrooms >= bathrooms)
    if verified_only:
        query = query.where(models.Property.is_verified == True)

    if sort == "price_asc":
        query = query.order_by(models.Property.price.asc())
    elif sort == "price_desc":
        query = query.order_by(models.Property.price.desc())
    else:
        query = query.order_by(models.Property.created_at.desc())

    query = query.options(selectinload(models.Property.images), selectinload(models.Property.agent))
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/properties/{property_id}", response_model=schemas.PropertyRead)
async def get_property(property_id: int, db: AsyncSession = Depends(database.get_db)):
    """Returns a single approved property by id and increments its view counter."""
    result = await db.execute(
        select(models.Property)
        .where(models.Property.id == property_id)
        .where(models.Property.status == models.PropertyStatusEnum.approved)
        .options(selectinload(models.Property.images), selectinload(models.Property.agent))
    )
    db_property = result.scalar_one_or_none()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    # Increment view counter
    db_property.views = (db_property.views or 0) + 1
    await db.commit()
    await db.refresh(db_property)
    return db_property

@app.get("/agent/properties/", response_model=List[schemas.PropertyRead])
async def get_agent_properties(
    current_user: models.User = Depends(security.require_agent),
    db: AsyncSession = Depends(database.get_db),
):
    """Returns all properties owned by the authenticated agent (across all moderation statuses)."""
    query = (
        select(models.Property)
        .where(models.Property.agent_id == current_user.id)
        .order_by(models.Property.created_at.desc())
        .options(selectinload(models.Property.images), selectinload(models.Property.agent))
    )
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/admin/properties/", response_model=List[schemas.PropertyRead])
async def get_all_properties(
    status_filter: Optional[schemas.PropertyStatusEnum] = Query(None, alias="status"),
    current_user: models.User = Depends(security.require_admin),
    db: AsyncSession = Depends(database.get_db),
):
    """Admin route: returns all properties, optionally filtered by status."""
    query = select(models.Property)
    if status_filter:
        query = query.where(models.Property.status == status_filter)
    query = query.order_by(models.Property.created_at.desc())
    query = query.options(selectinload(models.Property.images), selectinload(models.Property.agent))
    result = await db.execute(query)
    return result.scalars().all()

@app.patch("/properties/{property_id}", response_model=schemas.PropertyRead)
async def update_property(
    property_id: int,
    property_in: schemas.PropertyUpdate,
    current_user: models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """
    Update property.
    - Admin can update content, status, and is_verified.
    - Owning agent can update content fields only; cannot set status, is_verified, or change ownership.
    - Other users receive 403 Forbidden.
    """
    result = await db.execute(select(models.Property).where(models.Property.id == property_id))
    db_property = result.scalar_one_or_none()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")

    update_data = property_in.model_dump(exclude_unset=True)

    if current_user.role == models.RoleEnum.admin:
        for field, value in update_data.items():
            setattr(db_property, field, value)
    elif current_user.role == models.RoleEnum.agent and db_property.agent_id == current_user.id:
        if "status" in update_data or "is_verified" in update_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Agents are not permitted to modify listing status or verification state",
            )
        allowed_content_fields = {
            "title", "description", "price", "property_type",
            "bedrooms", "bathrooms", "neighborhood", "address"
        }
        for field, value in update_data.items():
            if field in allowed_content_fields:
                setattr(db_property, field, value)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this property",
        )

    await db.commit()

    result = await db.execute(
        select(models.Property)
        .where(models.Property.id == property_id)
        .options(selectinload(models.Property.images), selectinload(models.Property.agent))
    )
    return result.scalar_one()

@app.delete("/properties/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: int,
    current_user: models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Permanently deletes a property (images cascade automatically). Allowed for admin or owning agent."""
    result = await db.execute(select(models.Property).where(models.Property.id == property_id))
    db_property = result.scalar_one_or_none()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")

    is_admin = current_user.role == models.RoleEnum.admin
    is_owner = current_user.role == models.RoleEnum.agent and db_property.agent_id == current_user.id

    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this property",
        )

    await db.delete(db_property)
    await db.commit()

@app.post("/properties/{property_id}/images", response_model=schemas.PropertyImageRead, status_code=status.HTTP_201_CREATED)
async def upload_property_image(
    property_id: int, 
    file: UploadFile = File(...), 
    is_main: bool = False,
    current_user: models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Uploads an image to Cloudinary and saves the URL. Allowed for admin or owning agent."""
    # Check if property exists
    result = await db.execute(select(models.Property).where(models.Property.id == property_id))
    db_property = result.scalar_one_or_none()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")

    is_admin = current_user.role == models.RoleEnum.admin
    is_owner = current_user.role == models.RoleEnum.agent and db_property.agent_id == current_user.id

    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload images for this property",
        )
        
    try:
        image_url = await cloudinary_utils.upload_image(file)
    except Exception as e:
        logger.error("Cloudinary image upload failed for property %s: %s", property_id, e)
        raise HTTPException(status_code=500, detail="Image upload failed")
        
    new_image = models.PropertyImage(
        property_id=property_id,
        cloudinary_url=image_url,
        is_main=is_main
    )
    db.add(new_image)
    await db.commit()
    await db.refresh(new_image)
    return new_image

# --- Inspection Request Routes ("Schedule a View" / Enquiries) ---

@app.post(
    "/properties/{property_id}/inspections",
    response_model=schemas.InspectionRequestRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_inspection_request(
    property_id: int,
    request_in: schemas.InspectionRequestCreate,
    db: AsyncSession = Depends(database.get_db),
):
    """Public route: a seeker requests to schedule a view of an approved property."""
    result = await db.execute(
        select(models.Property)
        .where(models.Property.id == property_id)
        .where(models.Property.status == models.PropertyStatusEnum.approved)
    )
    db_property = result.scalar_one_or_none()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")

    new_request = models.InspectionRequest(property_id=property_id, **request_in.model_dump())
    db.add(new_request)

    agent_notification = models.Notification(
        user_id=db_property.agent_id,
        recipient_role=None,
        notification_type="inspection_request",
        title="New Inspection Request",
        message=f'A viewing was requested for "{db_property.title}" on {request_in.preferred_date}.',
        link="/agent",
    )
    db.add(agent_notification)
    await db.commit()

    result = await db.execute(
        select(models.InspectionRequest)
        .where(models.InspectionRequest.id == new_request.id)
        .options(selectinload(models.InspectionRequest.property))
    )
    return result.scalar_one()

@app.get("/agent/inspections/", response_model=List[schemas.InspectionRequestRead])
async def list_agent_inspections(
    status_filter: Optional[schemas.InspectionStatusEnum] = Query(None, alias="status"),
    current_user: models.User = Depends(security.require_agent),
    db: AsyncSession = Depends(database.get_db),
):
    """Agent route: lists inspection requests for properties belonging to the authenticated agent."""
    query = (
        select(models.InspectionRequest)
        .join(models.Property, models.InspectionRequest.property_id == models.Property.id)
        .where(models.Property.agent_id == current_user.id)
    )
    if status_filter:
        query = query.where(models.InspectionRequest.status == status_filter)
    query = query.order_by(models.InspectionRequest.created_at.desc())
    query = query.options(selectinload(models.InspectionRequest.property))
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/admin/inspections/", response_model=List[schemas.InspectionRequestRead])
async def list_inspection_requests(
    status_filter: Optional[schemas.InspectionStatusEnum] = Query(None, alias="status"),
    current_user: models.User = Depends(security.require_admin),
    db: AsyncSession = Depends(database.get_db),
):
    """Admin route: lists all schedule-a-view requests, optionally filtered by status."""
    query = select(models.InspectionRequest)
    if status_filter:
        query = query.where(models.InspectionRequest.status == status_filter)
    query = query.order_by(models.InspectionRequest.created_at.desc())
    query = query.options(selectinload(models.InspectionRequest.property))
    result = await db.execute(query)
    return result.scalars().all()

@app.patch("/inspections/{inspection_id}", response_model=schemas.InspectionRequestRead)
async def update_inspection_request(
    inspection_id: int,
    request_in: schemas.InspectionRequestUpdate,
    current_user: models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """
    Update inspection request status.
    Permitted callers:
    - Admin: can update any inspection request
    - Owning Agent: can update inspection requests for properties they own
    """
    result = await db.execute(
        select(models.InspectionRequest)
        .where(models.InspectionRequest.id == inspection_id)
        .options(selectinload(models.InspectionRequest.property))
    )
    db_request = result.scalar_one_or_none()
    if not db_request:
        raise HTTPException(status_code=404, detail="Inspection request not found")

    is_admin = current_user.role == models.RoleEnum.admin
    is_owner = (
        current_user.role == models.RoleEnum.agent
        and db_request.property is not None
        and db_request.property.agent_id == current_user.id
    )

    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this inspection request",
        )

    db_request.status = request_in.status
    await db.commit()

    result = await db.execute(
        select(models.InspectionRequest)
        .where(models.InspectionRequest.id == inspection_id)
        .options(selectinload(models.InspectionRequest.property))
    )
    return result.scalar_one()

# --- Legal Services Routes ---

@app.get("/lawyers/", response_model=List[schemas.UserRead])
async def list_lawyers(
    specialization: Optional[str] = Query(None, description="Filter by specialization tag"),
    db: AsyncSession = Depends(database.get_db),
):
    """Public route: lists active, verified lawyers for legal services discovery."""
    query = (
        select(models.User)
        .where(models.User.role == models.RoleEnum.lawyer)
        .where(models.User.is_active == True)
        .where(models.User.is_verified == True)
    )
    if specialization:
        query = query.where(models.User.specializations.ilike(f"%{specialization}%"))
    query = query.order_by(models.User.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@app.post(
    "/legal-requests/",
    response_model=schemas.LegalRequestRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_legal_request(
    request_in: schemas.LegalRequestCreate,
    db: AsyncSession = Depends(database.get_db),
):
    """Public route: submit a legal service inquiry or lead."""
    # If a specific lawyer is targeted, verify the lawyer exists, is active, and verified
    if request_in.lawyer_id is not None:
        res = await db.execute(
            select(models.User)
            .where(models.User.id == request_in.lawyer_id)
            .where(models.User.role == models.RoleEnum.lawyer)
            .where(models.User.is_active == True)
            .where(models.User.is_verified == True)
        )
        lawyer = res.scalar_one_or_none()
        if not lawyer:
            raise HTTPException(status_code=404, detail="Targeted lawyer not found or currently unavailable")

    new_request = models.LegalRequest(**request_in.model_dump())
    db.add(new_request)

    # Server-derived notification routing:
    # If assigned to a verified lawyer, notify that lawyer directly.
    # If unassigned, notify the admin pool.
    if new_request.lawyer_id is not None:
        lawyer_notification = models.Notification(
            user_id=new_request.lawyer_id,
            recipient_role=None,
            notification_type="legal_request",
            title="New Legal Service Request",
            message=f"A new client inquiry was submitted for {request_in.service_type}.",
            link="/lawyer",
        )
        db.add(lawyer_notification)
    else:
        admin_notification = models.Notification(
            user_id=None,
            recipient_role=models.RoleEnum.admin,
            notification_type="legal_request",
            title="New Legal Service Inquiry",
            message=f"New legal lead submitted for {request_in.service_type}.",
            link="/admin?tab=legal_requests",
        )
        db.add(admin_notification)
    await db.commit()

    result = await db.execute(
        select(models.LegalRequest)
        .where(models.LegalRequest.id == new_request.id)
        .options(selectinload(models.LegalRequest.lawyer))
    )
    return result.scalar_one()

@app.get("/lawyer/legal-requests/", response_model=List[schemas.LegalRequestRead])
async def list_lawyer_legal_requests(
    status_filter: Optional[schemas.LegalRequestStatusEnum] = Query(None, alias="status"),
    current_user: models.User = Depends(security.require_verified_lawyer),
    db: AsyncSession = Depends(database.get_db),
):
    """Lawyer route: lists legal service requests assigned to the authenticated verified lawyer."""
    query = (
        select(models.LegalRequest)
        .where(models.LegalRequest.lawyer_id == current_user.id)
    )
    if status_filter:
        query = query.where(models.LegalRequest.status == status_filter)
    query = query.order_by(models.LegalRequest.created_at.desc())
    query = query.options(selectinload(models.LegalRequest.lawyer))
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/admin/legal-requests/", response_model=List[schemas.LegalRequestRead])
async def list_legal_requests(
    status_filter: Optional[schemas.LegalRequestStatusEnum] = Query(None, alias="status"),
    current_user: models.User = Depends(security.require_admin),
    db: AsyncSession = Depends(database.get_db),
):
    """Admin route: lists all legal service requests/leads, optionally filtered by status."""
    query = select(models.LegalRequest)
    if status_filter:
        query = query.where(models.LegalRequest.status == status_filter)
    query = query.order_by(models.LegalRequest.created_at.desc())
    query = query.options(selectinload(models.LegalRequest.lawyer))
    result = await db.execute(query)
    return result.scalars().all()

@app.patch("/admin/legal-requests/{request_id}", response_model=schemas.LegalRequestRead)
async def update_legal_request(
    request_id: int,
    request_in: schemas.LegalRequestUpdate,
    current_user: models.User = Depends(security.require_admin),
    db: AsyncSession = Depends(database.get_db),
):
    """Admin route: update status of a legal request (contacted, completed, cancelled)."""
    result = await db.execute(
        select(models.LegalRequest).where(models.LegalRequest.id == request_id)
    )
    db_request = result.scalar_one_or_none()
    if not db_request:
        raise HTTPException(status_code=404, detail="Legal request not found")

    db_request.status = request_in.status
    await db.commit()

    result = await db.execute(
        select(models.LegalRequest)
        .where(models.LegalRequest.id == request_id)
        .options(selectinload(models.LegalRequest.lawyer))
    )
    return result.scalar_one()

# --- Notifications Routes ---

@app.get("/notifications/unread-count", response_model=schemas.NotificationUnreadCount)
async def get_user_unread_count(
    current_user: models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Returns unread notification count for the authenticated user."""
    result = await db.execute(
        select(func.count(models.Notification.id))
        .where(models.Notification.user_id == current_user.id)
        .where(models.Notification.is_read == False)
    )
    count = result.scalar_one() or 0
    return schemas.NotificationUnreadCount(unread_count=count)

@app.get("/notifications/", response_model=List[schemas.NotificationRead])
async def list_user_notifications(
    limit: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Returns recent notifications for the authenticated user, newest first."""
    query = (
        select(models.Notification)
        .where(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/admin/notifications/unread-count", response_model=schemas.NotificationUnreadCount)
async def get_admin_unread_count(
    current_user: models.User = Depends(security.require_admin),
    db: AsyncSession = Depends(database.get_db),
):
    """Admin route: returns unread notification count for admins."""
    result = await db.execute(
        select(func.count(models.Notification.id))
        .where(models.Notification.user_id.is_(None))
        .where(models.Notification.recipient_role == models.RoleEnum.admin)
        .where(models.Notification.is_read == False)
    )
    count = result.scalar_one() or 0
    return schemas.NotificationUnreadCount(unread_count=count)

@app.get("/admin/notifications/", response_model=List[schemas.NotificationRead])
async def list_admin_notifications(
    limit: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(security.require_admin),
    db: AsyncSession = Depends(database.get_db),
):
    """Admin route: returns recent admin notifications, newest first."""
    query = (
        select(models.Notification)
        .where(models.Notification.user_id.is_(None))
        .where(models.Notification.recipient_role == models.RoleEnum.admin)
        .order_by(models.Notification.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@app.patch("/notifications/{notification_id}/read", response_model=schemas.NotificationRead)
async def mark_notification_as_read(
    notification_id: int,
    current_user: models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """
    Mark a single notification as read.
    - Personal notification (user_id is not None):
      Must match current_user.id. If different: 403 Forbidden.
    - Admin pool notification (user_id is None and recipient_role == admin):
      Must have current_user.role == admin. If non-admin: 403 Forbidden.
    - Not found: 404 Not Found.
    """
    result = await db.execute(
        select(models.Notification).where(models.Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    if notification.user_id is not None:
        if notification.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this notification",
            )
    elif notification.recipient_role == models.RoleEnum.admin:
        if current_user.role != models.RoleEnum.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required to mark admin notifications as read",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this notification",
        )

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification

@app.post("/admin/notifications/mark-all-read")
async def mark_all_admin_notifications_as_read(
    current_user: models.User = Depends(security.require_admin),
    db: AsyncSession = Depends(database.get_db),
):
    """Admin route: marks all unread admin notifications as read."""
    stmt = (
        update(models.Notification)
        .where(
            models.Notification.user_id.is_(None),
            models.Notification.recipient_role == models.RoleEnum.admin,
            models.Notification.is_read == False,
        )
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"message": "All admin notifications marked as read"}
