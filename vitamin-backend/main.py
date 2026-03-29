from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from beanie import init_beanie
import models
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Beanie and MongoDB connection...")
    try:
        db = await init_db()
        await init_beanie(
            database=db,
            document_models=[
                models.User,
                models.Goal,
                models.Schedule,
                models.Grade,
                models.Task,
                models.UserMessage,
                models.Community,
                models.CommunityMessage,
                models.Connection,
                models.AcademicEvent,
            ]
        )
        logger.info("Beanie initialization complete.")
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        raise e
    yield

app = FastAPI(title="VITamin API", description="Backend for the VITamin App", lifespan=lifespan)

from routers import auth, goals, schedules, ai, tasks, chats, communities, connections

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(goals.router)
app.include_router(schedules.router)
app.include_router(ai.router)
app.include_router(tasks.router)
app.include_router(chats.router)
app.include_router(communities.router)
app.include_router(connections.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the VITamin API"}
