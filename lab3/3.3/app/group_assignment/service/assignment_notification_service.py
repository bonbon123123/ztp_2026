from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.group_assignment.model.assignment_batch_orm import AssignmentBatchORM
from app.notifications.model.notification_channel import NotificationChannel
from app.notifications.model.notification_schema import NotificationCreate
from app.notifications.service.notification_service import create_notification


def _build_assignment_completed_content(batch: AssignmentBatchORM) -> str:
    return (
        f"Przypisanie {batch.assignment_number} zostało zakończone. "
        f"Liczba studentów: {batch.students_count}. "
        f"Suma ECTS: {batch.total_ects}. "
        f"Status: {batch.status}."
    )


def create_assignment_completed_notifications(
    db: Session,
    batch: AssignmentBatchORM,
    operator_email: str,
    notify_email: bool,
    notify_push: bool,
) -> None:
    content = _build_assignment_completed_content(batch)

    scheduled_at = datetime.now(timezone.utc) + timedelta(seconds=1)

    if notify_email:
        email_notification = NotificationCreate(
            content=content,
            channel=NotificationChannel.EMAIL,
            recipient=operator_email,
            scheduled_at=scheduled_at,
            timezone="UTC",
        )

        create_notification(
            db=db,
            notification_data=email_notification,
        )

    if notify_push:
        push_notification = NotificationCreate(
            content=content,
            channel=NotificationChannel.PUSH,
            recipient="test",
            scheduled_at=scheduled_at,
            timezone="UTC",
        )

        create_notification(
            db=db,
            notification_data=push_notification,
        )