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
    # Startup logic
    logger.info("Initializing Beanie and MongoDB connection...")
    try:
        # Call the init_db function we modified above
        db = await init_db() 
        
        # Initialize Beanie with the specific database object
        await init_beanie(
            database=db, 
            document_models=[models.User, models.Goal, models.Schedule]
        )
        logger.info("Beanie initialization complete.")
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        raise e
        
    yield
    # Shutdown logic (if any) can go here

app = FastAPI(title="VITamin API", description="Backend for the VITamin App", lifespan=lifespan)

from routers import auth, goals, schedules

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(goals.router)
app.include_router(schedules.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the VITamin API"}
