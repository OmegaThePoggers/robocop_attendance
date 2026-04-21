from celery import Celery
from core.config import settings

celery_app = Celery(
    "attendance_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "workers.tasks.recognize_faces_task": {"queue": "recognition"},
        "workers.tasks.apply_attendance_task": {"queue": "attendance"},
        "workers.tasks.verify_dispute_task": {"queue": "disputes"},
    },
)
