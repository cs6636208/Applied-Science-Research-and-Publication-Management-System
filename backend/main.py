"""Main Flask application for KMUTNB Research Publication Management System"""
import datetime
import logging
import os
import re
import tempfile
from contextlib import contextmanager

from io import BytesIO
import pandas as pd
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from database import initialize_database, get_db_connection, DATABASE_URL

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# APP CONFIGURATION
# ============================================================================

def resolve_upload_folder():
    """Resolve upload folder from config or defaults"""
    candidates = []
    configured = os.getenv("UPLOAD_FOLDER")
    if configured:
        candidates.append(configured)
    candidates.extend([
        os.path.join(os.path.expanduser("~"), "kmutnb_uploads"),
        os.path.join(os.getcwd(), "uploads"),
        os.path.join(tempfile.gettempdir(), "kmutnb_uploads"),
    ])

    for candidate in candidates:
        try:
            os.makedirs(candidate, exist_ok=True)
            logger.info(f"Upload folder: {candidate}")
            return candidate
        except OSError:
            continue

    return os.path.join(tempfile.gettempdir(), "kmutnb_uploads")


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
app.config["UPLOAD_FOLDER"] = resolve_upload_folder()

# ============================================================================
# DATA SCHEMA & ALIASES
# ============================================================================

TABLE_COLUMNS = [
    "paper_id",
    "title",
    "authors",
    "publication_year",
    "journal",
    "volume",
    "issue",
    "pages",
    "keywords",
    "abstract",
    "doi",
    "url",
    "source_file",
]

COLUMN_ALIASES = {
    "paper_id": {"paper_id", "id", "paperid", "publication_id", "record_id", "ลำดับ", "ลำดับที่", "ที่"},
    "title": {
        "title", "paper_title", "article_title", "name", "title_th", "title_en", 
        "ชื่อบทความ", "ชื่อผลงาน", "ชื่อเรื่อง", "ชื่อบทความ_english", "ชื่อบทความ_ไทย", 
        "ชื่อบทความ_en", "ชื่อบทความ_th", "title_english", "title_thai", "document_title",
        "ชื่อบทความ_ภาษาไทย", "ชื่อบทความประชุมวิชาการ_ภาษาไทย", "ชื่อบทความประชุมวิชาการ_english"
    },
    "title_th": {"title_th", "ชื่อบทความ_ไทย", "ชื่อเรื่อง_ไทย", "ชื่อผลงาน_ไทย", "ชื่อบทความ_ภาษาไทย"},
    "title_en": {"title_en", "ชื่อบทความ_english", "ชื่อเรื่อง_english", "ชื่อผลงาน_english", "title_english"},
    "authors": {
        "authors", "author", "authors_name", "writer", "ผู้แต่ง", "ผู้วิจัย", 
        "รายชื่อผู้แต่ง", "คณะผู้วิจัย", "ทีมนักวิจัย", "นักวิจัย", "รายชื่อนักวิจัย"
    },
    "internal_researchers": {"นักวิจัยภายใน", "internal_researchers"},
    "external_researchers": {"นักวิจัยภายนอก", "external_researchers"},
    "lead_researcher": {"หัวหน้าทีม_เจ้าของผลงาน", "หัวหน้าทีม", "เจ้าของผลงาน", "lead_researcher", "first_author"},
    "prefix_title": {"คำนำหน้าชื่อ", "คำนำหน้า", "prefix", "prefix_title"},
    "publication_year": {"publication_year", "year", "pub_year", "published_year", "ปี", "ปีที่ตีพิมพ์", "ปีพ_ศ", "ปีค_ศ", "ปีพศ", "ปีคศ"},
    "published_date": {"published_date", "date", "วันที่ตีพิมพ์", "publication_date", "publish_date", "accepted_data", "online_first_date"},
    "journal": {
        "journal", "journal_name", "source", "publication_name", "ชื่อวารสาร", 
        "วารสาร", "แหล่งตีพิมพ์", "ชื่อ_หนังสือ_ที่พิมพ์", "ชื่อ_วารสาร_ที่พิมพ์",
        "วารสาร_หนังสือ_ที่ตีพิมพ์", "วารสาร_หนังสือ_ที่พิมพ์", "เอกสารการประชุม"
    },
    "issn": {"issn", "eissn", "issn_no", "issn_online"},
    "volume": {"volume", "vol", "เล่มที่", "ปีที่_volume", "เล่มที่_volume", "ปีที่_vol", "ปีที่"},
    "issue": {"issue", "number", "issue_number", "ฉบับที่", "ฉบับที่_number"},
    "pages": {"pages", "page_range", "page", "หน้า", "หน้าที่พิมพ์", "เลขหน้า", "หน้าที่ตีพิมพ์"},
    "keywords": {"keywords", "tags", "keyword", "คำสำคัญ"},
    "abstract": {"abstract", "summary", "description", "บทคัดย่อ"},
    "doi": {"doi", "digital_object_identifier", "doi_number", "เลข_doi", "รหัส_doi"},
    "url": {"url", "link", "website", "source_url", "external_url"},
    "scopus_id": {"scopus_id", "scopus", "eid", "scopus_eid"},
    "quartile": {"quartile", "q", "sjr_quartile", "wos_quartile", "ควอไทล์", "tier", "quartile_tier"},
    "percentile": {"percentile", "percentile_rank", "เปอร์เซ็นไทล์"},
    "sdg": {"sdg", "sdg_goals", "sdgs", "sdg_goal", "เป้าหมาย_sdg", "เป้าหมายsdg", "sdg_code"},
    "publication_type": {"publication_type", "type", "doc_type", "ประเภทผลงาน", "document_type", "รูปแบบ", "ประเภทบทความวารสาร"},
    "faculty": {"faculty", "department", "faculty_name", "คณะ", "ภาควิชา", "หน่วยงาน", "สังกัด", "คณะ_สถานที่ทำงาน"},
    "source_file": {"source_file"},
}


# ============================================================================
# HELPER FUNCTIONS FOR EXTRACTION & NORMALIZATION
# ============================================================================

def normalize_column_name(col_name):
    """Normalize column name to match schema canonical key"""
    text = str(col_name).strip().lower()
    cleaned = re.sub(r"[^a-z0-9_\u0E00-\u0E7F]+", "_", text).strip("_")
    
    # 1. Exact or cleaned alias match
    for canonical, aliases in COLUMN_ALIASES.items():
        if cleaned in aliases or cleaned == canonical or text in aliases or text == canonical:
            return canonical
            
    # 2. Heuristic containment matching
    if "ชื่อบทความ" in text or "article" in text or ("title" in text and "journal" not in text):
        if "eng" in text:
            return "title_en"
        if "ไทย" in text or "th" in text:
            return "title_th"
        return "title"
    if "ทีมนักวิจัย" in text or "ผู้แต่ง" in text or "ผู้วิจัย" in text or "author" in text:
        if "ภายใน" in text:
            return "internal_researchers"
        if "ภายนอก" in text:
            return "external_researchers"
        if "หัวหน้า" in text:
            return "lead_researcher"
        return "authors"
    if "วารสาร" in text or "หนังสือ_ที่พิมพ์" in text or "journal" in text or "ประชุม" in text:
        return "journal"
    if "quartile" in text or "ควอไทล์" in text:
        return "quartile"
    if "percentile" in text or "เปอร์เซ็น" in text:
        return "percentile"
    if "sdg" in text:
        return "sdg"
    if "volume" in text or "เล่มที่" in text or "ปีที่" in text:
        return "volume"
    if "issue" in text or "ฉบับที่" in text:
        return "issue"
    if "page" in text or "หน้า" in text:
        return "pages"
    if "doi" in text:
        return "doi"
    if "คำนำหน้า" in text:
        return "prefix_title"

    return cleaned


