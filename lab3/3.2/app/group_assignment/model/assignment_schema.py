from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AssignmentDraftItemCreate(BaseModel):
    student_id: int

class AssignmentDraftStudentResponse(BaseModel):
    id: int
    name: str
    lastname: str
    student_code: str
    email: str
    ects_points: int

    model_config = ConfigDict(from_attributes=True)

class AssignmentDraftItemResponse(BaseModel):
    id: int
    student: AssignmentDraftStudentResponse
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssignmentDraftResponse(BaseModel):
    id: int
    operator_id: int
    items: list[AssignmentDraftItemResponse]
    students_count: int
    total_ects: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssignmentBatchItemResponse(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_lastname: str
    student_code: str
    ects_points: int
    model_config = ConfigDict(from_attributes=True)

class AssignmentBatchResponse(BaseModel):
    id: int
    operator_id: int
    assignment_number: str
    status: str
    students_count: int
    total_ects: int
    created_at: datetime
    items: list[AssignmentBatchItemResponse]
    model_config = ConfigDict(from_attributes=True)

class AssignmentBatchListItemResponse(BaseModel):
    id: int
    assignment_number: str
    status: str
    students_count: int
    total_ects: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)