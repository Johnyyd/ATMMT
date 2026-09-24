import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db, engine, Base
from app.models import GuestbookMessage, User
from app.schemas import GuestbookCreate, GuestbookUpdate, GuestbookResponse
from app.services.moderation import censor_profanity
import bleach
from app.services.cleanup import purge_expired_anonymous_messages
from app.security import get_optional_current_user, get_current_admin
from app.rate_limit import rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/guestbook", tags=["guestbook"])

class ConnectionManager:
    def __init__(self):
        self.active_sockets: Dict[str, WebSocket] = {}

    def _get_clean_connections(self) -> List[WebSocket]:
        valid_sockets = {}
        for cid, ws in list(self.active_sockets.items()):
            if ws.client_state == WebSocketState.CONNECTED:
                valid_sockets[cid] = ws
        self.active_sockets = valid_sockets
        return list(self.active_sockets.values())

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id in self.active_sockets:
            old_ws = self.active_sockets[client_id]
            if old_ws != websocket:
                try:
                    await old_ws.close()
                except Exception:
                    pass
        self.active_sockets[client_id] = websocket
        logger.info(f"WebSocket client connected ({client_id}). Total clients: {len(self.active_sockets)}")
        await self.broadcast_online_count()

    async def disconnect(self, client_id: str, websocket: WebSocket):
        if client_id in self.active_sockets and self.active_sockets[client_id] == websocket:
            del self.active_sockets[client_id]
            logger.info(f"WebSocket client disconnected ({client_id}). Total clients: {len(self.active_sockets)}")
            await self.broadcast_online_count()

    async def broadcast_online_count(self):
        clean_sockets = dict(self.active_sockets)
        dead_cids = []
        
        for cid, ws in list(clean_sockets.items()):
            if ws.client_state != WebSocketState.CONNECTED:
                dead_cids.append(cid)

        for cid in dead_cids:
            clean_sockets.pop(cid, None)

        self.active_sockets = clean_sockets
        count = max(1, len(self.active_sockets))
        msg = {"event": "online_count", "count": count}

        failed_cids = []
        for cid, ws in list(self.active_sockets.items()):
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_json(msg)
            except Exception as e:
                logger.warning(f"Error sending online_count to {cid}: {e}")
                failed_cids.append(cid)

        if failed_cids:
            for cid in failed_cids:
                self.active_sockets.pop(cid, None)

    async def broadcast(self, message: dict):
        connections = self._get_clean_connections()
        for ws in list(connections):
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Error broadcasting to WebSocket client: {e}")

manager = ConnectionManager()

def build_guestbook_response(msg: GuestbookMessage, include_token: bool = False) -> GuestbookResponse:
    author_role = "anonymous"
    if msg.user:
        author_role = msg.user.role

    return GuestbookResponse(
        id=msg.id,
        author_name=msg.author_name,
        content=msg.content,
        avatar_color=msg.avatar_color,
        likes_count=msg.likes_count,
        created_at=msg.created_at,
        user_token=msg.user_token if include_token else None,
        user_id=msg.user_id,
        is_edited=msg.is_edited or False,
        edited_at=msg.edited_at,
        expires_at=msg.expires_at,
        image=msg.image,
        author_role=author_role
    )

@router.websocket("/ws")
async def guestbook_websocket_endpoint(websocket: WebSocket, client_id: Optional[str] = Query(None)):
    cid = client_id or f"anon_{id(websocket)}"
    await manager.connect(websocket, cid)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            else:
                try:
                    import json
                    parsed = json.loads(data)
                    if parsed.get("event") == "typing":
                        logger.info(f"Broadcasting typing event: {parsed}")
                        await manager.broadcast(parsed)
                except Exception as e:
                    logger.error(f"Error handling WS message: {e}")
    except WebSocketDisconnect:
        await manager.disconnect(cid, websocket)
    except Exception as e:
        logger.warning(f"WebSocket error ({cid}): {e}")
        await manager.disconnect(cid, websocket)

@router.get("/online-count")
def get_online_count():
    connections = manager._get_clean_connections()
    return {"count": max(1, len(connections))}