def normalize_dataframe(df):
    """Normalize dataframe to match schema columns safely"""
    renamed = {}
    seen_targets = set()
    for raw_col in df.columns:
        normalized = normalize_column_name(raw_col)
        # Avoid creating duplicate identical column names
        if normalized in seen_targets:
            renamed[raw_col] = f"{normalized}_{raw_col}"
        else:
            renamed[raw_col] = normalized
            seen_targets.add(normalized)
            
    df = df.rename(columns=renamed)
    
    # Ensure 'title' column exists
    if "title" not in df.columns:
        if "title_en" in df.columns:
            df["title"] = df["title_en"]
        elif "title_th" in df.columns:
            df["title"] = df["title_th"]
        else:
            for col in df.columns:
                if "title" in str(col).lower() or "ชื่อ" in str(col):
                    df["title"] = df[col]
                    break

    # Ensure 'authors' column exists and is populated
    if "authors" not in df.columns or df["authors"].isna().all():
        author_cols = []
        for c in ["authors", "internal_researchers", "lead_researcher", "external_researchers"]:
            if c in df.columns and not df[c].isna().all():
                author_cols.append(c)
                
        if author_cols:
            def combine_authors(row):
                vals = []
                for c in author_cols:
                    v = clean_str(row.get(c))
                    if v and v not in vals:
                        vals.append(v)
                return ", ".join(vals) if vals else None
                
            df["authors"] = df.apply(combine_authors, axis=1)
                    
    return df


def clean_str(val):
    """Clean string values safely"""
    if pd.isna(val) or val is None:
        return None
    val_str = str(val).strip()
    return val_str if val_str and val_str.lower() != "nan" else None


def normalize_quartile(q_val):
    """Normalize quartile to 'Q1', 'Q2', 'Q3', 'Q4' or None"""
    if not q_val:
        return None
    q_str = str(q_val).strip().upper()
    match = re.search(r"(?:QUARTILE|TIER|ควอไทล์|Q)?\s*([1-4])", q_str)
    if match:
        return f"Q{match.group(1)}"
    return None


def parse_sdg_tags(sdg_val):
    """Parse SDG goals from text, e.g. 'SDG 3, 7', 'SDG-3', '3, 7, 11', 'SDG3'"""
    if not sdg_val:
        return []
    sdg_str = str(sdg_val).strip()
    # Find all numbers that are between 1 and 17
    numbers = re.findall(r"(?:SDG[-\s]*)?(\b[1-9]\b|\b1[0-7]\b)", sdg_str, re.IGNORECASE)
    sdg_codes = []
    for num in set(numbers):
        try:
            val = int(num)
            if 1 <= val <= 17:
                sdg_codes.append(f"SDG-{val}")
        except ValueError:
            pass
    return sorted(sdg_codes)


def split_authors(authors_str):
    """Split author names from comma, semicolon, newline, or 'and' separated string"""
    if not authors_str:
        return []
    raw = str(authors_str).strip()
    # Replace separators
    raw = raw.replace(";", ",").replace("\n", ",")
    # Split by ' and ' if it separates authors
    parts = re.split(r",|\s+and\s+", raw)
    results = []
    prefix_patterns = r"^(ผศ\.ดร\.|รศ\.ดร\.|ศ\.ดร\.|อ\.ดร\.|ดร\.|ผศ\.|รศ\.|ศ\.|อาจารย์|Assoc\.?\s*Prof\.?\s*Dr\.?|Asst\.?\s*Prof\.?\s*Dr\.?|Prof\.?\s*Dr\.?|Dr\.?|Prof\.?|Assoc\.?\s*Prof\.?|Asst\.?\s*Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s*"

    for p in parts:
        cleaned = p.strip()
        if not cleaned or len(cleaned) < 2:
            continue
        # Extract title prefix if present
        match = re.match(prefix_patterns, cleaned, re.IGNORECASE)
        prefix = ""
        name = cleaned
        if match:
            prefix = match.group(0).strip()
            name = cleaned[match.end():].strip()
        
        # Decide if Thai or English
        has_thai = bool(re.search(r"[\u0E00-\u0E7F]", name))
        results.append({
            "prefix": prefix,
            "name": name,
            "full_name_th": name if has_thai else "",
            "full_name_en": name if not has_thai else "",
            "raw_name": cleaned,
            "is_internal": True if has_thai else False
        })
    return results


def parse_uploaded_file(file_path, file_name):
    """Parse Excel file and return normalized dataframe"""
    try:
        xl = pd.ExcelFile(file_path)
    except Exception as e:
        raise ValueError(f"ไม่สามารถอ่านไฟล์ Excel: {e}")
    
    frames = []
    for sheet_name in xl.sheet_names:
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            if df.empty:
                continue
            cleaned = normalize_dataframe(df)
            cleaned["source_file"] = file_name
            frames.append(cleaned)
        except Exception as e:
            logger.warning(f"Error processing sheet '{sheet_name}': {e}")
            continue

    if not frames:
        raise ValueError("ไม่พบข้อมูลในไฟล์ Excel")

    combined = pd.concat(frames, ignore_index=True)
    if "title" in combined.columns and "authors" in combined.columns:
        combined = combined.drop_duplicates(subset=["title", "authors"], keep="first")
    
    if combined.empty:
        raise ValueError("หลังลบรายการซ้ำแล้วไม่มีข้อมูล")
    
    logger.info(f"Parsed {len(combined)} records from {file_name}")
    return combined


# ============================================================================
# RELATIONAL INGESTION LOGIC
# ============================================================================

