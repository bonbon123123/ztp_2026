from sqlalchemy.orm import Session

from app.group_assignment.data.assignment_repository import (
    add_processed_command,
    get_batch_by_id_and_operator_id,
    is_command_already_processed,
    save_assignment_batch,
)
from app.group_assignment.model.assignment_schema import AssignmentBatchResponse
from app.group_assignment.model.assignment_status import AssignmentStatus
from app.group_assignment.service.assignment_exceptions import (
    AssignmentNotFoundError,
    AssignmentValidationError,
)
from app.group_assignment.service.assignment_notification_service import (
    create_assignment_completed_notifications,
)
from app.group_assignment.service.assignment_state_machine import validate_status_transition
from app.group_assignment.service.complete_assignment_command import CompleteAssignmentCommand


def handle_complete_assignment(
    db: Session,
    command: CompleteAssignmentCommand,
) -> AssignmentBatchResponse:
    if is_command_already_processed(
        db=db,
        command_name=command.command_name,
        idempotency_key=command.idempotency_key,
    ):
        batch = get_batch_by_id_and_operator_id(
            db=db,
            batch_id=command.batch_id,
            operator_id=command.operator_id,
        )

        if batch is None:
            raise AssignmentNotFoundError("Przypisanie nie istnieje.")

        return AssignmentBatchResponse.model_validate(batch)

    batch = get_batch_by_id_and_operator_id(
        db=db,
        batch_id=command.batch_id,
        operator_id=command.operator_id,
    )

    if batch is None:
        raise AssignmentNotFoundError("Przypisanie nie istnieje.")

    validate_status_transition(
        current_status=batch.status,
        new_status=AssignmentStatus.COMPLETED,
    )

    batch.status = AssignmentStatus.COMPLETED
    batch = save_assignment_batch(db, batch)

    add_processed_command(
        db=db,
        command_name=command.command_name,
        idempotency_key=command.idempotency_key,
        operator_id=command.operator_id,
    )

    create_assignment_completed_notifications(
        db=db,
        batch=batch,
        operator_email=command.completed_by,
        notify_email=command.notify_email,
        notify_push=command.notify_push,
    )

    return AssignmentBatchResponse.model_validate(batch)