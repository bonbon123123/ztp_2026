from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.REST.data.database import Base


class AssignmentBatchORM(Base):
    __tablename__ = "assignment_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    operator_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("operators.id", ondelete="CASCADE"),
        nullable=False,
    )
    assignment_number: Mapped[str] = mapped_column(
        String,
        nullable=False,
        unique=True,
    )
    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="PENDING",
    )
    students_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    total_ects: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now,
    )

    items = relationship(
        "AssignmentBatchItemORM",
        cascade="all, delete-orphan",
        lazy="selectin",
    )