def ingest_dataframe_to_db(df):
    """Ingest parsed DataFrame into relational tables and legacy table"""
    stats = {
        "inserted_publications": 0,
        "inserted_researchers": 0,
        "inserted_journals": 0,
        "inserted_authors_links": 0,
        "inserted_sdgs": 0,
    }

    with get_db_connection(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Preload existing journals and researchers for fast in-memory lookup
            cur.execute("SELECT id, LOWER(journal_name) as j_name FROM journals;")
            journal_map = {row["j_name"]: row["id"] for row in cur.fetchall()}

            cur.execute("SELECT id, LOWER(full_name_th) as name_th, LOWER(full_name_en) as name_en FROM researchers;")
            researcher_map = {}
            for row in cur.fetchall():
                if row["name_th"]:
                    researcher_map[row["name_th"]] = row["id"]
                if row["name_en"]:
                    researcher_map[row["name_en"]] = row["id"]

            cur.execute("SELECT id, sdg_code FROM sdg_goals;")
            sdg_map = {row["sdg_code"]: row["id"] for row in cur.fetchall()}

            for _, row in df.iterrows():
                title = clean_str(row.get("title"))
                if not title:
                    continue

                # 1. Handle Journal
                journal_name = clean_str(row.get("journal"))
                issn = clean_str(row.get("issn"))
                journal_id = None
                if journal_name:
                    j_key = journal_name.strip().lower()
                    if j_key in journal_map:
                        journal_id = journal_map[j_key]
                    else:
                        cur.execute(
                            "INSERT INTO journals (journal_name, issn) VALUES (%s, %s) RETURNING id;",
                            (journal_name.strip(), issn)
                        )
                        journal_id = cur.fetchone()["id"]
                        journal_map[j_key] = journal_id
                        stats["inserted_journals"] += 1

                # 2. Parse Publication metadata
                quartile = normalize_quartile(row.get("quartile"))
                percentile = None
                if "percentile" in row and pd.notna(row.get("percentile")):
                    try:
                        p_clean = str(row.get("percentile")).replace("%", "").strip()
                        percentile = float(p_clean)
                    except ValueError:
                        pass

                volume = clean_str(row.get("volume"))
                issue = clean_str(row.get("issue"))
                pages = clean_str(row.get("pages"))
                doi = clean_str(row.get("doi"))
                url = clean_str(row.get("url"))
                scopus_id = clean_str(row.get("scopus_id"))
                pub_type = clean_str(row.get("publication_type")) or "Article"
                
                # Determine published_date or year
                published_date = None
                pub_year = row.get("publication_year")
                if pd.notna(pub_year):
                    try:
                        y = int(pub_year)
                        if y > 2400:  # Convert BE to CE
                            y -= 543
                        if 1900 <= y <= 2100:
                            published_date = datetime.date(y, 1, 1)
                    except (ValueError, TypeError):
                        pass

                # Detect Thai vs English in title
                has_thai_title = bool(re.search(r"[\u0E00-\u0E7F]", title))
                title_th = title if has_thai_title else None
                title_en = title if not has_thai_title else clean_str(row.get("title_en")) or title

                # Insert Publication
                cur.execute("""
                    INSERT INTO publications 
                    (title_th, title_en, publication_type, journal_id, volume, issue_number, 
                     page_range, doi, scopus_id, external_url, quartile, percentile, 
                     published_date, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active')
                    RETURNING id;
                """, (
                    title_th, title_en, pub_type, journal_id, volume, issue,
                    pages, doi, scopus_id, url, quartile, percentile, published_date
                ))
                pub_id = cur.fetchone()["id"]
                stats["inserted_publications"] += 1

                # 3. Handle Authors
                authors_raw = clean_str(row.get("authors"))
                parsed_authors = split_authors(authors_raw)
                lead_researcher_id = None

                for order_idx, auth in enumerate(parsed_authors, start=1):
                    auth_name = auth["name"]
                    auth_key = auth_name.strip().lower()
                    res_id = None

                    if auth_key in researcher_map:
                        res_id = researcher_map[auth_key]
                    else:
                        cur.execute("""
                            INSERT INTO researchers 
                            (prefix_title, full_name_th, full_name_en, is_internal)
                            VALUES (%s, %s, %s, %s) RETURNING id;
                        """, (
                            auth["prefix"],
                            auth["full_name_th"] or auth_name,
                            auth["full_name_en"],
                            auth["is_internal"]
                        ))
                        res_id = cur.fetchone()["id"]
                        researcher_map[auth_key] = res_id
                        stats["inserted_researchers"] += 1

                    if order_idx == 1:
                        lead_researcher_id = res_id

                    role = "First Author" if order_idx == 1 else ("Corresponding Author" if order_idx == len(parsed_authors) else "Co-Author")

                    cur.execute("""
                        INSERT INTO publication_authors (publication_id, researcher_id, author_role, author_order)
                        VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING;
                    """, (pub_id, res_id, role, order_idx))
                    stats["inserted_authors_links"] += 1

                # Update lead_researcher_id on publication
                if lead_researcher_id:
                    cur.execute(
                        "UPDATE publications SET lead_researcher_id = %s WHERE id = %s;",
                        (lead_researcher_id, pub_id)
                    )

                # 4. Handle SDG Goals
                sdg_raw = row.get("sdg")
                sdg_codes = parse_sdg_tags(sdg_raw)
                for code in sdg_codes:
                    if code in sdg_map:
                        sdg_id = sdg_map[code]
                        cur.execute("""
                            INSERT INTO publication_sdgs (publication_id, sdg_id)
                            VALUES (%s, %s) ON CONFLICT DO NOTHING;
                        """, (pub_id, sdg_id))
                        stats["inserted_sdgs"] += 1

                # 5. Insert into legacy academic_papers table for compatibility
                try:
                    cur.execute("""
                        INSERT INTO academic_papers 
                        (paper_id, title, authors, publication_year, journal, 
                         volume, issue, pages, keywords, abstract, doi, url, source_file)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """, (
                        clean_str(row.get("paper_id")),
                        title,
                        authors_raw,
                        pub_year if pd.notna(pub_year) else None,
                        journal_name,
                        volume,
                        issue,
                        pages,
                        clean_str(row.get("keywords")),
                        clean_str(row.get("abstract")),
                        doi,
                        url,
                        clean_str(row.get("source_file"))
                    ))
                except Exception as leg_err:
                    logger.warning(f"Legacy insert warning: {leg_err}")

            conn.commit()
            logger.info(f"✓ Ingested successfully: {stats}")
            return stats


# ============================================================================
# API ENDPOINTS & CATALOG
# ============================================================================

@app.route("/api", methods=["GET"])
def api_index():
    """API catalog and documentation"""
    return jsonify({
        "name": "KMUTNB Applied Science Research Publication Management API",
        "version": "2.0.0",
        "status": "online",
        "endpoints": [
            {"path": "/api/health", "methods": ["GET"], "description": "System health check"},
            {"path": "/api/stats", "methods": ["GET"], "description": "Dashboard KPI summary statistics"},
            {"path": "/api/publications", "methods": ["GET", "POST"], "description": "List or create publications"},
            {"path": "/api/publications/<id>", "methods": ["GET", "PUT", "DELETE"], "description": "Get, update, or delete publication"},
            {"path": "/api/publications/export", "methods": ["GET"], "description": "Export publications to Excel (.xlsx) or CSV"},
            {"path": "/api/upload", "methods": ["POST"], "description": "Upload and ingest Excel publication dataset"},
            {"path": "/api/researchers", "methods": ["GET", "POST"], "description": "List or create researchers"},
            {"path": "/api/researchers/<id>", "methods": ["GET", "PUT", "DELETE"], "description": "Get researcher profile, update, or delete"},
            {"path": "/api/faculties", "methods": ["GET"], "description": "List faculties"},
            {"path": "/api/journals", "methods": ["GET"], "description": "List journals"},
            {"path": "/api/sdg-goals", "methods": ["GET"], "description": "List SDG goals"}
        ]
    })


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "KMUTNB Research API is running"})


# ============================================================================
# RELATIONAL SYNC HELPERS (FOR CRUD APIS)
# ============================================================================

