from datetime import datetime
from sqlalchemy.orm import Session
from app.REST.data.student_repository import get_student_by_id
from app.group_assignment.data.assignment_repository import (
    add_draft_item,
    delete_draft_item,
    get_draft_item_by_draft_and_student,
    get_draft_item_by_id,
    get_or_create_draft,
)
from app.group_assignment.model.assignment_draft_orm import AssignmentDraftORM
from app.group_assignment.model.assignment_schema import (
    AssignmentDraftItemCreate,
    AssignmentDraftItemResponse,
    AssignmentDraftResponse,
)
from app.group_assignment.service.assignment_exceptions import (
    AssignmentConflictError,
    AssignmentNotFoundError,
)

from app.group_assignment.data.assignment_repository import (
    get_batch_by_id_and_operator_id,
    get_batches_by_operator_id,
)
from app.group_assignment.model.assignment_schema import (
    AssignmentBatchListItemResponse,
    AssignmentBatchResponse,
)

def _calculate_total_ects(draft: AssignmentDraftORM) -> int:
    total = 0

    for item in draft.items:
        if item.student is not None:
            total += item.student.ects_points

    return total

def _build_draft_response(draft: AssignmentDraftORM) -> AssignmentDraftResponse:
    return AssignmentDraftResponse(
        id=draft.id,
        operator_id=draft.operator_id,
        items=[
            AssignmentDraftItemResponse.model_validate(item)
            for item in draft.items
        ],
        students_count=len(draft.items),
        total_ects=_calculate_total_ects(draft),
        created_at=draft.created_at,
        updated_at=draft.updated_at,
    )

def get_current_assignment_draft(
    db: Session,
    operator_id: int,
) -> AssignmentDraftResponse:
    draft = get_or_create_draft(db, operator_id)

    return _build_draft_response(draft)

def add_student_to_assignment_draft(
    db: Session,
    operator_id: int,
    payload: AssignmentDraftItemCreate,
) -> AssignmentDraftResponse:
    draft = get_or_create_draft(db, operator_id)

    student = get_student_by_id(db, payload.student_id)
    if student is None:
        raise AssignmentNotFoundError("Student o podanym identyfikatorze nie istnieje.")

    existing_item = get_draft_item_by_draft_and_student(
        db=db,
        draft_id=draft.id,
        student_id=payload.student_id,
    )
    if existing_item is not None:
        raise AssignmentConflictError("Ten student jest już dodany do roboczej grupy.")

    add_draft_item(
        db=db,
        draft_id=draft.id,
        student_id=payload.student_id,
    )

    draft.updated_at = datetime.now()
    db.add(draft)
    db.commit()
    db.refresh(draft)
    refreshed_draft = get_or_create_draft(db, operator_id)
    return _build_draft_response(refreshed_draft)

def remove_student_from_assignment_draft(
    db: Session,
    operator_id: int,
    item_id: int,
) -> bool:
    draft = get_or_create_draft(db, operator_id)

    item = get_draft_item_by_id(db, item_id)
    if item is None:
        raise AssignmentNotFoundError("Pozycja roboczej grupy nie istnieje.")

    if item.draft_id != draft.id:
        raise AssignmentNotFoundError("Pozycja nie należy do roboczej grupy aktualnego operatora.")

    delete_draft_item(db, item)
    draft.updated_at = datetime.now()
    db.add(draft)
    db.commit()
    return True

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
        batch_id=batch_id,
        operator_id=operator_id,
    )

    if batch is None:
        raise AssignmentNotFoundError("Zatwierdzone przypisanie nie istnieje.")

    return AssignmentBatchResponse.model_validate(batch)