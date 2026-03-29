import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Ensure you have a .env file with DATABASE_URL or it will use the default below
DATABASE_URL = os.getenv("DATABASE_URL", "mongodb+srv://root:root@cluster0.hif20.mongodb.net/")

async def init_db():
    client = AsyncIOMotorClient(DATABASE_URL)
    # Beanie requires the database object, not the client
    return client["vitamin-dev"]