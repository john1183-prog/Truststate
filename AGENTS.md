# Trust Estate Agent Instructions

This repository contains the production-bound MVP for **Trust Estate** (Nigerian verified property listings).

All agents operating in this workspace must adhere to the engineering rules and verification gates defined in `.agents/rules/`:
- **Core Rules**: `.agents/rules/trust-estate-core.md` (Always On)
- **Backend Rules**: `.agents/rules/backend-rules.md` (Activated on `backend/**`)
- **Frontend Rules**: `.agents/rules/frontend-rules.md` (Activated on `frontend/**`)
- **Verification Rules**: `.agents/rules/verification-rules.md` (Always On)

## Key Non-Negotiable Invariants
1. **Never implement autonomous approval or fake verification.** Trust is the product.
2. **Never break or bypass `_normalize_database_url` in `backend/database.py`.** Neon + asyncpg require it.
3. **Follow the discipline cycle**: `INSPECT -> PLAN -> IMPLEMENT -> VERIFY -> REVIEW DIFF`.
4. **Chat Gate**: Buyer-agent chat is strictly blocked until the owner chooses between Option A (real accounts) and Option B (token links).
5. **No unverified completion claims**: Run real commands, real PostgreSQL queries, and `npm run build`. Never report "works" without verified test execution.
6. **No secrets in code or git commits.**
