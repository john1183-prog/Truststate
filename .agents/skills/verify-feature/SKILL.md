---
name: verify-feature
description: Validates and tests Trust Estate code changes against backend, frontend build, mobile responsiveness, and regression criteria.
---

# Trust Estate Feature Verification

Use this skill to execute and document feature verification before reporting completion to the user.

## Procedure

1. **Working Tree & Diff Check**:
   ```bash
   git status
   git diff --stat
   ```
   Ensure no unneeded files, console logs, or leaked secrets exist.

2. **Backend Route & Database Testing**:
   - Run backend against a real local PostgreSQL instance.
   - Test endpoints with curl/HTTP requests:
     - Verify 200/201 success payloads match schemas.
     - Verify 422 validation failure cases.
     - Verify 404 resource not found cases.
   - Verify rows in database.

3. **Frontend Build Verification**:
   - In `frontend/`:
     ```bash
     npm run build
     ```
   - Confirm zero TypeScript compiler (`tsc`) errors and successful Vite bundling.

4. **UI & Mobile Responsiveness**:
   - Inspect target UI in mobile viewport widths (375px–420px).
   - Ensure touch targets >= 44px, no horizontal scroll, and clear loading/empty/error states.

5. **Regression Check**:
   - Check home page (`/`), property details (`/property/:id`), agent dashboard (`/agent`), and admin dashboard (`/admin`).

6. **Format Verification Report**:
   - Output structured verification summary including files changed, routes added/modified, database changes, tests executed, build outcome, and known limitations.
