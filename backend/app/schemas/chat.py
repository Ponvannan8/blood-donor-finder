from enum import Enum

from pydantic import BaseModel, Field


class ChatRole(str, Enum):
    user = "user"
    assistant = "assistant"


class ChatMessage(BaseModel):
    role: ChatRole
    content: str = Field(..., min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    # Full conversation so far, ending with the newest user message.
    # Kept short server-side (see MAX_HISTORY_MESSAGES in routers/chat.py)
    # to bound both cost and the request payload sent to OpenRouter.
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=20)


class ChatResponse(BaseModel):
    reply: str
    model: str
