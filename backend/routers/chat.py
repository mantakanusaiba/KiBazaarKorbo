from fastapi import APIRouter
from pydantic import BaseModel, Field
from services.chat_service import chat_with_agent

router = APIRouter(tags=["agent-chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    history: list[ChatMessage] = []


@router.post("/chat")
def chat(req: ChatRequest):
    return chat_with_agent(
        user_message=req.message,
        history=[m.dict() for m in req.history],
    )