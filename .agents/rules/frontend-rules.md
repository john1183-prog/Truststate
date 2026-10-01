---
trigger:
  glob: "frontend/**"
description: Rules and conventions for frontend React, Vite, TypeScript, and Tailwind work in Trust Estate.
---

# Trust Estate Frontend Rules

Apply to all React, Vite, TypeScript, and Tailwind CSS development in `frontend/`.

## 1. Stack & Architecture
- **Tech Stack**:
  - React 18.2 + Vite 5.2 + TypeScript 5.2
  - Tailwind CSS 3.4
  - React Router 6.22
  - Axios 1.6
  - Lucide React icons
- **Constraint**: Do not upgrade React to v19 or Tailwind to v4 during feature work. Do not add Redux, Zustand, or other state libraries for local feature tasks.

## 2. API & Network Communication
- **Centralized Client**: All API requests MUST use the centralized client in `frontend/src/api.ts`.
- **Environment Configuration**: API base URL is resolved via `import.meta.env.VITE_API_URL || 'http://localhost:8000'`.
- Never hardcode backend URLs inside individual components.
- Keep TypeScript types in `frontend/src/types.ts` strictly synchronized with backend Pydantic schemas in `backend/schemas.py`.

## 3. Visual System & Component Reuse
- **Brand Colors**:
  - Primary Background / Dark Elements: `#0A0A0A`
  - Accent / Gold: `#C9A84C` (Hover: `#b8963e` or similar gold tone)
  - Text: High contrast white/off-white (`text-white`, `text-white/70`, `text-white/40`) on dark backgrounds.
- **Component Patterns**:
  - Reuse and follow existing patterns:
    - Entity cards: Follow `frontend/src/components/PropertyCard.tsx`.
    - Form modals: Follow `frontend/src/components/PropertyFormModal.tsx` and `ScheduleViewModal.tsx`.
    - Filters: Follow `frontend/src/components/FilterBar.tsx`.
    - Dashboards: Follow the tabbed layout structure in `frontend/src/pages/AdminDashboard.tsx`.
- Keep cards, borders, rounded corners, and spacing visually consistent across new pages.

## 4. Responsive & Mobile-First Behavior
- Trust Estate is a mobile-first product for Nigerian users.
- Prevent horizontal scrollbars (`overflow-x-hidden` or fluid layout).
- Ensure buttons, inputs, and touch targets are comfortable on small screens (minimum 44px height recommended).
- Modals must be scrollable on small screens and fit within viewport bounds.

## 5. UX & State Discipline
- Every data-fetching component must account for 4 distinct UX states:
  1. **Loading state**: Clear skeleton or loading indicator (never leave screen frozen).
  2. **Success state**: Clean data presentation.
  3. **Empty state**: Friendly prompt when no records exist.
  4. **Error state**: Actionable error message with retry or contact option if network/server fails.
- Never leave users on an uninformative blank screen.

## 5.1 Foreground Polling & Network Lifecycle
- For lightweight background polling such as unread/status indicators, poll the smallest summary/count endpoint that provides the required information.
- Do not periodically fetch full collections when a lightweight endpoint is sufficient.
- Stop/clear polling when `document.visibilityState === 'hidden'`.
- Immediately refresh and restart polling when the document becomes visible.
- Refresh immediately on window `focus`.
- Always clear the existing interval reference before creating a new interval to prevent duplicate timers.
- Clean up intervals and all event listeners on unmount.

## 6. Authentication & Network Concurrency Invariants
- **Token Storage Isolation**:
  - The access token must exist exclusively in JavaScript runtime closure memory (`frontend/src/auth/tokenStore.ts`).
  - NEVER store access tokens or credentials in `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or URL fragments.
  - The frontend must never attempt to read or parse the refresh token; it is managed strictly by the browser via the `HttpOnly` cookie.
- **Authentication Generation Protection (`authGeneration`)**:
  - Authentication state transitions that can invalidate in-flight requests (login, logout, password change) must advance the authentication generation (`nextAuthGeneration()`).
  - Requests bind their creation epoch: `config._authGeneration = getAuthGeneration()`.
  - Stale responses returning `401` from an earlier generation (e.g. requests that were in-flight when a logout or user-switch occurred) must be rejected immediately without triggering a token refresh or re-authenticating the previous session.
- **Axios Interceptor Discipline (`frontend/src/api.ts`)**:
  - **Single-Flight Refresh Mutex**: Concurrent `401` responses within the current generation share the same in-flight refresh promise.
  - **Redundant Refresh Avoidance**: If a request encounters a `401` but the current access token in memory differs from the token that accompanied the request, the interceptor reuses the newer token directly without initiating another refresh roundtrip.
  - **Excluded Auth Endpoints**: Requests to `/auth/login`, `/auth/register`, and `/auth/refresh` must never attach Bearer tokens or trigger automated refresh interceptors.
- **Route Guard Discipline (`frontend/src/auth/ProtectedRoute.tsx`)**:
  - While initial session restoration is loading (`isLoading === true`), render a loading placeholder (`<AuthLoadingScreen />`). Never make premature redirect decisions or mount protected dashboard routes before session state resolves.
  - Redirect unauthorized users cleanly to `/unauthorized` or `/login`, sanitizing return locations against external or protocol-relative open redirects.

## 7. Build & Verification Gate
- After any frontend edit, run `npm run build` from `frontend/`.
- TypeScript compiler (`tsc`) must pass with 0 errors.
- For new pages or modal flows, start the Vite dev server and verify visually in the browser.
