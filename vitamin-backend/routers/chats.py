from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import models
from routers.auth import get_current_user
from pydantic import BaseModel
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chats", tags=["Chats"])


class ChatMessageCreate(BaseModel):
    receiver_id: str
    content: str
    attachment_name: str = ""
    attachment_type: str = ""
    attachment_data: str = ""


@router.get("/search")
async def search_users(q: str = "", current_user: models.User = Depends(get_current_user)):
    """Search users by name or registration number"""
    if not q or len(q) < 2:
        return []
    q_lower = q.lower()
    all_users = await models.User.find_all().to_list()
    results = []
    for u in all_users:
        if u.registration_number == current_user.registration_number:
            continue
        if q_lower in u.name.lower() or q_lower in u.registration_number.lower():
            results.append({
                "registration_number": u.registration_number,
                "name": u.name,
                "branch": u.branch,
            })
    return results[:20]


@router.get("/conversations")
async def get_conversations(current_user: models.User = Depends(get_current_user)):
    """Get list of all users this person has chatted with, with last message preview"""
    reg = current_user.registration_number

    # Get all messages involving this user
    all_msgs = await models.UserMessage.find({
        "$or": [{"sender_id": reg}, {"receiver_id": reg}]
    }).sort("timestamp").to_list()

    # Build conversation map: other_id -> {last_msg, unread_count}
    conversations = {}
    for m in all_msgs:
        other = m.receiver_id if m.sender_id == reg else m.sender_id
        conversations[other] = {
            "last_message": m.content or ("📎 " + m.attachment_name if m.attachment_name else ""),
            "last_timestamp": m.timestamp,
            "is_mine": m.sender_id == reg,
        }

    result = []
    for other_id, conv in conversations.items():
        user = await models.User.find_one({"registration_number": other_id})
        if user:
            result.append({
                "registration_number": user.registration_number,
                "name": user.name,
                "branch": user.branch,
                **conv,
            })

    # Sort by last message (most recent first)
    result.sort(key=lambda x: x.get("last_timestamp", ""), reverse=True)
    return result


@router.get("/{receiver_id}")
async def get_messages(receiver_id: str, current_user: models.User = Depends(get_current_user)):
    """Fetch conversation history between current user and receiver_id"""
    messages = await models.UserMessage.find({
        "$or": [
            {"sender_id": current_user.registration_number, "receiver_id": receiver_id},
            {"sender_id": receiver_id, "receiver_id": current_user.registration_number}
        ]
    }).sort("timestamp").to_list()

    return [
        {
            "id": str(m.id),
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "content": m.content,
            "timestamp": m.timestamp,
            "attachment_name": m.attachment_name,
            "attachment_type": m.attachment_type,
            "attachment_data": m.attachment_data,
        }
        for m in messages
    ]


@router.post("/")
async def send_message(req: ChatMessageCreate, current_user: models.User = Depends(get_current_user)):
    """Send a message to another user"""
    now = datetime.now(timezone.utc).isoformat()
    msg = models.UserMessage(
        sender_id=current_user.registration_number,
        receiver_id=req.receiver_id,
        content=req.content,
        timestamp=now,
        attachment_name=req.attachment_name,
        attachment_type=req.attachment_type,
        attachment_data=req.attachment_data,
    )
    await msg.insert()
    return {
        "id": str(msg.id),
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "content": msg.content,
        "timestamp": msg.timestamp,
        "attachment_name": msg.attachment_name,
        "attachment_type": msg.attachment_type,
        "attachment_data": msg.attachment_data,
    }
