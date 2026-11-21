from sqlalchemy.orm import Session

from app.group_assignment.data.assignment_repository import (
    get_batch_by_id_and_operator_id,
    get_batches_by_operator_id,
)
from app.group_assignment.model.assignment_schema import (
    AssignmentBatchListItemResponse,
    AssignmentBatchResponse,
)
from app.group_assignment.service.assignment_exceptions import AssignmentNotFoundError


def list_assignment_batches(
    db: Session,
    operator_id: int,
) -> list[AssignmentBatchListItemResponse]:
    batches = get_batches_by_operator_id(
        db=db,
        operator_id=operator_id,
    )

    return [
        AssignmentBatchListItemResponse.model_validate(batch)
        for batch in batches
    ]


def get_assignment_batch_details(
    db: Session,
    operator_id: int,
    batch_id: int,
) -> AssignmentBatchResponse:
    batch = get_batch_by_id_and_operator_id(
        db=db,
        operator_id=operator_id,
        batch_id=batch_id,
    )

    if batch is None:
        raise AssignmentNotFoundError("Zatwierdzone przypisanie nie istnieje.")

    return AssignmentBatchResponse.model_validate(batch)