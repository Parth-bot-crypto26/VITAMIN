from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import models
from routers.auth import get_current_user
from services.agent import run_agent
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []

class ChatResponse(BaseModel):
    reply: str
    actions: List[str] = []

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, current_user: models.User = Depends(get_current_user)):
    """
    Send a message to Coco (the AI Study Buddy).
    Coco has access to the user's full academic context and can create/modify tasks and goals.
    This does NOT persist to the database.
    """
    logger.info(f"AI chat from {current_user.registration_number}: {req.message[:80]}")

    history = [{"role": m.role, "content": m.content} for m in req.history]

    try:
        result = await run_agent(current_user, req.message, history)
    except Exception as e:
        logger.error(f"Agent error: {e}", exc_info=True)
        # Return friendly error instead of crashing the app
        result = {"reply": f"❌ Coco hit an unexpected error: {str(e)[:150]}", "actions": []}

    logger.info(f"Coco replied ({len(result['reply'])} chars), actions: {result['actions']}")
    return ChatResponse(reply=result["reply"], actions=result["actions"])

@router.get("/history")
async def get_history(current_user: models.User = Depends(get_current_user)):
    """Fetch the full conversation history for the chat UI. Since we removed persistence, returns []"""
    return []

@router.delete("/history")
async def clear_history(current_user: models.User = Depends(get_current_user)):
    """Clear all chat history for this user."""
    return {"message": "Chat history cleared"}
