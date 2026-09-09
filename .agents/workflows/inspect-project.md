# Workflow: Inspect Project

Use this workflow before starting any new phase, major refactor, or complex feature in Trust Estate.

## Step 1: Git & Working Tree Check
Check the repository status to ensure a clean starting state:
```bash
git status
git branch
git log -1
```

## Step 2: Backend Architecture Inspection
Inspect backend entrypoints and models:
1. `backend/database.py`: Check connection strings, SSL arguments, and normalization.
2. `backend/models.py`: Check existing `RoleEnum`, `PropertyTypeEnum`, and relational models.
3. `backend/schemas.py`: Check Pydantic schemas and serialization models.
4. `backend/main.py`: Check registered routes, CORS settings, lifespan setup, and hardcoded variables.

## Step 3: Frontend Architecture Inspection
Inspect frontend routing and component hierarchy:
1. `frontend/src/App.tsx`: Review active routes and header navigation.
2. `frontend/src/api.ts`: Check Axios configuration and interceptors.
3. `frontend/src/types.ts`: Ensure types align with backend models.
4. `frontend/src/pages/`: Review `HomePage.tsx`, `AgentDashboard.tsx`, `PropertyDetailPage.tsx`, `AdminDashboard.tsx`.
5. `frontend/src/components/`: Review reusable patterns (`PropertyCard`, `FilterBar`, modals).

## Step 4: Output Synthesis
Synthesize findings into an Architectural Summary:
- Current data models and active enums
- Current public and admin API surface
- Existing reusable patterns to leverage
- Identified security/auth gaps
- Proposed approach before any code is modified
