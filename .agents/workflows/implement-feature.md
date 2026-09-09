# Workflow: Implement Feature

Use this workflow to implement an incremental vertical slice feature in Trust Estate following the `INSPECT -> PLAN -> IMPLEMENT -> VERIFY -> REVIEW DIFF` cycle.

## Step 1: Pattern Identification
1. Find existing models and schemas related to the requested domain.
   - Example: For Legal Services, extend `User` and `RoleEnum` with `lawyer`.
   - Example: For lead capture, reuse the `InspectionRequest` pattern.
2. Find existing frontend components that provide similar visual language:
   - For public cards, reference `PropertyCard.tsx`.
   - For lead-capture forms/modals, reference `ScheduleViewModal.tsx`.
   - For admin tabs, reference `AdminDashboard.tsx`.

## Step 2: Implementation Plan
1. Present a concise plan detailing:
   - Specific files to modify or create.
   - Backend database models, schemas, and routes.
   - Frontend types, API methods, and components.
   - Any questions or ambiguities that block architectural decisions.
2. Ensure no unauthorized dependencies or architectural rewrites are included.

## Step 3: Vertical Slice Implementation
Follow a strict dependency order:
1. **Backend Model & Schema**: Add enum values, database columns/relationships in `models.py`, and Pydantic schemas in `schemas.py`.
2. **Backend Routes**: Add or update endpoints in `main.py` with proper error handling and eager loading.
3. **Frontend Types & API**: Update `types.ts` and add API calling methods in `api.ts` or component hooks.
4. **Frontend Components & Pages**: Build pages and modals following the `#0A0A0A` black and `#C9A84C` gold design system.
5. **Routing & Navigation**: Add the route in `App.tsx` and integrate links in header navigation and admin tabs.

## Step 4: Verification Trigger
Run the `verify-feature` workflow immediately upon code completion.
