# Workflow: Verify Feature

Use this workflow to rigorously verify code changes across backend, frontend, and integration boundaries before reporting completion.

## Step 1: Git Diff & Changes Review
1. Check changed and untracked files:
   ```bash
   git status
   git diff --stat
   ```
2. Check for unintended modifications, secrets, accidental dependency upgrades, or leftover debug prints.

## Step 2: Backend Route Verification
1. Ensure the PostgreSQL database is reachable.
2. Start the FastAPI backend server or run validation tests.
3. Test all changed and newly created routes with HTTP requests:
   - Verify standard success cases (`200 OK` or `201 Created`).
   - Verify validation failure responses (`422 Unprocessable Entity`).
   - Verify missing resource responses (`404 Not Found`).
4. Inspect database records to ensure persistence matches expectations.

## Step 3: Frontend Typecheck & Build Verification
1. Run the frontend production build in `frontend/`:
   ```bash
   npm run build
   ```
2. Confirm TypeScript compiler (`tsc`) exits with 0 errors and Vite bundles assets without errors.

## Step 4: UI & Mobile Viewport Inspection
1. Run dev server if inspecting UI changes:
   ```bash
   npm run dev
   ```
2. Verify responsive layout on mobile screen widths (e.g. 375px).
3. Ensure no horizontal overflow and check touch target sizes.
4. Verify empty states, loading indicators, and error banners work as intended.

## Step 5: Regression Check
Confirm core functionality is intact:
- Home page property browsing (`/`)
- Property details page (`/property/:id`)
- Schedule a View modal
- Agent listing flow (`/agent`)
- Admin dashboard (`/admin`)

## Step 6: Generate Verification Report
Produce the standard verification report detailing files changed, routes added/modified, tests executed, build outcome, and known limitations.
