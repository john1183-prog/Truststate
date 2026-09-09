---
name: inspect-project
description: Performs repository reconnaissance and architectural inspection of the Trust Estate codebase before implementing new features or refactors.
---

# Trust Estate Project Reconnaissance

Use this skill whenever you need to inspect the current architecture, data models, routes, or frontend components before planning or writing code.

## Procedure

1. **Check Git Status**:
   Inspect the working tree:
   ```bash
   git status
   git branch
   git log -1
   ```

2. **Inspect Backend Core**:
   - `backend/database.py`: Verify asyncpg engine configuration, `_normalize_database_url()`, and `NullPool`.
   - `backend/models.py`: Review `RoleEnum`, `Property`, `User`, `InspectionRequest`, and cascade rules.
   - `backend/schemas.py`: Verify Pydantic v2 schemas and models.
   - `backend/main.py`: Check registered endpoints, lifespan startup table creation, seed data, and CORS configuration.

3. **Inspect Frontend Core**:
   - `frontend/src/App.tsx`: Review active routes and header navigation.
   - `frontend/src/api.ts`: Verify Axios configuration, base URL, and interceptors.
   - `frontend/src/types.ts`: Check interface definitions and role/status enums.
   - `frontend/src/pages/` and `frontend/src/components/`: Check reusable layouts and cards (`PropertyCard`, `FilterBar`, `ScheduleViewModal`).

4. **Summarize Invariants & Gaps**:
   - Document active patterns ready for reuse.
   - Document any open auth gaps or hardcoded values.
   - Formulate plan before touching code.
