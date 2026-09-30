import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path for direct imports
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio
from sqlalchemy import select

import database
import models
import security


async def seed_admin() -> int:
    admin_email_raw = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")

    # 1. Validate environment variables presence
    if not admin_email_raw or not admin_email_raw.strip():
        sys.stderr.write("ERROR: ADMIN_EMAIL environment variable is required and cannot be empty.\n")
        return 1

    if not admin_password:
        sys.stderr.write("ERROR: ADMIN_PASSWORD environment variable is required and cannot be empty.\n")
        return 1

    # 2. Normalize email
    admin_email = admin_email_raw.strip().lower()

    # 3. Validate password length (8-128 characters)
    if len(admin_password) < 8 or len(admin_password) > 128:
        sys.stderr.write("ERROR: ADMIN_PASSWORD must be between 8 and 128 characters in length.\n")
        return 1

    admin_name = (os.getenv("ADMIN_NAME") or "System Administrator").strip()
    admin_phone = (os.getenv("ADMIN_PHONE") or "08000000000").strip()

    # 4. Check for existing account
    async with database.AsyncSessionLocal() as session:
        result = await session.execute(
            select(models.User).where(models.User.email == admin_email)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user is not None:
            if existing_user.role == models.RoleEnum.admin:
                sys.stderr.write(
                    f"ERROR: An admin account with email '{admin_email}' already exists. "
                    "Bootstrap refuses to overwrite existing admin accounts.\n"
                )
            else:
                sys.stderr.write(
                    f"ERROR: An account with email '{admin_email}' already exists with role '{existing_user.role.value}'. "
                    "Bootstrap refuses to escalate existing non-admin accounts.\n"
                )
            return 1

        # 5. Create new admin account with Argon2id hashed password
        pw_hash = security.hash_password(admin_password)
        new_admin = models.User(
            name=admin_name,
            email=admin_email,
            phone=admin_phone,
            role=models.RoleEnum.admin,
            password_hash=pw_hash,
            is_verified=True,
            is_active=True,
            token_version=1,
        )
        session.add(new_admin)
        await session.commit()

    print(f"SUCCESS: Admin account '{admin_email}' created successfully.")
    return 0


def main():
    try:
        exit_code = asyncio.run(seed_admin())
        sys.exit(exit_code)
    except Exception as e:
        sys.stderr.write(f"FATAL ERROR: Failed to bootstrap admin account: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
