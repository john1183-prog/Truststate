---
name: implement-feature
description: Guides structured vertical-slice feature implementation in Trust Estate adhering to the INSPECT -> PLAN -> IMPLEMENT -> VERIFY cycle.
---

# Trust Estate Feature Implementation

Use this skill to guide implementation of a vertical slice feature in Trust Estate.

## Procedure

1. **Pattern Search**:
   - Identify existing domain models, schemas, and routes to extend.
   - For public cards, follow `PropertyCard.tsx`.
   - For lead-capture forms, follow `ScheduleViewModal.tsx`.
   - For management pages, follow `AdminDashboard.tsx`.

2. **Formulate Implementation Plan**:
   - List files to modify/create.
   - Specify backend endpoints, models, schemas, and eager loading requirements.
   - Specify frontend types, API methods, components, and routes.
   - Check against core constraints (e.g. mobile-first, `#0A0A0A` & `#C9A84C` brand colors).

3. **Incremental Implementation**:
   - **Step 1**: Backend models in `models.py` and schemas in `schemas.py`.
   - **Step 2**: Backend endpoints in `main.py` with error handling (404, 422).
   - **Step 3**: Frontend types in `types.ts` and API routes in `api.ts`.
   - **Step 4**: Frontend UI components, pages, and routes in `App.tsx`.

4. **Verify Implementation**:
   - Activate the `verify-feature` skill or workflow to complete verification before declaring completion.
