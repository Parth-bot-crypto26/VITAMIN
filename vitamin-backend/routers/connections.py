from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import models
from routers.auth import get_current_user
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/connections", tags=["Connections"])


class InviteRequest(BaseModel):
    receiver_id: str
    shared_goals: List[str] = []


@router.post("/invite")
async def send_invite(req: InviteRequest, current_user: models.User = Depends(get_current_user)):
    """Send a connection request to another user"""
    if req.receiver_id == current_user.registration_number:
        raise HTTPException(400, "Cannot connect with yourself")

    # Check if connection already exists
    existing = await models.Connection.find_one({
        "$or": [
            {"requester_id": current_user.registration_number, "receiver_id": req.receiver_id},
            {"requester_id": req.receiver_id, "receiver_id": current_user.registration_number},
        ]
    })
    if existing:
        return {"status": existing.status, "id": str(existing.id), "message": f"Connection already {existing.status}"}

    now = datetime.now(timezone.utc).isoformat()
    conn = models.Connection(
        requester_id=current_user.registration_number,
        receiver_id=req.receiver_id,
        shared_goals=req.shared_goals,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    await conn.insert()
    return {"status": "pending", "id": str(conn.id), "message": "Invitation sent!"}


@router.get("/pending")
async def get_pending(current_user: models.User = Depends(get_current_user)):
    """Get all pending invitations received by this user"""
    connections = await models.Connection.find({
        "receiver_id": current_user.registration_number,
        "status": "pending"
    }).to_list()

    result = []
    for c in connections:
        requester = await models.User.find_one({"registration_number": c.requester_id})
        result.append({
            "id": str(c.id),
            "requester_id": c.requester_id,
            "requester_name": requester.name if requester else c.requester_id,
            "requester_branch": requester.branch if requester else "",
            "shared_goals": c.shared_goals,
            "created_at": c.created_at,
        })
    return result


@router.post("/{connection_id}/accept")
async def accept_invite(connection_id: str, current_user: models.User = Depends(get_current_user)):
    from beanie import PydanticObjectId
    try:
        conn = await models.Connection.get(PydanticObjectId(connection_id))
    except Exception:
        raise HTTPException(404, "Connection not found")
    if conn.receiver_id != current_user.registration_number:
        raise HTTPException(403, "Not your invitation")
    conn.status = "accepted"
    conn.updated_at = datetime.now(timezone.utc).isoformat()
    await conn.save()
    return {"status": "accepted", "id": str(conn.id)}


@router.post("/{connection_id}/reject")
async def reject_invite(connection_id: str, current_user: models.User = Depends(get_current_user)):
    from beanie import PydanticObjectId
    try:
        conn = await models.Connection.get(PydanticObjectId(connection_id))
    except Exception:
        raise HTTPException(404, "Connection not found")
    if conn.receiver_id != current_user.registration_number:
        raise HTTPException(403, "Not your invitation")
    conn.status = "rejected"
    conn.updated_at = datetime.now(timezone.utc).isoformat()
    await conn.save()
    return {"status": "rejected"}


@router.get("/accepted")
async def get_accepted(current_user: models.User = Depends(get_current_user)):
    """Get all accepted connections (chat-enabled contacts)"""
    reg = current_user.registration_number
    connections = await models.Connection.find({
        "$or": [
            {"requester_id": reg, "status": "accepted"},
            {"receiver_id": reg, "status": "accepted"},
        ]
    }).to_list()

    result = []
    for c in connections:
        buddy_id = c.receiver_id if c.requester_id == reg else c.requester_id
        buddy = await models.User.find_one({"registration_number": buddy_id})
        if buddy:
            result.append({
                "connection_id": str(c.id),
                "registration_number": buddy.registration_number,
                "name": buddy.name,
                "branch": buddy.branch,
                "shared_goals": c.shared_goals,
            })
    return result


@router.get("/status/{other_id}")
async def connection_status(other_id: str, current_user: models.User = Depends(get_current_user)):
    """Check connection status with another user"""
    reg = current_user.registration_number
    conn = await models.Connection.find_one({
        "$or": [
            {"requester_id": reg, "receiver_id": other_id},
            {"requester_id": other_id, "receiver_id": reg},
        ]
    })
    if not conn:
        return {"status": "none", "id": None}
    return {
        "status": conn.status,
        "id": str(conn.id),
        "is_requester": conn.requester_id == reg,
    }
