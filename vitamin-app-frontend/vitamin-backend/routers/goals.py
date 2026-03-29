from fastapi import APIRouter, Depends, HTTPException
from typing import List
import models, schemas
from beanie import PydanticObjectId
from routers.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/goals",
    tags=["Goals"]
)

@router.post("/", response_model=schemas.Goal)
async def create_goal(goal: schemas.GoalCreate, current_user: models.User = Depends(get_current_user)):
    logger.info(f"Creating a new goal for user {current_user.registration_number}")
    new_goal = models.Goal(**goal.dict(), owner_id=current_user.registration_number)
    await new_goal.insert()
    return new_goal

@router.get("/", response_model=List[schemas.Goal])
async def get_goals(current_user: models.User = Depends(get_current_user)):
    logger.info(f"Fetching goals for user {current_user.registration_number}")
    return await models.Goal.find({"owner_id": current_user.registration_number}).to_list()

@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, current_user: models.User = Depends(get_current_user)):
    try:
        obj_id = PydanticObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID format")
    
    goal = await models.Goal.get(obj_id)
    if not goal or goal.owner_id != current_user.registration_number:
        logger.warning(f"Goal {goal_id} not found or unauthorized for delete by {current_user.registration_number}")
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await goal.delete()
    return {"message": "Goal deleted successfully"}

@router.put("/{goal_id}", response_model=schemas.Goal)
async def update_goal(goal_id: str, goal_update: schemas.GoalCreate, current_user: models.User = Depends(get_current_user)):
    try:
        obj_id = PydanticObjectId(goal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID format")
        
    goal = await models.Goal.get(obj_id)
    if not goal or goal.owner_id != current_user.registration_number:
        logger.warning(f"Goal {goal_id} not found or unauthorized for update by {current_user.registration_number}")
        raise HTTPException(status_code=404, detail="Goal not found")
    
    for key, value in goal_update.dict().items():
        setattr(goal, key, value)
    
    await goal.save()
    return goal
