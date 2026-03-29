from fastapi import APIRouter, Depends, HTTPException
from typing import List
import models
from routers.auth import get_current_user
from pydantic import BaseModel
from beanie import PydanticObjectId
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


class TaskCreate(BaseModel):
    title: str
    date: str = ""
    time_slot: str = ""
    goal_id: str = ""


class TaskUpdate(BaseModel):
    title: str = None
    done: bool = None
    date: str = None
    time_slot: str = None


@router.get("/")
async def get_tasks(current_user: models.User = Depends(get_current_user)):
    tasks = await models.Task.find({"owner_id": current_user.registration_number}).to_list()
    return [
        {
            "id": str(t.id),
            "title": t.title,
            "date": t.date,
            "time_slot": t.time_slot,
            "done": t.done,
            "goal_id": t.goal_id,
            "created_by": t.created_by,
        }
        for t in tasks
    ]


@router.post("/")
async def create_task(req: TaskCreate, current_user: models.User = Depends(get_current_user)):
    task = models.Task(
        owner_id=current_user.registration_number,
        title=req.title,
        date=req.date,
        time_slot=req.time_slot,
        goal_id=req.goal_id,
        done=False,
        created_by="user",
    )
    await task.insert()
    return {"id": str(task.id), "title": task.title, "date": task.date, "time_slot": task.time_slot}


@router.patch("/{task_id}")
async def update_task(task_id: str, req: TaskUpdate, current_user: models.User = Depends(get_current_user)):
    try:
        task = await models.Task.get(PydanticObjectId(task_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID")

    if not task or task.owner_id != current_user.registration_number:
        raise HTTPException(status_code=404, detail="Task not found")

    if req.title is not None:
        task.title = req.title
    if req.done is not None:
        task.done = req.done
    if req.date is not None:
        task.date = req.date
    if req.time_slot is not None:
        task.time_slot = req.time_slot

    await task.save()
    return {"id": str(task.id), "done": task.done, "title": task.title}


@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: models.User = Depends(get_current_user)):
    try:
        task = await models.Task.get(PydanticObjectId(task_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID")

    if not task or task.owner_id != current_user.registration_number:
        raise HTTPException(status_code=404, detail="Task not found")

    await task.delete()
    return {"message": "Task deleted"}