def upsert_journal_by_name(cur, journal_name, issn=None):
    """Find existing journal by name or insert new one"""
    if not journal_name:
        return None
    j_clean = journal_name.strip()
    cur.execute("SELECT id, issn FROM journals WHERE LOWER(journal_name) = LOWER(%s) LIMIT 1;", (j_clean,))
    existing = cur.fetchone()
    if existing:
        if issn and not existing.get("issn"):
            cur.execute("UPDATE journals SET issn = %s WHERE id = %s;", (issn.strip(), existing["id"]))
        return existing["id"]

    cur.execute(
        "INSERT INTO journals (journal_name, issn) VALUES (%s, %s) RETURNING id;",
        (j_clean, issn.strip() if issn else None)
    )
    return cur.fetchone()["id"]


def sync_publication_authors(cur, pub_id, authors_list):
    """
    Synchronize authors for a publication.
    authors_list can be:
    1) list of dicts: [{'researcher_id': 1, 'author_role': 'First Author', 'author_order': 1}, ...]
    2) comma-separated string of names
    Returns lead_researcher_id
    """
    cur.execute("DELETE FROM publication_authors WHERE publication_id = %s;", (pub_id,))
    if not authors_list:
        return None

    items = []
    if isinstance(authors_list, str):
        parsed = split_authors(authors_list)
        for idx, a in enumerate(parsed, start=1):
            items.append({
                "prefix_title": a.get("prefix"),
                "full_name_th": a.get("full_name_th") or a.get("name"),
                "full_name_en": a.get("full_name_en"),
                "is_internal": a.get("is_internal", True),
                "author_role": "First Author" if idx == 1 else "Co-Author",
                "author_order": idx
            })
    elif isinstance(authors_list, list):
        items = authors_list

    lead_id = None
    for idx, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        res_id = item.get("researcher_id")
        if not res_id:
            name_th = clean_str(item.get("full_name_th") or item.get("name") or "")
            name_en = clean_str(item.get("full_name_en") or "")
            if not name_th and not name_en:
                continue
            cur.execute("""
                SELECT id FROM researchers 
                WHERE (full_name_th IS NOT NULL AND LOWER(full_name_th) = LOWER(%s))
                   OR (full_name_en IS NOT NULL AND LOWER(full_name_en) = LOWER(%s))
                LIMIT 1;
            """, (name_th or "", name_en or ""))
            found = cur.fetchone()
            if found:
                res_id = found["id"]
            else:
                prefix = clean_str(item.get("prefix_title"))
                is_internal = item.get("is_internal", True)
                cur.execute("""
                    INSERT INTO researchers (prefix_title, full_name_th, full_name_en, is_internal)
                    VALUES (%s, %s, %s, %s) RETURNING id;
                """, (prefix, name_th or name_en, name_en, is_internal))
                res_id = cur.fetchone()["id"]

        order = item.get("author_order", idx)
        role = item.get("author_role") or ("First Author" if order == 1 else "Co-Author")

        cur.execute("""
            INSERT INTO publication_authors (publication_id, researcher_id, author_role, author_order)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, (pub_id, res_id, role, order))

        if order == 1 or lead_id is None:
            lead_id = res_id

    return lead_id


def sync_publication_sdgs(cur, pub_id, sdg_items):
    """Synchronize SDG goals for a publication"""
    cur.execute("DELETE FROM publication_sdgs WHERE publication_id = %s;", (pub_id,))
    if not sdg_items:
        return

    codes = []
    if isinstance(sdg_items, str):
        codes = parse_sdg_tags(sdg_items)
    elif isinstance(sdg_items, list):
        for item in sdg_items:
            if isinstance(item, int):
                codes.append(f"SDG-{item}")
            elif isinstance(item, str):
                for c in parse_sdg_tags(item):
                    if c not in codes:
                        codes.append(c)
            elif isinstance(item, dict) and "code" in item:
                codes.append(item["code"])

    for code in set(codes):
        cur.execute("SELECT id FROM sdg_goals WHERE sdg_code = %s;", (code,))
        sdg_row = cur.fetchone()
        if sdg_row:
            cur.execute("""
                INSERT INTO publication_sdgs (publication_id, sdg_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING;
            """, (pub_id, sdg_row["id"]))


# ============================================================================
# PUBLICATIONS APIS (RICH RELATIONAL DATA & CRUD)
# ============================================================================

@app.route("/api/publications", methods=["GET"])
def get_publications():
    """
    Get all publications with filters and search:
    - q: search keyword in title, author, journal, doi
    - quartile: filter by Q1, Q2, Q3, Q4
    - year: filter by publication year
    - sdg: filter by SDG code (e.g. SDG-7)
    - limit, offset: pagination
    """
    try:
        q = request.args.get("q", "").strip()
        quartile = request.args.get("quartile", "").strip().upper()
        year = request.args.get("year", "").strip()
        sdg = request.args.get("sdg", "").strip().upper()
        limit_param = request.args.get("limit")
        offset = request.args.get("offset", 0, type=int)

        query = """
            SELECT 
                p.id,
                p.title_th,
                p.title_en,
                p.publication_type,
                p.volume,
                p.issue_number,
                p.page_range,
                p.doi,
                p.scopus_id,
                p.external_url,
                p.quartile,
                p.percentile,
                p.published_date,
                EXTRACT(YEAR FROM p.published_date)::INT as publication_year,
                p.status,
                j.id as journal_id,
                j.journal_name,
                j.issn,
                r_lead.full_name_th as lead_researcher_name,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', pa.id,
                                'researcher_id', r.id,
                                'full_name_th', r.full_name_th,
                                'full_name_en', r.full_name_en,
                                'prefix_title', r.prefix_title,
                                'author_role', pa.author_role,
                                'author_order', pa.author_order,
                                'faculty_name', f.name_th
                            ) ORDER BY pa.author_order ASC
                        )
                        FROM publication_authors pa
                        JOIN researchers r ON pa.researcher_id = r.id
                        LEFT JOIN faculties f ON r.faculty_id = f.id
                        WHERE pa.publication_id = p.id
                    ), '[]'::json
                ) as authors,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', g.id,
                                'code', g.sdg_code,
                                'description_th', g.description_th
                            ) ORDER BY g.id ASC
                        )
                        FROM publication_sdgs ps
                        JOIN sdg_goals g ON ps.sdg_id = g.id
                        WHERE ps.publication_id = p.id
                    ), '[]'::json
                ) as sdgs
            FROM publications p
            LEFT JOIN journals j ON p.journal_id = j.id
            LEFT JOIN researchers r_lead ON p.lead_researcher_id = r_lead.id
            WHERE 1=1
        """
        params = []

        if q:
            query += """
                AND (
                    p.title_en ILIKE %s 
                    OR p.title_th ILIKE %s 
                    OR j.journal_name ILIKE %s 
                    OR p.doi ILIKE %s 
                    OR EXISTS (
                        SELECT 1 FROM publication_authors pa2
                        JOIN researchers r2 ON pa2.researcher_id = r2.id
                        WHERE pa2.publication_id = p.id
                        AND (r2.full_name_th ILIKE %s OR r2.full_name_en ILIKE %s)
                    )
                )
            """
            search_param = f"%{q}%"
            params.extend([search_param, search_param, search_param, search_param, search_param, search_param])

        if quartile and quartile != "ALL":
            query += " AND p.quartile = %s"
            params.append(quartile)

        if year and year != "ALL":
            try:
                y_val = int(year)
                query += " AND EXTRACT(YEAR FROM p.published_date) = %s"
                params.append(y_val)
            except ValueError:
                pass

        if sdg and sdg != "ALL":
            query += """
                AND EXISTS (
                    SELECT 1 FROM publication_sdgs ps2
                    JOIN sdg_goals g2 ON ps2.sdg_id = g2.id
                    WHERE ps2.publication_id = p.id
                    AND (g2.sdg_code = %s OR g2.sdg_code = %s)
                )
            """
            clean_sdg = sdg if sdg.startswith("SDG-") else f"SDG-{sdg}"
            params.extend([clean_sdg, sdg])

        query += " ORDER BY p.published_date DESC NULLS LAST, p.id DESC"
        if limit_param and limit_param.isdigit() and int(limit_param) > 0:
            query += " LIMIT %s OFFSET %s;"
            params.extend([int(limit_param), offset])
        else:
            query += ";"

        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                records = cur.fetchall()
                return jsonify([dict(row) for row in records])
    except Exception as e:
        logger.error(f"Error fetching publications: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/publications/<int:pub_id>", methods=["GET"])
def get_publication_by_id(pub_id):
    """Get single publication details"""
    try:
        query = """
            SELECT 
                p.*,
                EXTRACT(YEAR FROM p.published_date)::INT as publication_year,
                j.journal_name,
                j.issn,
                r_lead.full_name_th as lead_researcher_name,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', pa.id,
                                'researcher_id', r.id,
                                'full_name_th', r.full_name_th,
                                'full_name_en', r.full_name_en,
                                'prefix_title', r.prefix_title,
                                'author_role', pa.author_role,
                                'author_order', pa.author_order,
                                'faculty_name', f.name_th
                            ) ORDER BY pa.author_order ASC
                        )
                        FROM publication_authors pa
                        JOIN researchers r ON pa.researcher_id = r.id
                        LEFT JOIN faculties f ON r.faculty_id = f.id
                        WHERE pa.publication_id = p.id
                    ), '[]'::json
                ) as authors,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', g.id,
                                'code', g.sdg_code,
                                'description_th', g.description_th
                            ) ORDER BY g.id ASC
                        )
                        FROM publication_sdgs ps
                        JOIN sdg_goals g ON ps.sdg_id = g.id
                        WHERE ps.publication_id = p.id
                    ), '[]'::json
                ) as sdgs
            FROM publications p
            LEFT JOIN journals j ON p.journal_id = j.id
            LEFT JOIN researchers r_lead ON p.lead_researcher_id = r_lead.id
            WHERE p.id = %s;
        """
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(query, (pub_id,))
                record = cur.fetchone()
                if record:
                    return jsonify(dict(record))
                return jsonify({"error": "Publication not found"}), 404
    except Exception as e:
        logger.error(f"Error fetching publication {pub_id}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/publications", methods=["POST"])
def create_publication():
    """
    Create a new publication with optional author and SDG mappings.
    JSON payload:
    - title_en (required if title_th not provided)
    - title_th
    - publication_type (default: 'Article')
    - journal_name, issn, or journal_id
    - volume, issue_number, page_range, doi, scopus_id, external_url
    - quartile (Q1-Q4), percentile
    - published_date (YYYY-MM-DD) or publication_year (YYYY)
    - status ('Active')
    - authors: list of authors or string
    - sdgs: list of SDG codes or string
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        title_en = clean_str(data.get("title_en"))
        title_th = clean_str(data.get("title_th"))

        if not title_en and not title_th:
            return jsonify({"error": "ต้องระบุชื่อบทความภาษาอังกฤษ (title_en) หรือภาษาไทย (title_th)"}), 400
        if not title_en:
            title_en = title_th

        pub_type = clean_str(data.get("publication_type")) or "Article"
        volume = clean_str(data.get("volume"))
        issue = clean_str(data.get("issue_number") or data.get("issue"))
        pages = clean_str(data.get("page_range") or data.get("pages"))
        doi = clean_str(data.get("doi"))
        scopus_id = clean_str(data.get("scopus_id"))
        url = clean_str(data.get("external_url") or data.get("url"))
        quartile = normalize_quartile(data.get("quartile"))
        status = clean_str(data.get("status")) or "Active"

        percentile = None
        if data.get("percentile") is not None:
            try:
                percentile = float(str(data.get("percentile")).replace("%", "").strip())
            except (ValueError, TypeError):
                pass

        published_date = None
        if data.get("published_date"):
            try:
                published_date = datetime.date.fromisoformat(str(data.get("published_date"))[:10])
            except (ValueError, TypeError):
                pass
        elif data.get("publication_year"):
            try:
                y = int(data.get("publication_year"))
                if y > 2400:
                    y -= 543
                if 1900 <= y <= 2100:
                    published_date = datetime.date(y, 1, 1)
            except (ValueError, TypeError):
                pass

        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Resolve journal
                journal_id = data.get("journal_id")
                if not journal_id and data.get("journal_name"):
                    journal_id = upsert_journal_by_name(cur, data.get("journal_name"), data.get("issn"))

                cur.execute("""
                    INSERT INTO publications 
                    (title_th, title_en, publication_type, journal_id, volume, issue_number,
                     page_range, doi, scopus_id, external_url, quartile, percentile, 
                     published_date, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id;
                """, (
                    title_th, title_en, pub_type, journal_id, volume, issue,
                    pages, doi, scopus_id, url, quartile, percentile, published_date, status
                ))
                new_pub_id = cur.fetchone()["id"]

                # Sync authors
                lead_researcher_id = sync_publication_authors(cur, new_pub_id, data.get("authors"))
                if lead_researcher_id:
                    cur.execute("UPDATE publications SET lead_researcher_id = %s WHERE id = %s;", (lead_researcher_id, new_pub_id))

                # Sync SDGs
                sync_publication_sdgs(cur, new_pub_id, data.get("sdgs"))

            conn.commit()

        return jsonify({
            "success": True,
            "id": new_pub_id,
            "message": "สร้างผลงานวิจัยใหม่สำเร็จ"
        }), 201
    except Exception as e:
        logger.error(f"Error creating publication: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/publications/<int:pub_id>", methods=["PUT"])
