from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.REST.data.database import Base


class AssignmentDraftItemORM(Base):
    __tablename__ = "assignment_draft_items"

    __table_args__ = (
        UniqueConstraint(
            "draft_id",
            "student_id",
            name="uq_assignment_draft_student",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    draft_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("assignment_drafts.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now,
    )

    student = relationship("StudentORM", lazy="joined")