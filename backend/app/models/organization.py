from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Faculty(Base):
    __tablename__ = "faculties"
    id = Column(Integer, primary_key=True, index=True)
    name_th = Column(String(255), nullable=False)
    name_en = Column(String(255), nullable=True)
    code = Column(String(20), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    departments = relationship("Department", back_populates="faculty")

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id", ondelete="RESTRICT"), nullable=False)
    name_th = Column(String(255), nullable=False)
    name_en = Column(String(255), nullable=True)
    code = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    faculty = relationship("Faculty", back_populates="departments")
    fields = relationship("ResearchField", back_populates="department")
    researchers = relationship("Researcher", back_populates="department")
    projects = relationship("ResearchProject", back_populates="department")
    kpi_targets = relationship("KpiTarget", back_populates="department")

class ResearchField(Base):
    __tablename__ = "research_fields"
    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    name_th = Column(String(255), nullable=False)
    name_en = Column(String(255), nullable=True)

    department = relationship("Department", back_populates="fields")
    researchers = relationship("Researcher", back_populates="field")

class Country(Base):
    __tablename__ = "countries"
    id = Column(Integer, primary_key=True, index=True)
    iso_code = Column(String(3), unique=True, nullable=False, index=True)
    name_th = Column(String(150), nullable=False)
    name_en = Column(String(150), nullable=False)

    publishers = relationship("Publisher", back_populates="country")
    external_authors = relationship("ExternalAuthor", back_populates="country")
    organizations = relationship("Organization", back_populates="country")

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    organization_type = Column(String(50), nullable=False)  # GOVERNMENT, PRIVATE_COMPANY, INDUSTRY, UNIVERSITY, RESEARCH_INSTITUTE
    country_id = Column(Integer, ForeignKey("countries.id", ondelete="SET NULL"), nullable=True)

    country = relationship("Country", back_populates="organizations")
    external_authors = relationship("ExternalAuthor", back_populates="organization")
    publication_links = relationship("PublicationOrganization", back_populates="organization")
