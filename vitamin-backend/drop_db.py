"""
Run this ONCE to drop all VITamin collections and start fresh.
Usage:  python drop_db.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
DB_NAME = "vitamin-dev"

COLLECTIONS = [
    "users", "goals", "schedules", "grades",
    "tasks", "user_messages", "communities", "community_messages"
]

async def drop_all():
    client = AsyncIOMotorClient(DATABASE_URL)
    db = client[DB_NAME]

    print(f"Connected to MongoDB. Dropping database '{DB_NAME}'...")
    for col in COLLECTIONS:
        result = await db[col].drop()
        print(f"  ✅ Dropped collection: {col}")

    print("\n🗑️  All collections dropped. Database is fresh!")
    client.close()

if __name__ == "__main__":
    asyncio.run(drop_all())
