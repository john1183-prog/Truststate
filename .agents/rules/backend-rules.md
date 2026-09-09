---
trigger:
  glob: "backend/**"
description: Rules and conventions for backend FastAPI, SQLAlchemy async, and database work in Trust Estate.
---

# Trust Estate Backend Rules

Apply to all FastAPI, SQLAlchemy, and backend database tasks.

## 1. Pre-Modification Inspection
Before altering any backend code, inspect:
- `backend/database.py`
- `backend/models.py`
- `backend/schemas.py`
- `backend/main.py`
- `backend/requirements.txt`
Trace existing models, relationships, schemas, and route decorators before adding or changing code.

## 2. Database Connectivity & Asyncpg Normalization
- `backend/database.py` contains the critical `_normalize_database_url()` routine for Neon/Vercel:
  - Handles `postgresql://` and `postgres://` -> `postgresql+asyncpg://`.
  - Strips query string parameters (`sslmode`, `channel_binding`) that asyncpg does not accept.
  - Adds `connect_args={"ssl": "require"}` for non-local instances.
  - Sets `statement_cache_size: 0` and uses `NullPool`.
- **Constraint**: Do NOT replace or bypass this layer.
- Ensure all queries are asynchronous using `AsyncSession`. Do not introduce synchronous ORM calls (`session.query()`, `sync_engine`) into async endpoints.

## 3. Schema & Model Design Conventions
- **Models (`backend/models.py`)**:
  - Always inherit from `Base = declarative_base()`.
  - Use explicit `Enum` types mapped with `RoleEnum(str, enum.Enum)`.
  - Configure relationships with explicit `back_populates` and cascade rules (e.g. `cascade="all, delete-orphan"` for dependent children).
  - Use SQLAlchemy 2.x `select()` syntax with `scalars().all()` / `scalar_one_or_none()`.
  - When accessing relationships in API responses, use `selectinload()` to avoid MissingGreenlet errors.
- **Schemas (`backend/schemas.py`)**:
  - Use Pydantic V2 conventions (`model_dump()`, `from_attributes = True`).
  - Follow the standard pattern: `EntityBase`, `EntityCreate`, `EntityUpdate`, `EntityRead`.
  - For nested relationship references in lists (like property in inspection requests), use lightweight summary schemas (e.g. `PropertySummary`) to prevent infinite recursion or heavy payloads.

## 4. API & Route Conventions
- Standard URL patterns:
  - Public listings: `GET /properties/`, `GET /properties/{property_id}`
  - Public lead capture: `POST /properties/{property_id}/inspections`
  - Admin collections: `GET /admin/properties/`, `GET /admin/inspections/`
  - Resource updates: `PATCH /properties/{property_id}`, `PATCH /inspections/{inspection_id}`, `PATCH /users/{user_id}`
- HTTP Status Codes:
  - Creation: `201 Created`
  - Deletion: `204 No Content`
  - Missing resource: `404 Not Found`
  - Validation failure: `422 Unprocessable Entity`
- Eager Loading:
  - Eagerly load required relationships before returning models matching response schemas with `selectinload()`.

## 5. Security & Authorization Guidelines
- Currently, routes are unprotected.
- Server-side authorization belongs in FastAPI dependencies (`Depends(get_current_user)`, `Depends(require_admin)`).
- Never rely on client-side route guards or URL naming conventions (e.g. `/admin/...`) for actual security.
- Do not expose database internals, connection strings, or full stack traces in HTTP error details.

## 6. Testing & Verification Gate
- Backend changes MUST be tested with a real local PostgreSQL database.
- Exercise routes with HTTP requests (curl, Python test script, or interactive OpenAPI docs).
- Test both successful operations (status 200/201) and validation/not-found failure paths (404/422).
