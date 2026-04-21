import asyncio
import logging
from workers.celery_app import celery_app

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Async implementations — module-level so they are independently testable
# ---------------------------------------------------------------------------

async def _recognition_async(session_id: str, image_s3_key: str) -> None:
    """
    Download classroom image from S3, run face recognition, store results.
    Always moves session to 'review' — even on exception — so it never
    gets permanently stuck in 'processing'.
    """
    from core.database import AsyncSessionLocal
    from ai.pipeline import pipeline
    from attendance_sessions.service import get_session, apply_recognition_results
    from attendance_sessions.model import SessionStatus
    from storage.s3_service import s3_service
    from sqlalchemy import text
    from datetime import datetime, timezone

    async with AsyncSessionLocal() as db:
        results = []
        try:
            image_bytes = await s3_service.get_image(image_s3_key)
            session = await get_session(db, session_id)
            results = await pipeline.process_image(image_bytes, session.class_id, db)
        except Exception as exc:
            logger.error("Face recognition failed for session %s: %s", session_id, exc, exc_info=True)
            # Fall through — apply_recognition_results with empty results marks
            # everyone absent and moves session to 'review'

        try:
            await apply_recognition_results(db, session_id, results)
        except Exception as exc:
            # Absolute last resort: force session to 'review' directly
            logger.error("apply_recognition_results failed for session %s: %s", session_id, exc, exc_info=True)
            try:
                await db.execute(
                    text(
                        "UPDATE attendance_sessions SET status='review', processed_at=:now "
                        "WHERE id=:sid AND status='processing'"
                    ),
                    {"now": datetime.now(timezone.utc), "sid": session_id},
                )
                await db.commit()
            except Exception:
                pass


async def _apply_attendance_async(session_id: str, results: list) -> None:
    """Write pre-computed recognition results into attendance_records."""
    from core.database import AsyncSessionLocal
    from attendance_sessions.service import apply_recognition_results

    async with AsyncSessionLocal() as db:
        await apply_recognition_results(db, session_id, results)


async def _verify_dispute_async(dispute_id: str) -> None:
    """Crop dispute region, re-run recognition, auto-approve or escalate."""
    from core.database import AsyncSessionLocal
    from sqlalchemy import select
    from attendance_disputes.model import AttendanceDispute, DisputeStatus
    from attendance_sessions.model import AttendanceRecord, AttendanceStatus, AttendanceSession
    from storage.s3_service import s3_service
    from ai.pipeline import pipeline
    from core.config import settings

    async with AsyncSessionLocal() as db:
        disp_res = await db.execute(
            select(AttendanceDispute).where(AttendanceDispute.id == dispute_id)
        )
        dispute = disp_res.scalar_one_or_none()
        if not dispute:
            return

        rec_res = await db.execute(
            select(AttendanceRecord).where(AttendanceRecord.id == dispute.record_id)
        )
        record = rec_res.scalar_one_or_none()
        if not record:
            return

        sess_res = await db.execute(
            select(AttendanceSession).where(AttendanceSession.id == record.session_id)
        )
        session = sess_res.scalar_one_or_none()
        if not session or not session.image_url:
            dispute.status = DisputeStatus.admin_review
            await db.commit()
            return

        try:
            image_bytes = await s3_service.get_image(session.image_url)
            results = await pipeline.process_cropped_region(
                image_bytes,
                dispute.bbox_x, dispute.bbox_y,
                dispute.bbox_w, dispute.bbox_h,
                session.class_id,
                db,
            )
            student_match = next(
                (r for r in results if r.get("student_id") == dispute.student_id), None
            )
            if student_match and student_match["confidence"] >= settings.FACE_CONFIDENCE_CONFIRMED:
                dispute.status = DisputeStatus.auto_approved
                record.status = AttendanceStatus.overridden_present
            else:
                dispute.status = DisputeStatus.admin_review
        except Exception as exc:
            logger.error("Dispute verification failed for %s: %s", dispute_id, exc, exc_info=True)
            dispute.status = DisputeStatus.admin_review

        await db.commit()


# ---------------------------------------------------------------------------
# Celery task wrappers — thin asyncio.run() shells
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=0, name="workers.tasks.recognize_faces_task")
def recognize_faces_task(self, session_id: str, image_s3_key: str):
    """Download classroom image from S3, run face recognition, store results."""
    # max_retries=0: we handle recovery inside the async function (session → review)
    asyncio.run(_recognition_async(session_id, image_s3_key))


@celery_app.task(name="workers.tasks.apply_attendance_task")
def apply_attendance_task(session_id: str, results: list):
    """Write pre-computed recognition results into attendance_records."""
    asyncio.run(_apply_attendance_async(session_id, results))


@celery_app.task(bind=True, max_retries=2, name="workers.tasks.verify_dispute_task")
def verify_dispute_task(self, dispute_id: str):
    """Crop dispute region, re-run recognition, auto-approve or escalate."""
    try:
        asyncio.run(_verify_dispute_async(dispute_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
