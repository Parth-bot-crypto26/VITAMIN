from fastapi import APIRouter, Depends, HTTPException
from typing import List
import models, schemas
from beanie import PydanticObjectId
from routers.auth import get_current_user
from services.vtop_scraper import scrape_vtop_data
from pydantic import BaseModel
from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)

class SyncRequest(BaseModel):
    payload: Dict[str, Any]

router = APIRouter(
    prefix="/schedules",
    tags=["Schedules"]
)

@router.post("/", response_model=schemas.Schedule)
async def create_schedule(schedule: schemas.ScheduleCreate, current_user: models.User = Depends(get_current_user)):
    logger.info(f"Creating schedule for {current_user.registration_number}")
    new_schedule = models.Schedule(**schedule.dict(), owner_id=current_user.registration_number)
    await new_schedule.insert()
    return new_schedule

@router.post("/sync-vtop")
async def sync_vtop(req: SyncRequest, current_user: models.User = Depends(get_current_user)):
    logger.info(f"Sync triggered for {current_user.registration_number}")
    # Run the VTOP asynchronous scraper
    try:
        result = await scrape_vtop_data(req.payload, current_user)
        return {"message": "Sync triggered successfully", "details": result}
    except Exception as e:
        logger.error(f"Sync error for {current_user.registration_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[schemas.Schedule])
async def get_schedules(current_user: models.User = Depends(get_current_user)):
    logger.info(f"Fetching schedules for {current_user.registration_number}")
    return await models.Schedule.find({"owner_id": current_user.registration_number}).to_list()

@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: str, current_user: models.User = Depends(get_current_user)):
    try:
        obj_id = PydanticObjectId(schedule_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid schedule ID format")
        
    schedule = await models.Schedule.get(obj_id)
    if not schedule or schedule.owner_id != current_user.registration_number:
        logger.warning(f"Schedule {schedule_id} not found or unauthorized for delete by {current_user.registration_number}")
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    await schedule.delete()
    return {"message": "Schedule deleted successfully"}
