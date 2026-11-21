from fastapi import APIRouter, Cookie, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session
from app.REST.data.database import get_db
from app.identity.model.operator_orm import OperatorORM
from app.identity.service.auth_exceptions import AuthorizationError
from app.identity.service.auth_service import get_current_operator
from app.group_assignment.model.assignment_schema import (
    AssignmentBatchListItemResponse,
    AssignmentBatchResponse,
    AssignmentDraftItemCreate,
    AssignmentDraftResponse,
)
from app.group_assignment.service.assignment_exceptions import (
    AssignmentConflictError,
    AssignmentNotFoundError,
    AssignmentValidationError,
)
from app.group_assignment.service.assignment_service import (
    add_student_to_assignment_draft,
    get_assignment_batch_details,
    get_current_assignment_draft,
    list_assignment_batches,
    remove_student_from_assignment_draft,
)
from app.group_assignment.service.confirm_assignment_command import ConfirmAssignmentCommand
from app.group_assignment.service.confirm_assignment_handler import handle_confirm_assignment


router = APIRouter(
    prefix="/assignments",
    tags=["Group Assignment"],
)


def get_current_operator_dependency(
    auth_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> OperatorORM:
    if auth_token is None:
        raise HTTPException(status_code=401, detail="Brak aktywnej sesji.")

    try:
        return get_current_operator(db, auth_token)

    except AuthorizationError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get(
    "/draft",
    response_model=AssignmentDraftResponse,
    status_code=status.HTTP_200_OK,
)
def get_assignment_draft_endpoint(
    operator: OperatorORM = Depends(get_current_operator_dependency),
    db: Session = Depends(get_db),
):
    return get_current_assignment_draft(
        db=db,
        operator_id=operator.id,
    )

@router.post(
    "/draft/items",
    response_model=AssignmentDraftResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_assignment_draft_item_endpoint(
    payload: AssignmentDraftItemCreate,
    operator: OperatorORM = Depends(get_current_operator_dependency),
    db: Session = Depends(get_db),
):
    try:
        return add_student_to_assignment_draft(
            db=db,
            operator_id=operator.id,
            payload=payload,
        )

    except AssignmentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except AssignmentConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.delete(
    "/draft/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_assignment_draft_item_endpoint(
    item_id: int = Path(..., gt=0),
    operator: OperatorORM = Depends(get_current_operator_dependency),
    db: Session = Depends(get_db),
):
    try:
        remove_student_from_assignment_draft(
            db=db,
            operator_id=operator.id,
            item_id=item_id,
        )
        return

    except AssignmentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post(
    "/confirm",
    response_model=AssignmentBatchResponse,
    status_code=status.HTTP_201_CREATED,
)
def confirm_assignment_endpoint(
    operator: OperatorORM = Depends(get_current_operator_dependency),
    db: Session = Depends(get_db),
):
    command = ConfirmAssignmentCommand(operator_id=operator.id)

    try:
        return handle_confirm_assignment(
            db=db,
            command=command,
        )

    except AssignmentValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "",
    response_model=list[AssignmentBatchListItemResponse],
    status_code=status.HTTP_200_OK,
)
def list_assignment_batches_endpoint(
    operator: OperatorORM = Depends(get_current_operator_dependency),
    db: Session = Depends(get_db),
):
    return list_assignment_batches(
        db=db,
        operator_id=operator.id,
    )


@router.get(
    "/{batch_id}",
    response_model=AssignmentBatchResponse,
    status_code=status.HTTP_200_OK,
)
def get_assignment_batch_details_endpoint(
    batch_id: int = Path(..., gt=0),
    operator: OperatorORM = Depends(get_current_operator_dependency),
    db: Session = Depends(get_db),
):
    try:
        return get_assignment_batch_details(
            db=db,
            operator_id=operator.id,
            batch_id=batch_id,
        )

    except AssignmentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))