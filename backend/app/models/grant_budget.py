from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, BigInteger, DateTime, Date, ForeignKey, Numeric, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class GrantBudget(Base):
    __tablename__ = "grant_budgets"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False)
    budget_category = Column(String(100), nullable=False)  # ค่าตอบแทน, ค่าใช้สอย, ค่าวัสดุ, ค่าครุภัณฑ์
    allocated_amount = Column(Numeric(14, 2), nullable=False)

    project = relationship("ResearchProject", back_populates="budgets")
    transactions = relationship("GrantTransaction", back_populates="budget")

class GrantTransaction(Base):
    __tablename__ = "grant_transactions"
    id = Column(BigInteger, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False)
    budget_id = Column(Integer, ForeignKey("grant_budgets.id", ondelete="SET NULL"), nullable=True)
    transaction_type = Column(String(50), nullable=False)  # DISBURSEMENT, REFUND
    amount = Column(Numeric(14, 2), nullable=False)
    transaction_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    document_id = Column(Integer, ForeignKey("grant_documents.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("ResearchProject", back_populates="transactions")
    budget = relationship("GrantBudget", back_populates="transactions")
    document = relationship("GrantDocument", back_populates="transactions")
