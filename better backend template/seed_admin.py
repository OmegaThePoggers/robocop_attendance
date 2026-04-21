"""One-time script to seed or update the admin user with a correctly hashed password."""
import asyncio
from sqlalchemy import text
from core.database import AsyncSessionLocal
from core.security import hash_password

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin@123"
ADMIN_NAME = "Admin User"


async def seed():
    hashed = hash_password(ADMIN_PASSWORD)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": ADMIN_EMAIL},
        )
        row = result.fetchone()
        if row:
            await db.execute(
                text("UPDATE users SET password_hash = :h WHERE email = :email"),
                {"h": hashed, "email": ADMIN_EMAIL},
            )
            print(f"Updated password hash for {ADMIN_EMAIL}")
        else:
            await db.execute(
                text("""
                    INSERT INTO users (id, email, password_hash, role, name)
                    VALUES (gen_random_uuid(), :email, :h, 'admin', :name)
                """),
                {"email": ADMIN_EMAIL, "h": hashed, "name": ADMIN_NAME},
            )
            print(f"Created admin user {ADMIN_EMAIL}")
        await db.commit()
        print("Done. Hash prefix:", hashed[:7])


asyncio.run(seed())
