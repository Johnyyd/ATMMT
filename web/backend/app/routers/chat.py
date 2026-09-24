from fastapi import APIRouter, HTTPException, Depends
from app.schemas import ChatRequest, ChatAPIResponse, ChatResponseData
from app.services.llm_service import LLMService
from app.services.suggestion_service import get_fallback_suggestions
from app.services.moderation import censor_profanity
from app.rate_limit import rate_limiter

router = APIRouter(prefix="/chat", tags=["chat"])
llm_service = LLMService()

@router.post("", response_model=ChatAPIResponse)
async def chat_with_ai(payload: ChatRequest, _=Depends(rate_limiter)):
    try:
        clean_user_message = censor_profanity(payload.message)

        history = []
        for msg in (payload.history or []):
            dumped = msg.model_dump()
            dumped["content"] = censor_profanity(dumped.get("content", ""))
            history.append(dumped)

        history.append({"role": "user", "content": clean_user_message})

        res = await llm_service.generate_response(
            conversation_history=history,
            provider=payload.provider
        )

        suggestions = res.get("suggested_questions")
        if not suggestions:
            suggestions = get_fallback_suggestions(payload.topic_id or "about", clean_user_message)

        return ChatAPIResponse(
            success=True,
            data=ChatResponseData(
                reply=res["reply"],
                provider_used=res["provider_used"],
                model_used=res["model_used"],
                suggested_questions=suggestions,
                error=res.get("error")
            )
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi xử lý phản hồi từ AI Assistant: {str(e)}"
        )
