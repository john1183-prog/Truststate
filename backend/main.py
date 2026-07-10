from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import os

import models
import schemas
import database
import cloudinary_utils

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with database.engine.begin() as conn:
        # Create tables on startup (for MVP purposes)
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

    yield
    # Nothing to clean up on shutdown — NullPool holds no persistent connections,
    # and Vercel only gives shutdown handlers ~500ms anyway.

app = FastAPI(title="Trust Estate MVP API", lifespan=lifespan)

# Without this, the browser blocks every request once the frontend (Vercel) and
# backend live on different domains. Set ALLOWED_ORIGINS to your real frontend
# URL(s) once deployed, comma-separated — defaults to "*" for local dev.
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Users Routes ---

@app.post("/users/", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: schemas.UserCreate, db: AsyncSession = Depends(database.get_db)):
    """Creates a new user (seeker, agent, or admin). No auth yet — see comparison notes."""
    new_user = models.User(**user_in.model_dump())
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@app.get("/users/{user_id}", response_model=schemas.UserRead)
async def get_user(user_id: int, db: AsyncSession = Depends(database.get_db)):
    """Fetches a single user by id."""
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# --- Properties Routes ---

@app.post("/properties/", response_model=schemas.PropertyRead, status_code=status.HTTP_201_CREATED)
async def create_property(property_in: schemas.PropertyCreate, db: AsyncSession = Depends(database.get_db)):
    """Creates a new property. Defaults to pending status."""
    new_property = models.Property(**property_in.model_dump())
    new_property.status = models.PropertyStatusEnum.pending # Enforce business rule
    db.add(new_property)
    await db.commit()
    
    # Eagerly load images + agent (images will be empty on creation) before returning
    result = await db.execute(
        select(models.Property)
        .where(models.Property.id == new_property.id)
        .options(selectinload(models.Property.images), selectinload(models.Property.agent))
    )
    return result.scalar_one()

@app.get("/properties/", response_model=List[schemas.PropertyRead])
async def get_approved_properties(db: AsyncSession = Depends(database.get_db)):
    """Returns only approved properties for public viewing."""
    result = await db.execute(
        select(models.Property)
        .where(models.Property.status == models.PropertyStatusEnum.approved)
        .options(selectinload(models.Property.images), selectinload(models.Property.agent))
    )
    return result.scalars().all()

@app.get("/admin/properties/", response_model=List[schemas.PropertyRead])
async def get_all_properties(db: AsyncSession = Depends(database.get_db)):
    """Admin route: returns all properties regardless of status."""
    result = await db.execute(
        select(models.Property)
        .options(selectinload(models.Property.images), selectinload(models.Property.agent))
    )
    return result.scalars().all()

@app.patch("/properties/{property_id}", response_model=schemas.PropertyRead)
async def update_property(
    property_id: int,
    property_in: schemas.PropertyUpdate,
    db: AsyncSession = Depends(database.get_db)
):
    """Admin route: approve a pending listing, mark it verified, mark it taken, etc.
    Uses the PropertyUpdate schema that already existed but had no route."""
    result = await db.execute(select(models.Property).where(models.Property.id == property_id))
    db_property = result.scalar_one_or_none()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")

    update_data = property_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_property, field, value)
    await db.commit()

    result = await db.execute(
        select(models.Property)
        .where(models.Property.id == property_id)
        .options(selectinload(models.Property.images), selectinload(models.Property.agent))
    )
    return result.scalar_one()

@app.post("/properties/{property_id}/images", response_model=schemas.PropertyImageRead, status_code=status.HTTP_201_CREATED)
async def upload_property_image(
    property_id: int, 
    file: UploadFile = File(...), 
    is_main: bool = False,
    db: AsyncSession = Depends(database.get_db)
):
    """Uploads an image to Cloudinary and saves the URL."""
    # Check if property exists
    result = await db.execute(select(models.Property).where(models.Property.id == property_id))
    db_property = result.scalar_one_or_none()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
        
    try:
        image_url = await cloudinary_utils.upload_image(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
        
    new_image = models.PropertyImage(
        property_id=property_id,
        cloudinary_url=image_url,
        is_main=is_main
    )
    db.add(new_image)
    await db.commit()
    await db.refresh(new_image)
    return new_image
