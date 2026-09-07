from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Researcher(Base):
    __tablename__ = "researchers"
    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, nullable=True, index=True)
    prefix_title_th = Column(String(50), nullable=True)
    first_name_th = Column(String(100), nullable=False)
    last_name_th = Column(String(100), nullable=False)
    prefix_title_en = Column(String(50), nullable=True)
    first_name_en = Column(String(100), nullable=True)
    last_name_en = Column(String(100), nullable=True)
    academic_position = Column(String(100), nullable=True)  # ศ., รศ., ผศ., อาจารย์
    position_type = Column(String(50), nullable=True)       # ข้าราชการ, พนักงานมหาวิทยาลัย
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    field_id = Column(Integer, ForeignKey("research_fields.id", ondelete="SET NULL"), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    scopus_author_id = Column(String(100), nullable=True, index=True)
    orcid = Column(String(50), nullable=True, index=True)
    google_scholar_id = Column(String(100), nullable=True)
    status = Column(String(30), default="ACTIVE")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="researcher", uselist=False)
    department = relationship("Department", back_populates="researchers")
    field = relationship("ResearchField", back_populates="researchers")
    project_associations = relationship("ProjectResearcher", back_populates="researcher")
    publication_associations = relationship("PublicationAuthor", back_populates="researcher")

    @property
    def full_name_th(self) -> str:
        prefix = f"{self.prefix_title_th} " if self.prefix_title_th else ""
        return f"{prefix}{self.first_name_th} {self.last_name_th}".strip()

    @property
    def full_name_en(self) -> str:
        if not self.first_name_en and not self.last_name_en:
            return ""
        prefix = f"{self.prefix_title_en} " if self.prefix_title_en else ""
        return f"{prefix}{self.first_name_en or ''} {self.last_name_en or ''}".strip()
