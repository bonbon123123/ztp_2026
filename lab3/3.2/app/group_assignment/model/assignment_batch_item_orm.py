from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.REST.data.database import Base


class AssignmentBatchItemORM(Base):
    __tablename__ = "assignment_batch_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    batch_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assignment_batches.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("students.id", ondelete="RESTRICT"),
        nullable=False,
    )
    student_name: Mapped[str] = mapped_column(String, nullable=False)
    student_lastname: Mapped[str] = mapped_column(String, nullable=False)
    student_code: Mapped[str] = mapped_column(String, nullable=False)
    ects_points: Mapped[int] = mapped_column(Integer, nullable=False)