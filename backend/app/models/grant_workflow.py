from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, BigInteger, DateTime, Date, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class GrantWorkflow(Base):
    __tablename__ = "grant_workflows"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False)
    step_name = Column(String(100), nullable=False)  # PROPOSAL, APPROVAL, CONTRACT, DISBURSEMENT_1, PROGRESS_REPORT, FINAL_REPORT, CLOSE
    status = Column(String(50), default="PENDING", index=True)  # PENDING, IN_PROGRESS, COMPLETED, OVERDUE
    due_date = Column(Date, nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remark = Column(Text, nullable=True)

    project = relationship("ResearchProject", back_populates="workflows")

class GrantStatusHistory(Base):
    __tablename__ = "grant_status_history"
    id = Column(BigInteger, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    changed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    remark = Column(Text, nullable=True)

    project = relationship("ResearchProject", back_populates="status_history")

class GrantDocument(Base):
    __tablename__ = "grant_documents"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(50), nullable=False)  # PROPOSAL, CONTRACT, PROGRESS_REPORT, FINAL_REPORT, RECEIPT
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=True)
    version = Column(Integer, default=1)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("ResearchProject", back_populates="documents")
    transactions = relationship("GrantTransaction", back_populates="document")