def update_publication(pub_id):
    """Update publication fields, journal, authors, and SDGs"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        if not data:
            return jsonify({"error": "No update data provided"}), 400

        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Check existence
                cur.execute("SELECT id FROM publications WHERE id = %s;", (pub_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Publication not found"}), 404

                fields = []
                params = []

                if "title_en" in data:
                    fields.append("title_en = %s")
                    params.append(clean_str(data["title_en"]))
                if "title_th" in data:
                    fields.append("title_th = %s")
                    params.append(clean_str(data["title_th"]))
                if "publication_type" in data:
                    fields.append("publication_type = %s")
                    params.append(clean_str(data["publication_type"]) or "Article")
                if "volume" in data:
                    fields.append("volume = %s")
                    params.append(clean_str(data["volume"]))
                if "issue_number" in data or "issue" in data:
                    fields.append("issue_number = %s")
                    params.append(clean_str(data.get("issue_number") or data.get("issue")))
                if "page_range" in data or "pages" in data:
                    fields.append("page_range = %s")
                    params.append(clean_str(data.get("page_range") or data.get("pages")))
                if "doi" in data:
                    fields.append("doi = %s")
                    params.append(clean_str(data["doi"]))
                if "scopus_id" in data:
                    fields.append("scopus_id = %s")
                    params.append(clean_str(data["scopus_id"]))
                if "external_url" in data or "url" in data:
                    fields.append("external_url = %s")
                    params.append(clean_str(data.get("external_url") or data.get("url")))
                if "quartile" in data:
                    fields.append("quartile = %s")
                    params.append(normalize_quartile(data["quartile"]))
                if "percentile" in data:
                    p_val = None
                    if data["percentile"] is not None:
                        try:
                            p_val = float(str(data["percentile"]).replace("%", "").strip())
                        except (ValueError, TypeError):
                            pass
                    fields.append("percentile = %s")
                    params.append(p_val)
                if "status" in data:
                    fields.append("status = %s")
                    params.append(clean_str(data["status"]) or "Active")

                if "published_date" in data:
                    p_date = None
                    if data["published_date"]:
                        try:
                            p_date = datetime.date.fromisoformat(str(data["published_date"])[:10])
                        except (ValueError, TypeError):
                            pass
                    fields.append("published_date = %s")
                    params.append(p_date)
                elif "publication_year" in data:
                    p_date = None
                    if data["publication_year"]:
                        try:
                            y = int(data["publication_year"])
                            if y > 2400:
                                y -= 543
                            if 1900 <= y <= 2100:
                                p_date = datetime.date(y, 1, 1)
                        except (ValueError, TypeError):
                            pass
                    fields.append("published_date = %s")
                    params.append(p_date)

                # Journal handling
                if "journal_id" in data and data["journal_id"] is not None:
                    fields.append("journal_id = %s")
                    params.append(data["journal_id"])
                elif "journal_name" in data:
                    j_id = upsert_journal_by_name(cur, data.get("journal_name"), data.get("issn"))
                    fields.append("journal_id = %s")
                    params.append(j_id)

                # Always update updated_at
                fields.append("updated_at = NOW()")

                if fields:
                    query = f"UPDATE publications SET {', '.join(fields)} WHERE id = %s;"
                    params.append(pub_id)
                    cur.execute(query, tuple(params))

                # Update authors if passed
                if "authors" in data:
                    lead_id = sync_publication_authors(cur, pub_id, data["authors"])
                    if lead_id:
                        cur.execute("UPDATE publications SET lead_researcher_id = %s WHERE id = %s;", (lead_id, pub_id))

                # Update SDGs if passed
                if "sdgs" in data:
                    sync_publication_sdgs(cur, pub_id, data["sdgs"])

            conn.commit()

        return jsonify({
            "success": True,
            "id": pub_id,
            "message": "อัปเดตข้อมูลผลงานวิจัยสำเร็จ"
        })
    except Exception as e:
        logger.error(f"Error updating publication {pub_id}: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/publications/<int:pub_id>", methods=["DELETE"])
def delete_publication(pub_id):
    """Delete a publication and associated relational mappings"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, title_en FROM publications WHERE id = %s;", (pub_id,))
                pub = cur.fetchone()
                if not pub:
                    return jsonify({"error": "Publication not found"}), 404

                # Delete legacy copy if matching paper_id
                try:
                    cur.execute("DELETE FROM academic_papers WHERE paper_id = %s;", (str(pub_id),))
                except Exception:
                    pass

                # Delete publication (cascades to publication_authors and publication_sdgs)
                cur.execute("DELETE FROM publications WHERE id = %s;", (pub_id,))
            conn.commit()

        return jsonify({
            "success": True,
            "id": pub_id,
            "message": "ลบผลงานวิจัยเรียบร้อยแล้ว"
        })
    except Exception as e:
        logger.error(f"Error deleting publication {pub_id}: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/publications/export", methods=["GET"])