@router.get("", response_model=List[GuestbookResponse])
def get_guestbook_messages(limit: int = 100, db: Session = Depends(get_db)):
    messages = db.query(GuestbookMessage).order_by(GuestbookMessage.created_at.asc()).limit(limit).all()
    # In public list queries, never leak private user_token
    return [build_guestbook_response(msg, include_token=False) for msg in messages]

@router.post("", response_model=GuestbookResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limiter)])
async def create_guestbook_message(
    payload: GuestbookCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    clean_author_name = bleach.clean(censor_profanity(payload.author_name))
    clean_content = bleach.clean(censor_profanity(payload.content))

    user_id = None
    expires_at = None
    author_name = clean_author_name

    if current_user:
        user_id = current_user.id
        author_name = current_user.username
        expires_at = None  # Logged in users: permanent retention in DB!
    else:
        user_id = None
        # Anonymous users: set 30-day expiration date!
        expires_at = datetime.utcnow() + timedelta(days=30)

    msg = GuestbookMessage(
        author_name=author_name,
        content=clean_content,
        avatar_color=payload.avatar_color,
        user_token=payload.user_token,
        user_id=user_id,
        is_edited=False,
        expires_at=expires_at,
        image=payload.image
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    resp = build_guestbook_response(msg, include_token=True)

    import json
    
    # Broadcast new message event via WebSocket
    broadcast_data = {
        "event": "new_message",
        "data": json.loads(resp.model_dump_json())
    }
    
    # We need to run broadcast in a separate task or await it properly
    async def do_broadcast():
        try:
            await manager.broadcast(broadcast_data)
        except Exception as e:
            logger.error(f"Error broadcasting message: {e}")
            
    import asyncio
    asyncio.create_task(do_broadcast())

    return resp

@router.put("/{message_id}", response_model=GuestbookResponse)
async def update_guestbook_message(
    message_id: int,
    payload: GuestbookUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Admin Moderation: Edit a guestbook message containing sensitive / inappropriate content.
    """
    msg = db.query(GuestbookMessage).filter(GuestbookMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn cần chỉnh sửa.")
    
    msg.content = bleach.clean(censor_profanity(payload.content))
    msg.is_edited = True
    msg.edited_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    resp = build_guestbook_response(msg)

    # Broadcast message update via WebSocket
    broadcast_data = {
        "event": "message_updated",
        "data": {
            "id": resp.id,
            "content": resp.content,
            "is_edited": resp.is_edited,
            "edited_at": resp.edited_at.isoformat() if resp.edited_at else None,
            "image": resp.image,
            "author_role": resp.author_role
        }
    }
    await manager.broadcast(broadcast_data)

    return resp

@router.delete("/{message_id}", status_code=status.HTTP_200_OK)
async def delete_guestbook_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Admin Moderation: Delete a guestbook message.
    """
    msg = db.query(GuestbookMessage).filter(GuestbookMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn cần xóa.")
    
    db.delete(msg)
    db.commit()

    # Broadcast message deletion via WebSocket
    broadcast_data = {
        "event": "message_deleted",
        "data": {
            "id": message_id
        }
    }
    await manager.broadcast(broadcast_data)

    return {"success": True, "message": f"Tin nhắn ID {message_id} đã được xóa thành công bởi Admin."}

@router.post("/{message_id}/like", response_model=GuestbookResponse, dependencies=[Depends(rate_limiter)])
async def like_guestbook_message(message_id: int, db: Session = Depends(get_db)):
    msg = db.query(GuestbookMessage).filter(GuestbookMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.likes_count += 1
    db.commit()
    db.refresh(msg)
    
    resp = build_guestbook_response(msg)

    # Broadcast like update event via WebSocket
    broadcast_data = {
        "event": "like_update",
        "data": {
            "id": resp.id,
            "likes_count": resp.likes_count,
        }
    }
    await manager.broadcast(broadcast_data)
    
    return resp

@router.post("/purge-expired", status_code=status.HTTP_200_OK)
def purge_expired_messages_endpoint(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Admin-only endpoint to manually trigger 30-day cleanup of anonymous messages.
    """
    deleted_count = purge_expired_anonymous_messages(db)
    return {
        "success": True,
        "message": f"Đã quét và dọn dẹp {deleted_count} tin nhắn vãng lai quá hạn 30 ngày.",
        "purged_count": deleted_count
    }
