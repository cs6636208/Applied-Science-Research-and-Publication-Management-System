"""Database configuration and utilities"""
import logging
import os
from contextlib import contextmanager
from urllib.parse import urlparse

from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

logger = logging.getLogger(__name__)

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:admin@127.0.0.1:5432/kmutnb_db",
)


def parse_db_url(url):
    """Parse PostgreSQL connection URL into components"""
    parsed = urlparse(url)
    return {
        "user": parsed.username or "postgres",
        "password": parsed.password or "",
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/") or "kmutnb_db",
    }


DB_CONFIG = parse_db_url(DATABASE_URL)
ADMIN_DB_URL = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/postgres"

# ============================================================================
# SQL SCHEMA DEFINITIONS
# ============================================================================

# 1. Faculties Table
CREATE_FACULTIES_TABLE = """
    CREATE TABLE IF NOT EXISTS faculties (
        id SERIAL PRIMARY KEY,
        name_th VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
"""

# 2. Researchers Table
CREATE_RESEARCHERS_TABLE = """
    CREATE TABLE IF NOT EXISTS researchers (
        id SERIAL PRIMARY KEY,
        faculty_id INT REFERENCES faculties(id) ON DELETE SET NULL,
        prefix_title VARCHAR(50),
        full_name_th VARCHAR(255) NOT NULL,
        full_name_en VARCHAR(255),
        academic_position VARCHAR(100),
        position_type VARCHAR(50),
        is_internal BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
"""

# 3. Journals Table
CREATE_JOURNALS_TABLE = """
    CREATE TABLE IF NOT EXISTS journals (
        id SERIAL PRIMARY KEY,
        journal_name VARCHAR(500) NOT NULL,
        issn VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
"""

# 4. Publications Table
CREATE_PUBLICATIONS_TABLE = """
    CREATE TABLE IF NOT EXISTS publications (
        id SERIAL PRIMARY KEY,
        title_th TEXT,
        title_en TEXT NOT NULL,
        publication_type VARCHAR(100) DEFAULT 'Article',
        related_project TEXT,
        is_student_graduation CHAR(1) DEFAULT 'N',
        journal_id INT REFERENCES journals(id) ON DELETE SET NULL,
        volume VARCHAR(50),
        issue_number VARCHAR(50),
        page_range VARCHAR(100),
        doi VARCHAR(255),
        scopus_id VARCHAR(100),
        external_url TEXT,
        database_source VARCHAR(255),
        quartile VARCHAR(20),
        percentile NUMERIC(5, 2),
        accepted_date DATE,
        online_first_date DATE,
        published_date DATE,
        status VARCHAR(50) DEFAULT 'Active',
        lead_researcher_id INT REFERENCES researchers(id) ON DELETE SET NULL,
        created_by INT REFERENCES researchers(id) ON DELETE SET NULL,
        updated_by INT REFERENCES researchers(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
"""

# 5. Publication Authors Junction Table
CREATE_PUBLICATION_AUTHORS_TABLE = """
    CREATE TABLE IF NOT EXISTS publication_authors (
        id SERIAL PRIMARY KEY,
        publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
        researcher_id INT NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
        author_role VARCHAR(100),
        author_order INT DEFAULT 1
    );
"""

# 6. SDG Goals Table
CREATE_SDG_GOALS_TABLE = """
    CREATE TABLE IF NOT EXISTS sdg_goals (
        id SERIAL PRIMARY KEY,
        sdg_code VARCHAR(10) UNIQUE,
        description_th TEXT
    );
"""

# 7. Publication SDGs Junction Table
CREATE_PUBLICATION_SDGS_TABLE = """
    CREATE TABLE IF NOT EXISTS publication_sdgs (
        publication_id INT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
        sdg_id INT NOT NULL REFERENCES sdg_goals(id) ON DELETE CASCADE,
        PRIMARY KEY (publication_id, sdg_id)
    );
"""

# Legacy table (kept for backward compatibility)
CREATE_ACADEMIC_PAPERS_TABLE = """
    CREATE TABLE IF NOT EXISTS academic_papers (
        id SERIAL PRIMARY KEY,
        paper_id TEXT,
        title TEXT,
        authors TEXT,
        publication_year INTEGER,
        journal TEXT,
        volume TEXT,
        issue TEXT,
        pages TEXT,
        keywords TEXT,
        abstract TEXT,
        doi TEXT,
        url TEXT,
        source_file TEXT,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
    );
"""

# ============================================================================
# CONNECTION MANAGEMENT
# ============================================================================


@contextmanager
def get_db_connection(database_url=DATABASE_URL):
    """Context manager for database connections with error handling"""
    conn = None
    try:
        conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
        yield conn
    except psycopg2.OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        raise
    finally:
        if conn:
            conn.close()


# ============================================================================
# DATABASE INITIALIZATION
# ============================================================================


def create_database_if_not_exists():
    """Create the kmutnb_db database if it doesn't exist"""
    try:
        with get_db_connection(ADMIN_DB_URL) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # Check if database exists
                cur.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s",
                    (DB_CONFIG["database"],)
                )
                if not cur.fetchone():
                    logger.info(f"Creating database: {DB_CONFIG['database']}")
                    cur.execute(f"CREATE DATABASE {DB_CONFIG['database']};")
                    logger.info(f"✓ Database '{DB_CONFIG['database']}' created successfully")
                else:
                    logger.info(f"✓ Database '{DB_CONFIG['database']}' already exists")
    except Exception as e:
        logger.error(f"Failed to create database: {e}")
        raise


