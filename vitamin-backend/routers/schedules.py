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
    logger.info(f"=== SYNC-VTOP REQUEST from {current_user.registration_number} ===")
    payload = req.payload
    timetables = payload.get('timetables', {})
    attendance = payload.get('attendance', {})
    grades_html = payload.get('grades', '')
    logger.info(f"  Timetable semesters: {list(timetables.keys())}")
    logger.info(f"  Attendance semesters: {list(attendance.keys())}")
    logger.info(f"  Grades HTML length: {len(grades_html)} bytes")
    for sem, html in timetables.items():
        logger.info(f"  TT[{sem}] = {len(html)} bytes")
    for sem, html in attendance.items():
        logger.info(f"  ATT[{sem}] = {len(html)} bytes")
    
    try:
        result = await scrape_vtop_data(req.payload, current_user)
        logger.info(f"=== SYNC COMPLETE: {result} ===")
        return {"message": "Sync triggered successfully", "details": result}
    except Exception as e:
        logger.error(f"=== SYNC FAILED for {current_user.registration_number}: {e} ===", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_schedules(current_user: models.User = Depends(get_current_user)):
    logger.info(f"Fetching schedules for {current_user.registration_number}")
    schedules = await models.Schedule.find({"owner_id": current_user.registration_number}).to_list()
    return [
        {
            "_id": str(s.id),
            "time": s.time,
            "title": s.title,
            "loc": s.loc,
            "type": s.type,
            "status": s.status,
            "semester": s.semester,
            "owner_id": s.owner_id,
            "class_id": s.class_id,
            "attended_classes": s.attended_classes,
            "total_classes": s.total_classes,
            "attendance_percentage": s.attendance_percentage,
            "faculty_name": s.faculty_name,
            "school": s.school,
            "course_code": s.course_code,
            "course_name": s.course_name,
        }
        for s in schedules
    ]

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

@router.get("/calendar")
async def get_calendar(current_user: models.User = Depends(get_current_user)):
    """Return academic calendar events (holidays, exams, fests etc.)"""
    events = await models.AcademicEvent.find({"owner_id": current_user.registration_number}).sort("date").to_list()
    return [
        {
            "_id": str(e.id),
            "date": e.date,
            "event_type": e.event_type,
            "description": e.description,
            "semester": e.semester,
        }
        for e in events
    ]
