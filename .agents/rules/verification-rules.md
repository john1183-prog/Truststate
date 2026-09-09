---
trigger: always_on
description: Mandatory verification gate, testing protocol, and completion criteria for Trust Estate changes.
---

# Trust Estate Verification Rules & Gates

Never declare a feature, bugfix, or refactor complete based on static code inspection alone.

## 1. Pre-Implementation Baseline
Before beginning any code changes:
1. Verify working branch (must be `main` unless branch work was requested).
2. Record initial `git status` and `git rev-parse HEAD`.
3. Inspect relevant backend routes, models, schemas, and frontend components.

## 2. Backend Verification Protocol
1. **Real Database**: Test against a real local PostgreSQL instance (never swap in SQLite unless explicitly authorized for a unit test runner).
2. **FastAPI Execution**: Start the backend service (`uvicorn main:app --reload`).
3. **Endpoint Tests via HTTP**:
   - Call health/list endpoints.
   - Call the specific endpoints created or modified.
   - Verify 200/201 response payloads against expected schemas.
   - Verify validation errors (422) for invalid inputs.
   - Verify not-found errors (404) for non-existent IDs.
4. **Database State Check**:
   - Inspect the database to confirm rows were inserted/updated correctly with expected relationships and defaults.

## 3. Frontend Verification Protocol
1. **Type & Build Check**:
   - Run `npm run build` in `frontend/`.
   - Ensure `tsc` passes with zero errors and Vite bundling succeeds cleanly.
2. **Visual & UI Verification**:
   - For UI-facing changes, start `npm run dev` and test the target page or modal.
   - Verify responsiveness on mobile viewport widths (e.g. 375px–420px).
   - Check browser console to ensure zero unhandled exceptions or CORS failures.

## 4. Integration & Regression Verification
1. **Integration**:
   - Verify frontend successfully makes HTTP requests to backend using `api.ts`.
   - Confirm backend `ALLOWED_ORIGINS` allows the request origin.
2. **Regression Check**:
   - Verify core user journeys remain intact:
     - Home page browsing and property filters (`/`).
     - Property detail view (`/property/:id`).
     - "Schedule a View" modal submission.
     - Agent dashboard listings view (`/agent`).
     - Admin dashboard property and request management (`/admin`).

## 5. Verification Report Standard
When reporting completion of any task, you must use this structured format:

```markdown
### VERIFICATION REPORT

#### 1. Files Changed
- list of files modified/created

#### 2. Routes Added/Modified
- list of HTTP routes

#### 3. Database Changes
- models/tables/columns added or modified

#### 4. Verification Executed
- **Backend Tests**: exact commands run and output/status
- **Frontend Build**: `npm run build` result (clean build confirmation)
- **Integration/Browser Check**: observations and test status
- **Regression Check**: core pages confirmed working

#### 5. Not Verified / Known Limitations
- anything not covered or deferred to future phases
```

Never state a test passed unless the test was actually executed and the output inspected.
Never declare deployment succeeded without verifying the live service.