def export_publications():
    """
    Export filtered publications to Excel (.xlsx) or CSV:
    Query params:
    - q: search keyword
    - quartile: filter Q1-Q4
    - year: filter year
    - sdg: filter SDG
    - format: 'xlsx' (default) or 'csv'
    """
    try:
        q = request.args.get("q", "").strip()
        quartile = request.args.get("quartile", "").strip().upper()
        year = request.args.get("year", "").strip()
        sdg = request.args.get("sdg", "").strip().upper()
        export_format = request.args.get("format", "xlsx").strip().lower()

        query = """
            SELECT 
                p.id,
                p.title_en,
                p.title_th,
                p.publication_type,
                p.volume,
                p.issue_number,
                p.page_range,
                p.doi,
                p.scopus_id,
                p.external_url,
                p.quartile,
                p.percentile,
                p.published_date,
                EXTRACT(YEAR FROM p.published_date)::INT as publication_year,
                p.status,
                j.journal_name,
                j.issn,
                r_lead.full_name_th as lead_researcher_name,
                COALESCE(
                    (
                        SELECT string_agg(
                            COALESCE(r.full_name_th, r.full_name_en), ', ' 
                            ORDER BY pa.author_order ASC
                        )
                        FROM publication_authors pa
                        JOIN researchers r ON pa.researcher_id = r.id
                        WHERE pa.publication_id = p.id
                    ), ''
                ) as authors_str,
                COALESCE(
                    (
                        SELECT string_agg(g.sdg_code, ', ' ORDER BY g.id ASC)
                        FROM publication_sdgs ps
                        JOIN sdg_goals g ON ps.sdg_id = g.id
                        WHERE ps.publication_id = p.id
                    ), ''
                ) as sdgs_str
            FROM publications p
            LEFT JOIN journals j ON p.journal_id = j.id
            LEFT JOIN researchers r_lead ON p.lead_researcher_id = r_lead.id
            WHERE 1=1
        """
        params = []

        if q:
            query += """
                AND (
                    p.title_en ILIKE %s 
                    OR p.title_th ILIKE %s 
                    OR j.journal_name ILIKE %s 
                    OR p.doi ILIKE %s 
                    OR EXISTS (
                        SELECT 1 FROM publication_authors pa2
                        JOIN researchers r2 ON pa2.researcher_id = r2.id
                        WHERE pa2.publication_id = p.id
                        AND (r2.full_name_th ILIKE %s OR r2.full_name_en ILIKE %s)
                    )
                )
            """
            search_param = f"%{q}%"
            params.extend([search_param, search_param, search_param, search_param, search_param, search_param])

        if quartile and quartile != "ALL":
            query += " AND p.quartile = %s"
            params.append(quartile)

        if year and year != "ALL":
            try:
                y_val = int(year)
                query += " AND EXTRACT(YEAR FROM p.published_date) = %s"
                params.append(y_val)
            except ValueError:
                pass

        if sdg and sdg != "ALL":
            query += """
                AND EXISTS (
                    SELECT 1 FROM publication_sdgs ps2
                    JOIN sdg_goals g2 ON ps2.sdg_id = g2.id
                    WHERE ps2.publication_id = p.id
                    AND (g2.sdg_code = %s OR g2.sdg_code = %s)
                )
            """
            clean_sdg = sdg if sdg.startswith("SDG-") else f"SDG-{sdg}"
            params.extend([clean_sdg, sdg])

        query += " ORDER BY p.published_date DESC NULLS LAST, p.id DESC;"

        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                rows = cur.fetchall()

        # Build clean export rows
        export_data = []
        for idx, r in enumerate(rows, start=1):
            export_data.append({
                "ลำดับ": idx,
                "ชื่องานวิจัย (EN)": r["title_en"] or "",
                "ชื่องานวิจัย (TH)": r["title_th"] or "",
                "คณะผู้วิจัย": r["authors_str"] or "",
                "หัวหน้าทีมวิจัย": r["lead_researcher_name"] or "",
                "วารสาร": r["journal_name"] or "",
                "ISSN": r["issn"] or "",
                "ปีที่ตีพิมพ์": r["publication_year"] or "",
                "วันที่ตีพิมพ์": str(r["published_date"]) if r["published_date"] else "",
                "Quartile": r["quartile"] or "",
                "Percentile (%)": float(r["percentile"]) if r["percentile"] is not None else "",
                "ประเภทผลงาน": r["publication_type"] or "Article",
                "เล่มที่ (Volume)": r["volume"] or "",
                "ฉบับที่ (Issue)": r["issue_number"] or "",
                "เลขหน้า (Pages)": r["page_range"] or "",
                "DOI": r["doi"] or "",
                "Scopus ID": r["scopus_id"] or "",
                "URL": r["external_url"] or "",
                "เป้าหมาย SDG": r["sdgs_str"] or "",
                "สถานะ": r["status"] or "Active",
            })

        df_export = pd.DataFrame(export_data)
        file_date = datetime.date.today().strftime("%Y%m%d")

        if export_format == "csv":
            csv_str = df_export.to_csv(index=False, encoding="utf-8-sig")
            return send_file(
                BytesIO(csv_str.encode("utf-8-sig")),
                mimetype="text/csv; charset=utf-8",
                as_attachment=True,
                download_name=f"kmutnb_publications_{file_date}.csv"
            )
        else:
            output = BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df_export.to_excel(writer, index=False, sheet_name="Publications")
                worksheet = writer.sheets["Publications"]
                for col in worksheet.columns:
                    max_len = max(len(str(cell.value or "")) for cell in col)
                    col_letter = col[0].column_letter
                    worksheet.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 60)
            output.seek(0)
            return send_file(
                output,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name=f"kmutnb_publications_{file_date}.xlsx"
            )
    except Exception as e:
        logger.error(f"Error exporting publications: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ============================================================================
# STATS & DASHBOARD ANALYTICS API
# ============================================================================

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Get system summary statistics for the dashboard"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # 1. Total counts
                cur.execute("SELECT COUNT(*) as count FROM publications;")
                total_publications = cur.fetchone()["count"]

                cur.execute("SELECT COUNT(*) as count FROM researchers;")
                total_researchers = cur.fetchone()["count"]

                cur.execute("SELECT COUNT(*) as count FROM journals;")
                total_journals = cur.fetchone()["count"]

                # 2. Quartile distribution
                cur.execute("""
                    SELECT 
                        COALESCE(quartile, 'Unranked') as quartile, 
                        COUNT(*) as count 
                    FROM publications 
                    GROUP BY quartile 
                    ORDER BY quartile;
                """)
                quartiles = {row["quartile"]: row["count"] for row in cur.fetchall()}

                # 3. Yearly publication trend
                cur.execute("""
                    SELECT 
                        EXTRACT(YEAR FROM published_date)::INT as year, 
                        COUNT(*) as count 
                    FROM publications 
                    WHERE published_date IS NOT NULL 
                    GROUP BY year 
                    ORDER BY year DESC 
                    LIMIT 8;
                """)
                yearly = [dict(row) for row in cur.fetchall()]

                # 4. Top SDG Goals
                cur.execute("""
                    SELECT 
                        g.sdg_code, 
                        g.description_th, 
                        COUNT(ps.publication_id) as count 
                    FROM sdg_goals g 
                    LEFT JOIN publication_sdgs ps ON g.id = ps.sdg_id 
                    GROUP BY g.id, g.sdg_code, g.description_th 
                    ORDER BY count DESC, g.id ASC 
                    LIMIT 6;
                """)
                top_sdgs = [dict(row) for row in cur.fetchall()]

                # 5. Top Researchers
                cur.execute("""
                    SELECT 
                        r.id,
                        r.prefix_title,
                        r.full_name_th,
                        r.full_name_en,
                        COUNT(pa.publication_id) as publication_count
                    FROM researchers r
                    JOIN publication_authors pa ON r.id = pa.researcher_id
                    GROUP BY r.id, r.prefix_title, r.full_name_th, r.full_name_en
                    ORDER BY publication_count DESC
                    LIMIT 5;
                """)
                top_researchers = [dict(row) for row in cur.fetchall()]

                return jsonify({
                    "total_publications": total_publications,
                    "total_researchers": total_researchers,
                    "total_journals": total_journals,
                    "quartile_distribution": quartiles,
                    "yearly_trend": yearly,
                    "top_sdgs": top_sdgs,
                    "top_researchers": top_researchers,
                })
    except Exception as e:
        logger.error(f"Error fetching stats: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ============================================================================
# FILE UPLOAD ENDPOINT (EXCEL RELATIONAL INGESTION)
# ============================================================================

@app.route("/api/upload", methods=["POST"])
def upload_file():
    """Upload and parse Excel file into relational schema"""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.endswith((".xls", ".xlsx")):
        return jsonify({"error": "Only Excel files (.xlsx, .xls) are supported"}), 400

    try:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)
        logger.info(f"File saved to: {file_path}")

        # Parse Excel
        df = parse_uploaded_file(file_path, filename)
        logger.info(f"Parsed {len(df)} rows from Excel")

        if df.empty:
            return jsonify({"error": "No valid data found in Excel file"}), 400

        # Ingest to database
        stats = ingest_dataframe_to_db(df)

        return jsonify({
            "success": True,
            "message": f"นำเข้าข้อมูลสำเร็จ: เพิ่มบทความ {stats['inserted_publications']} รายการ, วารสารใหม่ {stats['inserted_journals']} รายการ, นักวิจัยใหม่ {stats['inserted_researchers']} รายการ",
            "stats": stats,
            "count": stats["inserted_publications"],
        })
    except Exception as e:
        logger.error(f"Error uploading and parsing file: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ============================================================================
# RESEARCHERS & FACULTIES & JOURNALS & SDGS ENDPOINTS
# ============================================================================

@app.route("/api/researchers", methods=["GET"])
def get_researchers():
    """Get all researchers with publication counts"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        r.*, 
                        f.name_th as faculty_name_th,
                        COUNT(pa.publication_id) as publication_count
                    FROM researchers r 
                    LEFT JOIN faculties f ON r.faculty_id = f.id 
                    LEFT JOIN publication_authors pa ON r.id = pa.researcher_id
                    GROUP BY r.id, f.name_th
                    ORDER BY publication_count DESC, r.full_name_th ASC;
                """)
                records = cur.fetchall()
                return jsonify([dict(row) for row in records])
    except Exception as e:
        logger.error(f"Error fetching researchers: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/researchers/<int:researcher_id>", methods=["GET"])
def get_researcher_profile(researcher_id):
    """Get researcher profile, statistics, and list of authored publications"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # 1. Researcher basic info
                cur.execute("""
                    SELECT 
                        r.*, 
                        f.name_th as faculty_name_th,
                        f.name_en as faculty_name_en
                    FROM researchers r 
                    LEFT JOIN faculties f ON r.faculty_id = f.id 
                    WHERE r.id = %s;
                """, (researcher_id,))
                researcher = cur.fetchone()
                if not researcher:
                    return jsonify({"error": "Researcher not found"}), 404

                # 2. Associated publications
                cur.execute("""
                    SELECT 
                        p.id,
                        p.title_en,
                        p.title_th,
                        p.publication_type,
                        p.quartile,
                        p.percentile,
                        p.published_date,
                        EXTRACT(YEAR FROM p.published_date)::INT as publication_year,
                        p.doi,
                        p.scopus_id,
                        j.journal_name,
                        pa.author_role,
                        pa.author_order
                    FROM publication_authors pa
                    JOIN publications p ON pa.publication_id = p.id
                    LEFT JOIN journals j ON p.journal_id = j.id
                    WHERE pa.researcher_id = %s
                    ORDER BY p.published_date DESC NULLS LAST, p.id DESC;
                """, (researcher_id,))
                pubs = [dict(row) for row in cur.fetchall()]

                # 3. Compute stats
                q_counts = {"Q1": 0, "Q2": 0, "Q3": 0, "Q4": 0, "Unranked": 0}
                for p in pubs:
                    q = p.get("quartile") or "Unranked"
                    if q in q_counts:
                        q_counts[q] += 1
                    else:
                        q_counts["Unranked"] += 1

                res_data = dict(researcher)
                res_data["total_publications"] = len(pubs)
                res_data["quartile_counts"] = q_counts
                res_data["publications"] = pubs
                return jsonify(res_data)
    except Exception as e:
        logger.error(f"Error fetching researcher {researcher_id}: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/researchers", methods=["POST"])
def create_researcher():
    """Create a new researcher record"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        name_th = clean_str(data.get("full_name_th"))
        name_en = clean_str(data.get("full_name_en"))
        if not name_th and not name_en:
            return jsonify({"error": "ต้องระบุชื่อ-นามสกุลนักวิจัย (full_name_th หรือ full_name_en)"}), 400

        prefix = clean_str(data.get("prefix_title"))
        position = clean_str(data.get("academic_position"))
        pos_type = clean_str(data.get("position_type"))
        faculty_id = data.get("faculty_id")
        is_internal = data.get("is_internal", True)

        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO researchers 
                    (prefix_title, full_name_th, full_name_en, academic_position, position_type, faculty_id, is_internal)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id;
                """, (prefix, name_th or name_en, name_en, position, pos_type, faculty_id, is_internal))
                new_id = cur.fetchone()["id"]
            conn.commit()

        return jsonify({
            "success": True,
            "id": new_id,
            "message": "เพิ่มข้อมูลนักวิจัยสำเร็จ"
        }), 201
    except Exception as e:
        logger.error(f"Error creating researcher: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/researchers/<int:researcher_id>", methods=["PUT"])
def update_researcher(researcher_id):
    """Update researcher record"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        if not data:
            return jsonify({"error": "No update data provided"}), 400

        fields = []
        params = []
        for field in ["prefix_title", "full_name_th", "full_name_en", "academic_position", "position_type", "faculty_id", "is_internal"]:
            if field in data:
                fields.append(f"{field} = %s")
                params.append(data[field])

        if not fields:
            return jsonify({"error": "No valid fields to update"}), 400

        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM researchers WHERE id = %s;", (researcher_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Researcher not found"}), 404

                query = f"UPDATE researchers SET {', '.join(fields)} WHERE id = %s;"
                params.append(researcher_id)
                cur.execute(query, tuple(params))
            conn.commit()

        return jsonify({
            "success": True,
            "id": researcher_id,
            "message": "แก้ไขข้อมูลนักวิจัยสำเร็จ"
        })
    except Exception as e:
        logger.error(f"Error updating researcher {researcher_id}: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/researchers/<int:researcher_id>", methods=["DELETE"])
