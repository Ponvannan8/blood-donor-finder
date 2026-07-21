from fastapi import APIRouter, HTTPException, status

from app.core.chatbot import get_chat_reply
from app.core.config import get_settings
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])

MAX_HISTORY_MESSAGES = 12  # keeps the OpenRouter request small and bounds cost/latency


@router.post("/message", response_model=ChatResponse)
async def send_chat_message(payload: ChatRequest):
    if payload.messages[-1].role != "user":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The last message must be from the user")

    trimmed = payload.messages[-MAX_HISTORY_MESSAGES:]
    openrouter_messages = [{"role": m.role.value, "content": m.content} for m in trimmed]

    reply = await get_chat_reply(openrouter_messages)
    return ChatResponse(reply=reply, model=get_settings().OPENROUTER_MODEL)
