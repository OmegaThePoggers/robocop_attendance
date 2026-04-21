import uuid
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from attendance_disputes.model import AttendanceDispute, DisputeStatus
from attendance_sessions.model import AttendanceRecord, AttendanceStatus
from attendance_disputes.schema import DisputeCreate, DisputeResolve


async def submit_dispute(
    db: AsyncSession, data: DisputeCreate, student_id: str
) -> AttendanceDispute:
    from workers.tasks import verify_dispute_task

    # Verify the record belongs to this student and is an absent record
    rec_result = await db.execute(
        select(AttendanceRecord).where(AttendanceRecord.id == data.record_id)
    )
    record = rec_result.scalar_one_or_none()
    if not record or record.student_id != student_id:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    absent_statuses = {AttendanceStatus.absent, AttendanceStatus.overridden_absent}
    if record.status not in absent_statuses:
        raise HTTPException(status_code=400, detail="Can only dispute absent records")

    dispute = AttendanceDispute(
        id=str(uuid.uuid4()),
        record_id=data.record_id,
        student_id=student_id,
        bbox_x=data.bbox_x,
        bbox_y=data.bbox_y,
        bbox_w=data.bbox_w,
        bbox_h=data.bbox_h,
        status=DisputeStatus.pending,
    )
    db.add(dispute)
    await db.commit()
    await db.refresh(dispute)

    # Dispatch async verification
    verify_dispute_task.delay(str(dispute.id))
    return dispute


async def get_dispute(db: AsyncSession, dispute_id: str) -> AttendanceDispute:
    result = await db.execute(
        select(AttendanceDispute).where(AttendanceDispute.id == dispute_id)
    )
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    return dispute


async def list_disputes(
    db: AsyncSession, status: Optional[str] = None
) -> List[AttendanceDispute]:
    query = select(AttendanceDispute)
    if status:
        query = query.where(AttendanceDispute.status == status)
    result = await db.execute(query)
    return list(result.scalars().all())


async def list_student_disputes(
    db: AsyncSession, student_id: str
) -> List[AttendanceDispute]:
    result = await db.execute(
        select(AttendanceDispute).where(AttendanceDispute.student_id == student_id)
    )
    return list(result.scalars().all())


async def admin_resolve(
    db: AsyncSession, dispute_id: str, data: DisputeResolve, admin_id: str
) -> AttendanceDispute:
    dispute = await get_dispute(db, dispute_id)

    if dispute.status != DisputeStatus.admin_review:
        raise HTTPException(
            status_code=400, detail="Only disputes in 'admin_review' state can be resolved"
        )

    dispute.status = DisputeStatus.resolved
    dispute.admin_id = admin_id
    dispute.resolution_note = data.resolution_note

    if data.approved:
        rec_result = await db.execute(
            select(AttendanceRecord).where(AttendanceRecord.id == dispute.record_id)
        )
        record = rec_result.scalar_one_or_none()
        if record:
            record.status = AttendanceStatus.overridden_present
            record.overridden_by_teacher = False  # overridden by admin, not teacher

    await db.commit()
    await db.refresh(dispute)
    return dispute
