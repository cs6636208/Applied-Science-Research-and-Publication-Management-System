import os
import re
import tempfile

import pandas as pd
import psycopg2
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from psycopg2.extras import RealDictCursor
from werkzeug.utils import secure_filename

load_dotenv()


def resolve_upload_folder():
    candidates = []
    configured = os.getenv("UPLOAD_FOLDER")
    if configured:
        candidates.append(configured)
    candidates.extend(
        [
            os.path.join(os.path.expanduser("~"), "kmutnb_uploads"),
            os.path.join(os.getcwd(), "uploads"),
            os.path.join(tempfile.gettempdir(), "kmutnb_uploads"),
        ]
    )

    for candidate in candidates:
        try:
            os.makedirs(candidate, exist_ok=True)
            return candidate
        except OSError:
            continue

    return os.path.join(tempfile.gettempdir(), "kmutnb_uploads")


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
app.config["UPLOAD_FOLDER"] = resolve_upload_folder()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/kmutnb_db",
)

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
    "paper_id": {"paper_id", "id", "paperid", "publication_id", "record_id"},
    "title": {"title", "paper_title", "article_title", "name"},
    "authors": {"authors", "author", "authors_name", "writer"},
    "publication_year": {"publication_year", "year", "pub_year", "published_year"},
    "journal": {"journal", "journal_name", "source", "publication_name"},
    "volume": {"volume", "vol"},
    "issue": {"issue", "number"},
    "pages": {"pages", "page_range", "page"},
    "keywords": {"keywords", "tags", "keyword"},
    "abstract": {"abstract", "summary", "description"},
    "doi": {"doi", "digital_object_identifier"},
    "url": {"url", "link", "website", "source_url"},
    "source_file": {"source_file"},
}


def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def ensure_database():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
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
            )
            conn.commit()
    finally:
        conn.close()


def normalize_column_name(col_name):
    text = str(col_name).strip().lower()
    cleaned = re.sub(r"[^a-z0-9]+", "_", text).strip("_")
    for canonical, aliases in COLUMN_ALIASES.items():
        if cleaned in aliases or cleaned == canonical:
            return canonical
    return cleaned


def normalize_dataframe(df):
    renamed = {}
    for raw_col in df.columns:
        normalized = normalize_column_name(raw_col)
        renamed[raw_col] = normalized
    df = df.rename(columns=renamed)

    for col in TABLE_COLUMNS:
        if col not in df.columns:
            df[col] = None

    selected = df.loc[:, TABLE_COLUMNS]
    for column in ["paper_id", "title", "authors", "journal"]:
        selected[column] = selected[column].apply(
            lambda value: None if pd.isna(value) else str(value).strip()
        )

    selected["publication_year"] = pd.to_numeric(
        selected["publication_year"], errors="coerce"
    )
    selected["publication_year"] = selected["publication_year"].astype("Int64")
    return selected


def parse_uploaded_file(file_path, file_name):
    xl = pd.ExcelFile(file_path)
    frames = []
    for sheet_name in xl.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        if df.empty:
            continue
        cleaned = normalize_dataframe(df)
        cleaned["source_file"] = file_name
        frames.append(cleaned)

    if not frames:
        raise ValueError("ไม่พบข้อมูลในไฟล์ Excel")

    combined = pd.concat(frames, ignore_index=True)
    return combined


def insert_records(df, file_name):
    ensure_database()
    rows = []
    for _, row in df.iterrows():
        values = []
        for col in TABLE_COLUMNS:
            value = row.get(col)
            if pd.isna(value):
                values.append(None)
            else:
                values.append(str(value).strip())
        rows.append(values)

    insert_sql = """
        INSERT INTO academic_papers (
            paper_id, title, authors, publication_year, journal,
            volume, issue, pages, keywords, abstract, doi, url, source_file
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.executemany(insert_sql, rows)
        conn.commit()
    finally:
        conn.close()

    return len(rows)


def fetch_records():
    ensure_database()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM academic_papers
                ORDER BY uploaded_at DESC, id DESC
                LIMIT 500
                """
            )
            return cur.fetchall()
    finally:
        conn.close()


@app.route("/api/upload", methods=["POST"])
def upload_file():
    uploaded = request.files.get("file")
    if not uploaded or uploaded.filename == "":
        return jsonify({"success": False, "message": "กรุณาเลือกไฟล์ Excel ก่อนอัปโหลด"}), 400

    filename = secure_filename(uploaded.filename)
    if not filename.lower().endswith((".xlsx", ".xls")):
        return jsonify({"success": False, "message": "รองรับเฉพาะไฟล์สกุล xlsx หรือ xls"}), 400

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    uploaded.save(filepath)

    try:
        dataframe = parse_uploaded_file(filepath, filename)
        inserted_count = insert_records(dataframe, filename)
        return jsonify({"success": True, "count": inserted_count, "file": filename})
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/api/records", methods=["GET"])
def records_api():
    try:
        return jsonify(fetch_records())
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@app.route("/health")
def health_check():
    try:
        ensure_database()
        return {"status": "ok"}, 200
    except Exception as exc:
        return {"status": "error", "message": str(exc)}, 500


if __name__ == "__main__":
    ensure_database()
    app.run(host="0.0.0.0", port=5000, debug=True)
