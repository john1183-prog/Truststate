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
- **Index Minimization**:
  - Primary key columns using `primary_key=True` MUST NOT also use `index=True`.
  - Do not add redundant individual indexes when an explicit composite index already serves the relevant lookup pattern, unless an independently justified high-frequency single-column query requires it.
- **Schemas (`backend/schemas.py`)**:
  - Use Pydantic V2 conventions (`model_dump()`, `from_attributes = True`).
  - Follow the standard pattern: `EntityBase`, `EntityCreate`, `EntityUpdate`, `EntityRead`.
  - For nested relationship references in lists (like property in inspection requests), use lightweight summary schemas (e.g. `PropertySummary`) to prevent infinite recursion or heavy payloads.

## 3.1 Existing Database Compatibility & Schema Patches
- `Base.metadata.create_all()` ONLY creates tables that do not exist; it NEVER alters existing PostgreSQL tables or enums.
- When adding columns or enum values to existing models without Alembic:
  - Execute an idempotent DDL startup patch inside `async with database.engine.begin() as conn:` before `create_all()`.
  - Enum additions MUST be wrapped to prevent crashes on fresh databases:
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = '<enum>') THEN ALTER TYPE <enum> ADD VALUE IF NOT EXISTS '<val>'; END IF; END $$;`
  - Column additions MUST use:
    `ALTER TABLE IF EXISTS <table> ADD COLUMN IF NOT EXISTS <column> <type>;`
- **Independent Seed Checks**: Never condition seed data on whether a table is globally empty (`select(models.User).first() is None`). Existing deployments already contain rows. Always check for the specific seeded entity/role (e.g. `select(models.User).where(models.User.role == RoleEnum.lawyer)`).

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

## 4.1 Atomic Transactional Side-Effects & Event Staging
- For synchronous business side-effects that are part of the same business operation, stage them in the SAME SQLAlchemy session before the final `await db.commit()`.
- NEVER commit the business record and its required side-effect in separate commits.
- Asynchronous side-effect delivery is permitted only when backed by an explicitly designed durable mechanism such as a transactional outbox or equivalent persistent architecture.
- Do not introduce detached background tasks or secondary database sessions merely to avoid the normal transaction boundary.

## 5. Security & Authorization Guidelines
- **Mandatory Server-Side Authorization**:
  - All non-public routes must enforce authentication via FastAPI dependencies (`Depends(security.get_current_user)`).
  - Role-gated endpoints must enforce DB-authoritative role dependencies (`Depends(security.require_admin)`, `Depends(security.require_agent)`, `Depends(security.require_verified_lawyer)`).
  - Never rely on client-side route guards or URL path prefixes (e.g. `/admin/...`) for actual authorization.
  - Do not expose database internals, connection strings, or full stack traces in HTTP error details.

## 5.1 Identity Derivation vs. Target Resource Selection
- **Server-Derived Authenticated Identity**:
  - Client-supplied identity values must never be trusted to determine the authenticated caller's identity or authorization.
  - When a created or queried resource belongs to the current user (e.g. property owner on `POST /properties/`, notification queries on `GET /notifications/`, inspection queries on `GET /agent/inspections/`), the identity MUST be derived server-side from `current_user.id`.
- **Target Resource Selection Validation**:
  - Client-supplied foreign IDs are permitted when they represent explicit target resource selection (e.g. `POST /legal-requests/` accepting `lawyer_id`).
  - Such target IDs must be independently validated server-side:
    - The referenced entity exists (return `404 Not Found`).
    - The referenced entity matches the required role (e.g. `role == RoleEnum.lawyer`).
    - The referenced entity is active and verified (`is_active == True` and `is_verified == True`).
  - Client-supplied target IDs must NEVER confer authorization or ownership to the caller.

## 5.2 Session Revocation & Rate Limiting
- **Token Version Invalidation**:
  - Password changes and administrative security revocations must increment `User.token_version` and delete all active rows in `auth_sessions` for that user, invalidating outstanding JWTs and refresh sessions.
- **Dual-Key Rate Limiting**:
  - Dual-key rate limiting (identifier + IP) protects authentication routes against brute-force attacks.
  - Rate limits are verified prior to credential checks, and attempt counters increment ONLY on authentication failure. Successful authentications reset the identifier counter.

## 6. Testing & Verification Gate
- Backend changes MUST be tested with a real local PostgreSQL database.
- Exercise routes with HTTP requests (curl, Python test script, or interactive OpenAPI docs).
- Test both successful operations (status 200/201) and validation/not-found failure paths (404/422).
