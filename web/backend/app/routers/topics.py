from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.data.topics_data import PORTFOLIO_TOPICS, TOPIC_MESSAGES

router = APIRouter(prefix="/topics", tags=["topics"])

@router.get("", response_model=List[Dict[str, Any]])
def get_topics():
    return PORTFOLIO_TOPICS

@router.get("/{topic_id}/messages", response_model=List[Dict[str, Any]])
def get_topic_messages(topic_id: str):
    if topic_id not in TOPIC_MESSAGES:
        if topic_id == "guestbook":
            return []
        raise HTTPException(status_code=404, detail="Topic messages not found")
    return TOPIC_MESSAGES[topic_id]