def delete_researcher(researcher_id):
    """Delete researcher record"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM researchers WHERE id = %s;", (researcher_id,))
                if not cur.fetchone():
                    return jsonify({"error": "Researcher not found"}), 404

                cur.execute("DELETE FROM researchers WHERE id = %s;", (researcher_id,))
            conn.commit()

        return jsonify({
            "success": True,
            "id": researcher_id,
            "message": "ลบข้อมูลนักวิจัยสำเร็จ"
        })
    except Exception as e:
        logger.error(f"Error deleting researcher {researcher_id}: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/faculties", methods=["GET"])
def get_faculties():
    """Get all faculties with researcher count"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        f.*,
                        COUNT(r.id) as researcher_count
                    FROM faculties f
                    LEFT JOIN researchers r ON f.id = r.faculty_id
                    GROUP BY f.id
                    ORDER BY f.id;
                """)
                records = cur.fetchall()
                return jsonify([dict(row) for row in records])
    except Exception as e:
        logger.error(f"Error fetching faculties: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/journals", methods=["GET"])
def get_journals():
    """Get all journals with publication counts"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        j.*,
                        COUNT(p.id) as publication_count
                    FROM journals j
                    LEFT JOIN publications p ON j.id = p.journal_id
                    GROUP BY j.id
                    ORDER BY publication_count DESC, j.journal_name ASC;
                """)
                records = cur.fetchall()
                return jsonify([dict(row) for row in records])
    except Exception as e:
        logger.error(f"Error fetching journals: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/sdg-goals", methods=["GET"])
def get_sdg_goals():
    """Get all SDG goals with publication counts"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        g.*,
                        COUNT(ps.publication_id) as publication_count
                    FROM sdg_goals g
                    LEFT JOIN publication_sdgs ps ON g.id = ps.sdg_id
                    GROUP BY g.id
                    ORDER BY g.id ASC;
                """)
                records = cur.fetchall()
                return jsonify([dict(row) for row in records])
    except Exception as e:
        logger.error(f"Error fetching SDG goals: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# LEGACY ENDPOINTS (BACKWARDS COMPATIBILITY)
# ============================================================================

@app.route("/api/records", methods=["GET"])
def get_legacy_records():
    """Get all academic papers from legacy table"""
    try:
        with get_db_connection(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM academic_papers ORDER BY uploaded_at DESC LIMIT 200;")
                records = cur.fetchall()
                return jsonify([dict(row) for row in records])
    except Exception as e:
        logger.error(f"Error fetching legacy records: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================================================
# INITIALIZATION & RUN
# ============================================================================

if __name__ == "__main__":
    try:
        logger.info("Starting KMUTNB Research Management System...")
        initialize_database()
        logger.info("✓ Database ready")
        logger.info("✓ Starting Flask server on http://0.0.0.0:5000")
        app.run(debug=True, host="0.0.0.0", port=5000)
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        exit(1)