CREATE_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_publications_journal_id ON publications(journal_id);",
    "CREATE INDEX IF NOT EXISTS idx_publications_quartile ON publications(quartile);",
    "CREATE INDEX IF NOT EXISTS idx_publications_published_date ON publications(published_date);",
    "CREATE INDEX IF NOT EXISTS idx_publication_authors_pub_id ON publication_authors(publication_id);",
    "CREATE INDEX IF NOT EXISTS idx_publication_authors_res_id ON publication_authors(researcher_id);",
    "CREATE INDEX IF NOT EXISTS idx_publication_sdgs_pub_id ON publication_sdgs(publication_id);",
    "CREATE INDEX IF NOT EXISTS idx_publication_sdgs_sdg_id ON publication_sdgs(sdg_id);",
    "CREATE INDEX IF NOT EXISTS idx_researchers_faculty_id ON researchers(faculty_id);",
]

def create_tables():
    """Create all required tables and indexes"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Create tables in order (considering foreign keys)
                tables = [
                    ("faculties", CREATE_FACULTIES_TABLE),
                    ("researchers", CREATE_RESEARCHERS_TABLE),
                    ("journals", CREATE_JOURNALS_TABLE),
                    ("publications", CREATE_PUBLICATIONS_TABLE),
                    ("publication_authors", CREATE_PUBLICATION_AUTHORS_TABLE),
                    ("sdg_goals", CREATE_SDG_GOALS_TABLE),
                    ("publication_sdgs", CREATE_PUBLICATION_SDGS_TABLE),
                    ("academic_papers", CREATE_ACADEMIC_PAPERS_TABLE),  # Legacy table
                ]
                
                for table_name, create_sql in tables:
                    try:
                        cur.execute(create_sql)
                        logger.info(f"✓ Table '{table_name}' ensured")
                    except psycopg2.Error as e:
                        logger.warning(f"Could not create table '{table_name}': {e}")

                for index_sql in CREATE_INDEXES:
                    try:
                        cur.execute(index_sql)
                    except psycopg2.Error as e:
                        logger.warning(f"Could not create index: {e}")
                
                conn.commit()
                logger.info("✓ All tables and indexes created successfully")
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        raise


def insert_sdg_goals():
    """Insert default SDG goals if they don't exist"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) as count FROM sdg_goals")
                result = cur.fetchone()
                
                if result and result["count"] == 0:
                    logger.info("Inserting default SDG goals...")
                    sdg_data = [
                        ("SDG-1", "ขจัดความยากจน (No Poverty)"),
                        ("SDG-2", "ยุติความหิวโหย (Zero Hunger)"),
                        ("SDG-3", "สุขภาพและความเป็นอยู่ที่ดี (Good Health and Well-being)"),
                        ("SDG-4", "การศึกษาที่มีคุณภาพ (Quality Education)"),
                        ("SDG-5", "ความเท่าเทียมทางเพศ (Gender Equality)"),
                        ("SDG-6", "น้ำสะอาดและสุขาภิบาล (Clean Water and Sanitation)"),
                        ("SDG-7", "พลังงานสะอาดที่ทุกคนเข้าถึงได้ (Affordable and Clean Energy)"),
                        ("SDG-8", "งานที่มีคุณค่าและการเติบโตทางเศรษฐกิจ (Decent Work and Economic Growth)"),
                        ("SDG-9", "อุตสาหกรรม นวัตกรรม และโครงสร้างพื้นฐาน (Industry, Innovation, and Infrastructure)"),
                        ("SDG-10", "ลดความเหลื่อมล้ำ (Reduced Inequalities)"),
                        ("SDG-11", "เมืองและชุมชนที่ยั่งยืน (Sustainable Cities and Communities)"),
                        ("SDG-12", "การบริโภคและการผลิตที่ยั่งยืน (Responsible Consumption and Production)"),
                        ("SDG-13", "การรับมือการเปลี่ยนแปลงสภาพภูมิอากาศ (Climate Action)"),
                        ("SDG-14", "ทรัพยากรทางทะเล (Life Below Water)"),
                        ("SDG-15", "ระบบนิเวศบนบก (Life on Land)"),
                        ("SDG-16", "สันติภาพ ความยุติธรรม และสถาบันที่เข้มแข็ง (Peace, Justice and Strong Institutions)"),
                        ("SDG-17", "ความร่วมมือเพื่อการพัฒนาที่ยั่งยืน (Partnerships for the Goals)"),
                    ]
                    
                    for sdg_code, desc_th in sdg_data:
                        cur.execute(
                            "INSERT INTO sdg_goals (sdg_code, description_th) VALUES (%s, %s)",
                            (sdg_code, desc_th)
                        )
                    
                    conn.commit()
                    logger.info(f"✓ Inserted {len(sdg_data)} SDG goals")
                else:
                    logger.info("✓ SDG goals already exist")
    except Exception as e:
        logger.warning(f"Could not insert SDG goals: {e}")


def reset_database():
    """Drop and recreate the entire database (for development/testing)"""
    try:
        logger.warning("Resetting database...")
        
        # Connect to admin database to drop kmutnb_db
        with get_db_connection(ADMIN_DB_URL) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # Terminate existing connections
                cur.execute(f"""
                    SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = '{DB_CONFIG["database"]}'
                    AND pid <> pg_backend_pid();
                """)
                
                # Drop database
                cur.execute(f"DROP DATABASE IF EXISTS {DB_CONFIG['database']};")
                logger.info(f"✓ Dropped database '{DB_CONFIG['database']}'")
        
        # Now initialize fresh
        initialize_database()
        logger.warning("✓ Database reset complete - all data removed and schema recreated")
    except Exception as e:
        logger.error(f"Failed to reset database: {e}")
        raise


def initialize_database():
    """Initialize database: create DB if needed, then create tables"""
    try:
        logger.info("Initializing database...")
        create_database_if_not_exists()
        create_tables()
        insert_sdg_goals()
        logger.info("✓ Database initialization complete")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
