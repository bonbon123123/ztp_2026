from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.group_assignment.model.assignment_batch_item_orm import AssignmentBatchItemORM
from app.group_assignment.model.assignment_batch_orm import AssignmentBatchORM
from app.group_assignment.model.assignment_draft_item_orm import AssignmentDraftItemORM
from app.group_assignment.model.assignment_draft_orm import AssignmentDraftORM


def get_draft_by_operator_id(
    db: Session,
    operator_id: int,
) -> AssignmentDraftORM | None:
    query = (
        select(AssignmentDraftORM)
        .where(AssignmentDraftORM.operator_id == operator_id)
        .options(
            selectinload(AssignmentDraftORM.items)
            .selectinload(AssignmentDraftItemORM.student)
        )
    )
    result = db.execute(query)
    return result.scalars().first()


def create_draft(
    db: Session,
    operator_id: int,
) -> AssignmentDraftORM:
    draft = AssignmentDraftORM(operator_id=operator_id)

    db.add(draft)
    db.commit()
    db.refresh(draft)

    return draft


def get_or_create_draft(
    db: Session,
    operator_id: int,
) -> AssignmentDraftORM:
    draft = get_draft_by_operator_id(db, operator_id)

    if draft is not None:
        return draft

    return create_draft(db, operator_id)


def get_draft_item_by_draft_and_student(
    db: Session,
    draft_id: int,
    student_id: int,
) -> AssignmentDraftItemORM | None:
    query = select(AssignmentDraftItemORM).where(
        AssignmentDraftItemORM.draft_id == draft_id,
        AssignmentDraftItemORM.student_id == student_id,
    )
    result = db.execute(query)
    return result.scalars().first()


def get_draft_item_by_id(
    db: Session,
    item_id: int,
) -> AssignmentDraftItemORM | None:
    query = (
        select(AssignmentDraftItemORM)
        .where(AssignmentDraftItemORM.id == item_id)
        .options(selectinload(AssignmentDraftItemORM.student))
    )
    result = db.execute(query)
    return result.scalars().first()


def add_draft_item(
    db: Session,
    draft_id: int,
    student_id: int,
) -> AssignmentDraftItemORM:
    item = AssignmentDraftItemORM(
        draft_id=draft_id,
        student_id=student_id,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


def delete_draft_item(
    db: Session,
    item: AssignmentDraftItemORM,
) -> None:
    db.delete(item)
    db.commit()


def clear_draft_items(
    db: Session,
    draft_id: int,
) -> None:
    query = delete(AssignmentDraftItemORM).where(
        AssignmentDraftItemORM.draft_id == draft_id
    )
    db.execute(query)
    db.commit()


def add_assignment_batch(
    db: Session,
    batch: AssignmentBatchORM,
) -> AssignmentBatchORM:
    db.add(batch)
    db.commit()
    db.refresh(batch)

    return batch


def save_assignment_batch(
    db: Session,
    batch: AssignmentBatchORM,
) -> AssignmentBatchORM:
    db.add(batch)
    db.commit()
    db.refresh(batch)

    return batch


def add_assignment_batch_item(
    db: Session,
    item: AssignmentBatchItemORM,
) -> AssignmentBatchItemORM:
    db.add(item)
    db.commit()
    db.refresh(item)

    return item


def get_batches_by_operator_id(
    db: Session,
    operator_id: int,
) -> list[AssignmentBatchORM]:
    query = (
        select(AssignmentBatchORM)
        .where(AssignmentBatchORM.operator_id == operator_id)
        .order_by(AssignmentBatchORM.created_at.desc())
    )
    result = db.execute(query)
    return list(result.scalars().all())


def get_batch_by_id_and_operator_id(
    db: Session,
    batch_id: int,
    operator_id: int,
) -> AssignmentBatchORM | None:
    query = (
        select(AssignmentBatchORM)
        .where(
            AssignmentBatchORM.id == batch_id,
            AssignmentBatchORM.operator_id == operator_id,
        )
        .options(selectinload(AssignmentBatchORM.items))
    )
    result = db.execute(query)
    return result.scalars().first()