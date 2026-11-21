from app.group_assignment.model.assignment_status import AssignmentStatus
from app.group_assignment.service.assignment_exceptions import AssignmentValidationError

ALLOWED_STATUS_TRANSITIONS = {
    AssignmentStatus.PENDING: {
        AssignmentStatus.COMPLETED,
        AssignmentStatus.CANCELLED,
    },
    AssignmentStatus.COMPLETED: set(),
    AssignmentStatus.CANCELLED: set(),
}

def validate_status_transition(
    current_status: str,
    new_status: str,
) -> None:
    allowed_statuses = ALLOWED_STATUS_TRANSITIONS.get(current_status)

    if allowed_statuses is None:
        raise AssignmentValidationError(
            f"Nieznany aktualny status przypisania: {current_status}."
        )

    if new_status not in allowed_statuses:
        raise AssignmentValidationError(
            f"Nie można zmienić statusu z {current_status} na {new_status}."
        )