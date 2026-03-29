from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import models
from routers.auth import get_current_user
from pydantic import BaseModel
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/communities", tags=["Communities"])


class CommunityCreate(BaseModel):
    name: str
    description: str = ""
    goal_tags: List[str] = []


class CommunityMessageCreate(BaseModel):
    content: str = ""
    attachment_name: str = ""
    attachment_type: str = ""    # "image" | "document" | ""
    attachment_data: str = ""    # base64 string


def _fmt(c: models.Community, reg: str) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "description": c.description,
        "goal_tags": c.goal_tags,
        "creator_id": c.creator_id,
        "members": c.members,
        "pending_invites": c.pending_invites,
        "member_count": len(c.members),
        "created_at": c.created_at,
        "is_member": reg in c.members,
        "is_invited": reg in c.pending_invites,
    }


# ── List all communities ───────────────────────────────────────────────────────
@router.get("/")
async def list_communities(current_user: models.User = Depends(get_current_user)):
    communities = await models.Community.find_all().to_list()
    return [_fmt(c, current_user.registration_number) for c in communities]


# ── Create community + auto-invite goal-matched users ─────────────────────────
@router.post("/")
async def create_community(req: CommunityCreate, current_user: models.User = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    community = models.Community(
        name=req.name,
        description=req.description,
        goal_tags=[t.strip().lower() for t in req.goal_tags if t.strip()],
        creator_id=current_user.registration_number,
        members=[current_user.registration_number],
        pending_invites=[],
        created_at=now,
    )
    await community.insert()

    # Auto-invite users with matching goals
    if req.goal_tags:
        all_users = await models.User.find_all().to_list()
        for u in all_users:
            if u.registration_number == current_user.registration_number:
                continue
            user_goals = await models.Goal.find({"owner_id": u.registration_number}).to_list()
            goal_text = " ".join(g.title.lower() for g in user_goals)
            for tag in community.goal_tags:
                if tag in goal_text and u.registration_number not in community.pending_invites:
                    community.pending_invites.append(u.registration_number)
                    break
        await community.save()

    return _fmt(community, current_user.registration_number)


# ── Join / Accept invite ───────────────────────────────────────────────────────
@router.post("/{community_id}/join")
async def join_community(community_id: str, current_user: models.User = Depends(get_current_user)):
    from beanie import PydanticObjectId
    try:
        c = await models.Community.get(PydanticObjectId(community_id))
    except Exception:
        raise HTTPException(404, "Community not found")
    reg = current_user.registration_number
    if reg not in c.members:
        c.members.append(reg)
    if reg in c.pending_invites:
        c.pending_invites.remove(reg)
    await c.save()
    return _fmt(c, reg)


# ── Leave ──────────────────────────────────────────────────────────────────────
@router.post("/{community_id}/leave")
async def leave_community(community_id: str, current_user: models.User = Depends(get_current_user)):
    from beanie import PydanticObjectId
    try:
        c = await models.Community.get(PydanticObjectId(community_id))
    except Exception:
        raise HTTPException(404, "Community not found")
    reg = current_user.registration_number
    if reg in c.members:
        c.members.remove(reg)
    await c.save()
    return {"message": "Left community"}


# ── Get messages (full base64 attachments) ────────────────────────────────────
@router.get("/{community_id}/messages")
async def get_community_messages(community_id: str, current_user: models.User = Depends(get_current_user)):
    from beanie import PydanticObjectId
    try:
        c = await models.Community.get(PydanticObjectId(community_id))
    except Exception:
        raise HTTPException(404, "Community not found")
    if current_user.registration_number not in c.members:
        raise HTTPException(403, "Not a member")

    messages = await models.CommunityMessage.find(
        {"community_id": community_id}
    ).sort("timestamp").to_list()

    return [
        {
            "id": str(m.id),
            "community_id": m.community_id,
            "sender_id": m.sender_id,
            "sender_name": m.sender_name,
            "content": m.content,
            "attachment_name": m.attachment_name,
            "attachment_type": m.attachment_type,
            "attachment_data": m.attachment_data,  # full base64, accessible to all members
            "timestamp": m.timestamp,
        }
        for m in messages
    ]


# ── Send message ───────────────────────────────────────────────────────────────
@router.post("/{community_id}/messages")
async def send_community_message(
    community_id: str,
    req: CommunityMessageCreate,
    current_user: models.User = Depends(get_current_user)
):
    from beanie import PydanticObjectId
    try:
        c = await models.Community.get(PydanticObjectId(community_id))
    except Exception:
        raise HTTPException(404, "Community not found")
    if current_user.registration_number not in c.members:
        raise HTTPException(403, "Not a member")

    now = datetime.now(timezone.utc).isoformat()
    msg = models.CommunityMessage(
        community_id=community_id,
        sender_id=current_user.registration_number,
        sender_name=current_user.name,
        content=req.content or "",
        attachment_name=req.attachment_name,
        attachment_type=req.attachment_type,
        attachment_data=req.attachment_data,  # stored as base64
        timestamp=now,
    )
    await msg.insert()
    return {
        "id": str(msg.id),
        "community_id": msg.community_id,
        "sender_id": msg.sender_id,
        "sender_name": msg.sender_name,
        "content": msg.content,
        "attachment_name": msg.attachment_name,
        "attachment_type": msg.attachment_type,
        "attachment_data": msg.attachment_data,
        "timestamp": msg.timestamp,
    }


# ── Leaderboard — ranked by goal progress within community tags ────────────────
@router.get("/{community_id}/leaderboard")
async def get_leaderboard(community_id: str, current_user: models.User = Depends(get_current_user)):
    from beanie import PydanticObjectId
    try:
        c = await models.Community.get(PydanticObjectId(community_id))
    except Exception:
        raise HTTPException(404, "Community not found")
    if current_user.registration_number not in c.members:
        raise HTTPException(403, "Not a member")

    board = []
    for reg in c.members:
        user = await models.User.find_one({"registration_number": reg})
        if not user:
            continue
        # Find goals relevant to this community's tags
        all_goals = await models.Goal.find({"owner_id": reg}).to_list()
        relevant = [g for g in all_goals if any(
            tag.lower() in g.title.lower() for tag in c.goal_tags
        )] if c.goal_tags else all_goals

        avg_progress = (sum(g.progress for g in relevant) / len(relevant)) if relevant else 0
        total_streak = sum(g.streak for g in relevant)
        num_goals = len(relevant)

        board.append({
            "registration_number": reg,
            "name": user.name,
            "branch": user.branch,
            "avg_progress": round(avg_progress, 1),
            "total_streak": total_streak,
            "num_relevant_goals": num_goals,
            "score": round(avg_progress * 0.7 + total_streak * 0.3, 1),
        })

    board.sort(key=lambda x: x["score"], reverse=True)
    for i, item in enumerate(board):
        item["rank"] = i + 1
    return board


# ── Suggested connections (shared goals) ──────────────────────────────────────
@router.get("/connections/suggested")
async def get_suggested_connections(current_user: models.User = Depends(get_current_user)):
    my_goals = await models.Goal.find({"owner_id": current_user.registration_number}).to_list()
    my_kw = {w for g in my_goals for w in g.title.lower().split() if len(w) > 3}

    all_users = await models.User.find_all().to_list()
    suggestions = []
    for u in all_users:
        if u.registration_number == current_user.registration_number:
            continue
        their_goals = await models.Goal.find({"owner_id": u.registration_number}).to_list()
        their_kw = {w for g in their_goals for w in g.title.lower().split() if len(w) > 3}
        shared = my_kw & their_kw
        if shared:
            suggestions.append({
                "registration_number": u.registration_number,
                "name": u.name,
                "branch": u.branch,
                "shared_keywords": list(shared),
                "their_goals": [g.title for g in their_goals],
            })
    return suggestions
