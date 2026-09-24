import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import SessionLocal
from app.models import GuestbookMessage

logger = logging.getLogger(__name__)

def purge_expired_anonymous_messages(db: Session) -> int:
    """
    Purge guestbook messages sent by anonymous users (user_id is None)
    that are older than 30 days (or where expires_at <= NOW).
    """
    try:
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        
        # Target anonymous messages where expires_at <= now OR created_at <= 30 days ago
        query = db.query(GuestbookMessage).filter(
            GuestbookMessage.user_id.is_(None),
            or_(
                GuestbookMessage.expires_at <= now,
                GuestbookMessage.created_at <= thirty_days_ago
            )
        )
        
        deleted_count = query.delete(synchronize_session=False)
        db.commit()
        if deleted_count > 0:
            logger.info(f"Purged {deleted_count} expired anonymous guestbook messages.")
        return deleted_count
    except Exception as e:
        db.rollback()
        logger.error(f"Error purging expired anonymous messages: {e}")
        return 0

async def cleanup_loop_task():
    """
    Periodic background loop running every 1 hour to clean up expired anonymous messages.
    """
    logger.info("Starting background anonymous message cleanup scheduler.")
    while True:
        try:
            db = SessionLocal()
            try:
                purge_expired_anonymous_messages(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in cleanup background task: {e}")
        
        # Sleep for 1 hour (3600 seconds) before next execution
        await asyncio.sleep(3600)
