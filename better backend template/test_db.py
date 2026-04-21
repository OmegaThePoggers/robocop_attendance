import asyncio
import asyncpg
import sys

async def test_conn():
    dsn = "postgresql://postgres:postgres@localhost:5433/attendance_db"
    try:
        conn = await asyncpg.connect(dsn)
        print("Connection successful!")
        await conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_conn())
