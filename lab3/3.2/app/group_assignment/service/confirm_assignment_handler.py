# app/group_assignment/service/confirm_assignment_handler.py

from datetime import datetime

from sqlalchemy.orm import Session

from app.group_assignment.data.assignment_repository import (
    add_assignment_batch,
    add_assignment_batch_item,
    clear_draft_items,
    get_or_create_draft,
)
from app.group_assignment.model.assignment_batch_item_orm import AssignmentBatchItemORM
from app.group_assignment.model.assignment_batch_orm import AssignmentBatchORM
from app.group_assignment.model.assignment_draft_orm import AssignmentDraftORM
from app.group_assignment.model.assignment_schema import AssignmentBatchResponse
from app.group_assignment.service.assignment_exceptions import AssignmentValidationError
from app.group_assignment.service.confirm_assignment_command import ConfirmAssignmentCommand


def _generate_assignment_number(batch_id: int) -> str:
    today = datetime.now().strftime("%Y%m%d")
    return f"PRZ-{today}-{batch_id:06d}"


def _get_valid_draft(
    db: Session,
    operator_id: int,
) -> AssignmentDraftORM:
    draft = get_or_create_draft(db, operator_id)

    if not draft.items:
        raise AssignmentValidationError("Nie można zatwierdzić pustej grupy.")

    return draft


def _calculate_students_count(draft: AssignmentDraftORM) -> int:
    return len(draft.items)


def _calculate_total_ects(draft: AssignmentDraftORM) -> int:
    return sum(item.student.ects_points for item in draft.items)


def _create_assignment_batch(
    db: Session,
    operator_id: int,
    students_count: int,
    total_ects: int,
) -> AssignmentBatchORM:
    batch = AssignmentBatchORM(
        operator_id=operator_id,
        assignment_number="TEMP",
        status="PENDING",
        students_count=students_count,
        total_ects=total_ects,
    )

    batch = add_assignment_batch(db, batch)

    batch.assignment_number = _generate_assignment_number(batch.id)

    db.add(batch)
    db.commit()
    db.refresh(batch)

    return batch


def _create_assignment_batch_items(
    db: Session,
    batch_id: int,
    draft: AssignmentDraftORM,
) -> None:
    for item in draft.items:
        student = item.student

        batch_item = AssignmentBatchItemORM(
            batch_id=batch_id,
            student_id=student.id,
            student_name=student.name,
            student_lastname=student.lastname,
            student_code=student.student_code,
            ects_points=student.ects_points,
        )

        add_assignment_batch_item(db, batch_item)


def _build_batch_response(batch: AssignmentBatchORM) -> AssignmentBatchResponse:
    return AssignmentBatchResponse(
        id=batch.id,
        operator_id=batch.operator_id,
        assignment_number=batch.assignment_number,
        status=batch.status,
        students_count=batch.students_count,
        total_ects=batch.total_ects,
        created_at=batch.created_at,
        items=batch.items,
    )


def handle_confirm_assignment(
    db: Session,
    command: ConfirmAssignmentCommand,
) -> AssignmentBatchResponse:
    draft = _get_valid_draft(db, command.operator_id)

    students_count = _calculate_students_count(draft)
    total_ects = _calculate_total_ects(draft)

    batch = _create_assignment_batch(
        db=db,
        operator_id=command.operator_id,
        students_count=students_count,
        total_ects=total_ects,
    )

    _create_assignment_batch_items(
        db=db,
        batch_id=batch.id,
        draft=draft,
    )

    clear_draft_items(db, draft.id)

    return _build_batch_response(batch)