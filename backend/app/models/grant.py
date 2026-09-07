from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Numeric, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class GrantType(Base):
    __tablename__ = "grant_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)  # INTERNAL, EXTERNAL
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    projects = relationship("ResearchProject", back_populates="grant_type")

class ResearchProject(Base):
    __tablename__ = "research_projects"
    id = Column(Integer, primary_key=True, index=True)
    project_code = Column(String(100), unique=True, nullable=False, index=True)
    project_title_th = Column(Text, nullable=False)
    project_title_en = Column(Text, nullable=True)
    grant_type_id = Column(Integer, ForeignKey("grant_types.id", ondelete="RESTRICT"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    fiscal_year = Column(Integer, nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    requested_budget = Column(Numeric(14, 2), default=0.00)
    approved_budget = Column(Numeric(14, 2), default=0.00)
    used_budget = Column(Numeric(14, 2), default=0.00)
    current_status = Column(String(50), default="PROPOSAL", index=True)  # PROPOSAL, APPROVED, CONTRACT, DISBURSEMENT, PROGRESS_REPORT, FINAL_REPORT, CLOSED, TERMINATED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    grant_type = relationship("GrantType", back_populates="projects")
    department = relationship("Department", back_populates="projects")
    researchers = relationship("ProjectResearcher", back_populates="project", cascade="all, delete-orphan")
    workflows = relationship("GrantWorkflow", back_populates="project", cascade="all, delete-orphan")
    status_history = relationship("GrantStatusHistory", back_populates="project", cascade="all, delete-orphan")
    documents = relationship("GrantDocument", back_populates="project", cascade="all, delete-orphan")
    budgets = relationship("GrantBudget", back_populates="project", cascade="all, delete-orphan")
    transactions = relationship("GrantTransaction", back_populates="project", cascade="all, delete-orphan")
    publication_links = relationship("ProjectPublication", back_populates="project", cascade="all, delete-orphan")

    @property
    def remaining_budget(self) -> float:
        return float((self.approved_budget or 0) - (self.used_budget or 0))

class ProjectResearcher(Base):
    __tablename__ = "project_researchers"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("research_projects.id", ondelete="CASCADE"), nullable=False)
    researcher_id = Column(Integer, ForeignKey("researchers.id", ondelete="RESTRICT"), nullable=False)
    role = Column(String(100), nullable=False)  # หัวหน้าโครงการ (PI), ผู้ร่วมวิจัย (Co-PI), ที่ปรึกษา
    is_principal_investigator = Column(Boolean, default=False)
    work_percentage = Column(Numeric(5, 2), nullable=True)

    project = relationship("ResearchProject", back_populates="researchers")
    researcher = relationship("Researcher", back_populates="project_associations")
