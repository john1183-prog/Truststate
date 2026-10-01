---
trigger: always_on
description: Core product principles, architecture invariants, security constraints, and operating standards for Trust Estate.
---

# Trust Estate Core Engineering Rules

You are the primary engineering agent for the Trust Estate repository.

## 1. Product Identity & Principle
- **Product**: Trust Estate is a Nigerian real-estate MVP focused on **VERIFIED PROPERTY LISTINGS** and trustworthy property discovery.
- **Core Principle**: **Trust is the product.** Never optimize for convenience by weakening verification, authorization, data integrity, or user safety.
- **Visual Identity**:
  - Primary Black: `#0A0A0A`
  - Accent Gold: `#C9A84C`
  - Existing typography, card styling, spacing, and interaction patterns must be preserved. Do not introduce competing design systems or arbitrary UI redesigns.
- **Target Audience & Constraints**: Mobile-first Nigerian real estate market. Optimize for low data consumption, fast page loads, minimal round-trips, small payloads, and resilient error states.

## 2. Repository & Deployment Architecture
- **Repository**: [https://github.com/john1183-prog/Truststate](https://github.com/john1183-prog/Truststate)
- **Branch**: `main`
- **Structure**:
  - `/backend`: FastAPI + SQLAlchemy 2.x (async) + asyncpg + PostgreSQL (Neon)
  - `/frontend`: React 18 + Vite 5 + TypeScript 5.2 + Tailwind CSS 3.4
  - Image Storage: Cloudinary
- **Deployment Structure**: TWO SEPARATE Vercel projects:
  - Backend project: Root directory `backend`
  - Frontend project: Root directory `frontend`
  - Cross-origin communication:
    - Frontend relies on `VITE_API_URL` pointing to the backend deployment.
    - Backend sets `ALLOWED_ORIGINS` to allow the frontend deployment URL(s).
  - **Invariant**: NEVER assume the frontend and backend share a domain or host.

## 3. Database Connectivity & Normalization
- **Strict Invariant**: `backend/database.py` contains a custom `_normalize_database_url()` routine tailored specifically for asyncpg on serverless Neon PostgreSQL.
  - Converts `postgresql://` and `postgres://` to `postgresql+asyncpg://`.
  - Strips the entire query string (`?sslmode=...`, `channel_binding=...`) to avoid asyncpg connection crashes.
  - Injects `connect_args={"ssl": "require"}` for non-local environments.
  - Disables asyncpg statement cache (`statement_cache_size: 0`).
  - Uses `NullPool` (essential for serverless pooling).
- **Rule**: NEVER casually rewrite, replace, or simplify `backend/database.py`. Any database change must be tested against real PostgreSQL.

## 4. Architectural Discipline & Change Rules
- **Non-Negotiable Lifecycle**:
  ```
  INSPECT -> PLAN -> IMPLEMENT -> VERIFY -> REVIEW DIFF
  ```
- **Inspect Before Modifying**:
  - Always read the actual current code before writing plans or changes. Never rely on assumptions or past conversation memory.
  - Identify existing components, models, schemas, and routes that should be extended rather than reinvented.
- **Change Discipline**:
  - Make the smallest coherent change that satisfies the requirement.
  - Do NOT perform opportunistic rewrites or "clean up" unrelated files.
  - Do NOT upgrade packages or dependencies (e.g. React 19, Tailwind 4, Alembic) unless explicitly instructed.
  - Do NOT introduce additional state management libraries or second CSS frameworks.
  - Keep API calls centralized in `frontend/src/api.ts`.
- **Database Migrations**:
  - The project currently uses `models.Base.metadata.create_all` during FastAPI lifespan startup for MVP simplicity.
  - Do NOT introduce Alembic unless the project owner explicitly directs a migration system change.

## 5. Trust, Safety & Feature Gates
- **Zero Hallucination / Zero Fake Data**:
  - NEVER create fake verification badges, fake escrow/transactions, fake payment processing, or fake legal accreditation.
  - AI is strictly internal decision-support / advisory triage for admins (e.g., duplicate image heuristics, completeness scoring).
  - NEVER implement autonomous listing approval. Listing approval MUST remain human-administered.
  - NEVER create a public "AI Verified" badge.
- **Authentication & Authorization Contract**:
  - Authentication and authorization are implemented and enforced across backend and frontend.
  - **Durable Security Invariants**:
    - **Server-Side Enforcement**: NEVER treat client-side route guards or URL naming as real security. All mutations and non-public queries must enforce authorization server-side via FastAPI dependencies (`Depends(security.get_current_user)`, `Depends(security.require_admin)`, `Depends(security.require_agent)`, `Depends(security.require_verified_lawyer)`).
    - **Database Authority**: The JWT payload role claim is strictly advisory; the database (`models.User.role`, `is_active`, `token_version`) is authoritative on every request.
    - **Access Token Isolation**: The access token must live exclusively in JavaScript memory and must never be stored in `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or URL parameters.
    - **Refresh Security**: Refresh tokens are stored server-side only as SHA-256 hashes, rotated atomically upon consumption, and transmitted exclusively via `HttpOnly`, `Path=/auth` cookies. Consuming an already-consumed token triggers immediate reuse revocation across all active sessions for that user.
  - **Contract A: Property Ownership & Creation Model**:
    - **Agents Create Properties**: Only authenticated agents create ordinary properties (`POST /properties/`).
    - **Server-Derived Ownership**: The backend derives `new_property.agent_id = current_user.id`. Client-specified agent selectors for property creation are forbidden.
    - **Initial State**: Newly created properties strictly begin in `status = pending` and `is_verified = false`.
    - **Admin Moderation**: Admins review, verify/reject, edit, and delete properties. Admins do NOT create properties on behalf of agents; the Admin Dashboard contains no "Add Property" workflow.
- **Buyer-Agent Chat Gate**:
  - **HARD STOP**: Chat implementation is strictly BLOCKED until the product owner explicitly decides between:
    - **Option A**: Real buyer accounts/authentication first.
    - **Option B**: Token-based private conversation links tied to buyer contact info from inspection requests.
  - The agent must NEVER silently choose or implement either option without explicit user instruction.
- **Legal Services Specifications**:
  - Legal services extends the existing `User` model by adding the `lawyer` role to `RoleEnum`.
  - Do NOT create a separate `Lawyer` identity table unless proven necessary and approved.
  - Lawyer profiles support: specialization tags, bio, years of experience, verification status, active/suspended state.
  - Legal requests are **LEADS** (inquiry capture forms), NOT real-time bookings, calendar sync, or payment processing.
- **Notifications**:
  - Targets agents and admins (not buyers initially).
  - Database-backed polling is preferred over WebSockets/push for beta simplicity.
- **Reviews**:
  - Reviews are NOT yet architecturally specified. Before creating any review system, ask the owner what entity is reviewed (agents, transactions, or properties) and what event qualifies a user to submit a review.

## 6. Verification Requirements
- A feature is NEVER complete merely because code was written or compiled.
- **Backend Verification**:
  - Start the backend against a real local PostgreSQL instance.
  - Execute HTTP requests via curl or test client against changed routes.
  - Verify both success paths (200/201) and error/validation paths (400/404/422).
- **Frontend Verification**:
  - Run `npm run build` to verify type integrity and bundling without errors.
  - Run dev server and inspect pages/modals in the browser for UI consistency and responsiveness.
- **Integration Verification**:
  - Validate CORS, HTTP status codes, payload shapes matching TypeScript interfaces, and browser console clean of errors.
- **Claim Discipline**:
  - Never state a test passed unless the command was actually executed and output verified.
  - Never state deployment succeeded unless verified against the live endpoint/remote git HEAD.

## 7. Secrets & Git Standards
- **Secrets Invariant**:
  - NEVER commit or expose secrets: `DATABASE_URL`, Cloudinary API secrets, JWT secrets, API keys, or GitHub PATs.
- **Git Identity**:
  - Name: `Trust Estate Deploy`
  - Email: `deploy@trustestate.ng`
- **Git Safety**:
  - Never force-push (`git push -f`) unless explicitly requested.
  - After pushing to remote, independently verify the remote HEAD via GitHub rather than relying solely on local output.
