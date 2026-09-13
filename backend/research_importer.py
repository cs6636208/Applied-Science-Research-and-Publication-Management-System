"""Import every workbook in kmutnb_data without losing source provenance.

The importer intentionally keeps raw rows in import_rows. Source workbooks use
multiple header layouts, so domain extraction is conservative and idempotent.
"""
import argparse
import hashlib
import json
import os
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import pandas as pd

from database import DATABASE_URL, get_db_connection, initialize_database

KNOWN_HEADERS = (
    "ชื่อโครงการ", "โครงการวิจัย", "ชื่อบทความ", "ชื่อวารสาร", "ชื่อหัวหน้า",
    "หัวหน้าโครงการ", "เลขที่สัญญา", "งบประมาณ", "รายชื่อผู้แต่ง", "publisher",
    "นักวิจัย", "บุคลากร", "หน่วยวิจัย", "quartile", "doi",
)


def clean(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    return text if text and text.lower() not in {"nan", "nat", "none"} else None


def json_value(value):
    if pd.isna(value):
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if hasattr(value, "item"):
        value = value.item()
    return value if isinstance(value, (str, int, float, bool)) or value is None else str(value)


def normalize_key(value):
    return re.sub(r"[^a-z0-9ก-๙]+", "", str(value).lower())


def find_column(row, *needles):
    normalized_needles = {normalize_key(needle) for needle in needles}
    for key, value in row.items():
        if normalize_key(key) in normalized_needles:
            return clean(value)
    for key, value in row.items():
        normalized = normalize_key(key)
        if any(normalize_key(needle) in normalized for needle in needles):
            return clean(value)
    return None


def find_grant_title(row):
    """Find a project title across old and new grant workbook layouts."""
    title = find_column(row, "ชื่อโครงการ", "โครงการวิจัย", "โครงการทุน", "ชื่อเรื่อง")
    if title:
        return re.sub(r"^เรื่อง\s*", "", title).strip()
    values = list(row.values())
    if len(values) > 1:
        title = clean(values[1])
        if title and not re.fullmatch(r"[\d.,-]+", title):
            return re.sub(r"^เรื่อง\s*", "", title).strip()
    return None


def find_grant_researchers(row):
    """Read PI names from a single field or old split prefix/name columns."""
    names = find_column(row, "คณะผู้วิจัย", "หัวหน้าโครงการ", "นักวิจัย")
    if names:
        keys = list(row.keys())
        for index, key in enumerate(keys):
            if names == clean(row.get(key)) and normalize_key(key) in {"หัวหน้าโครงการ", "คณะผู้วิจัย"}:
                parts = [row.get(key)] + [row.get(next_key) for next_key in keys[index + 1:index + 3]]
                combined = " ".join(clean(part) for part in parts if clean(part))
                return clean(combined)
        return names
    values = list(row.values())
    if len(values) >= 5:
        split_name = " ".join(clean(part) for part in (values[2], values[3], values[4]) if clean(part))
        return clean(split_name)
    return None


def find_grant_budget(row):
    """Return only the total supported budget, never installment/refund values."""
    preferred = (
        "งบประมาณสนับสนุน", "งบประมาณรวม", "ยอดงบประมาณ", "งบประมาณที่ได้รับ",
        "ยอดเงินที่ได้รวม", "งบประมาณที่ได้รับจัดสรร",
    )
    items = list(row.items())
    preferred_indexes = []
    for index, (key, value) in enumerate(items):
        normalized = normalize_key(key)
        if any(normalize_key(needle) in normalized for needle in preferred):
            amount = parse_money(value)
            if amount is not None:
                preferred_indexes.append((index, amount))
    if preferred_indexes:
        # Old sheets use one merged header for installment/refund/total cells;
        # the rightmost numeric value before status is the supported total.
        start = preferred_indexes[0][0]
        end = next((i for i, (key, _) in enumerate(items[start:], start=start) if normalize_key(key) == normalize_key("สถานะ")), len(items))
        candidates = [parse_money(value) for _, value in items[start:end]]
        candidates = [amount for amount in candidates if amount is not None]
        if candidates:
            return candidates[-1]
        return preferred_indexes[-1][1]
    for key, value in items:
        normalized = normalize_key(key)
        if "งบประมาณ" in normalized and not any(
            excluded in normalized for excluded in ("งวด", "คืนทุน", "คงเหลือ")
        ):
            amount = parse_money(value)
            if amount is not None:
                return amount
    return None


def parse_year(value):
    text = clean(value)
    if not text:
        return None
    match = re.search(r"(19|20|25)\d{2}", text)
    if not match:
        return None
    year = int(match.group(0))
    return year - 543 if year >= 2400 else year


def parse_money(value):
    text = clean(value)
    if not text:
        return None
    text = re.sub(r"[^0-9.-]", "", text)
    try:
        return Decimal(text) if text else None
    except InvalidOperation:
        return None


def fingerprint(values):
    payload = "|".join(clean(value).lower() if clean(value) else "" for value in values)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def split_names(value):
    text = clean(value)
    if not text:
        return []
    return [part.strip() for part in re.split(r"[,;\n]+|\s+และ\s+|\s+and\s+", text) if part.strip()]


def normalize_department(value):
    value = clean(value)
    if not value or value == "-":
        return None
    return re.sub(r"\s+", " ", value).strip()


def normalize_person_name(value):
    value = clean(value)
    if not value:
        return ""
    value = re.sub(r"[.,]", " ", value).lower()
    prefixes = r"(?:ผศ|รศ|ศ|อ|ดร|นาย|นาง|นางสาว|mr|mrs|ms|dr)"
    value = re.sub(rf"^(?:{prefixes})\s*", "", value)
    while re.match(rf"^(?:{prefixes})\s*", value):
        value = re.sub(rf"^(?:{prefixes})\s*", "", value)
    return re.sub(r"\s+", "", value)


def find_researcher_by_name(cursor, display_name):
    key = normalize_person_name(display_name)
    if not key:
        return None
    cursor.execute("SELECT id, full_name_th, full_name_en FROM researchers")
    for row in cursor.fetchall():
        if key in {normalize_person_name(row["full_name_th"]), normalize_person_name(row["full_name_en"])}:
            return row
    return None


def upsert_department(cursor, value):
    name = normalize_department(value)
    if not name:
        return None
    cursor.execute(
        "INSERT INTO departments (name) VALUES (%s) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        (name,),
    )
    return cursor.fetchone()["id"]


def assign_publication_departments(cursor, publication_id):
    cursor.execute(
        """
        SELECT r.department_id, COUNT(*) AS author_count
        FROM publication_authors pa
        JOIN researchers r ON r.id = pa.researcher_id
        WHERE pa.publication_id = %s AND r.department_id IS NOT NULL
        GROUP BY r.department_id
        """,
        (publication_id,),
    )
    counts = cursor.fetchall()
    if not counts:
        return
    highest = max(row["author_count"] for row in counts)
    primary_count = sum(row["author_count"] == highest for row in counts)
    for row in counts:
        cursor.execute(
            """
            INSERT INTO publication_departments (publication_id, department_id, author_count, is_primary)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (publication_id, department_id) DO UPDATE
            SET author_count = EXCLUDED.author_count, is_primary = EXCLUDED.is_primary
            """,
            (publication_id, row["department_id"], row["author_count"], primary_count == 1 and row["author_count"] == highest),
        )


def rebuild_publication_departments(cursor):
    cursor.execute("DELETE FROM publication_departments")
    cursor.execute("SELECT DISTINCT publication_id FROM publication_authors")
    for row in cursor.fetchall():
        assign_publication_departments(cursor, row["publication_id"])


def reconcile_researcher_departments(cursor):
    """Merge publication-created researchers with department-bearing master records."""
    cursor.execute("SELECT id, full_name_th, full_name_en FROM researchers WHERE department_id IS NULL")
    candidates = cursor.fetchall()
    cursor.execute("SELECT id, full_name_th, full_name_en, department_id FROM researchers WHERE department_id IS NOT NULL")
    masters = cursor.fetchall()
    master_map = {}
    for master in masters:
        for name in (master["full_name_th"], master["full_name_en"]):
            key = normalize_person_name(name)
            if key:
                master_map[key] = master
    for candidate in candidates:
        master = next(
            (master_map.get(normalize_person_name(name)) for name in (candidate["full_name_th"], candidate["full_name_en"]) if normalize_person_name(name) in master_map),
            None,
        )
        if not master or master["id"] == candidate["id"]:
            continue
        cursor.execute(
            "UPDATE publication_authors SET researcher_id = %s WHERE researcher_id = %s",
            (master["id"], candidate["id"]),
        )
        cursor.execute(
            "UPDATE project_researchers SET researcher_id = %s WHERE researcher_id = %s",
            (master["id"], candidate["id"]),
        )
        cursor.execute("DELETE FROM researchers WHERE id = %s", (candidate["id"],))


def normalize_publication_type(value):
    value = clean(value)
    if not value:
        return "Journal Article"
    normalized = value.lower().replace("_", " ").replace("-", " ")
    if "conference" in normalized or "proceeding" in normalized or "ประชุม" in normalized:
        return "Conference Proceeding"
    if normalized in {"article", "journal article", "บทความวารสาร", "บทความวิชาการ"}:
        return "Journal Article"
    return value


def ingest_publication(cursor, values, dataset_type, source_row_id):
    title_th = find_column(values, "ชื่อบทความภาษาไทย", "ชื่อบทความไทย", "ชื่อเรื่องไทย")
    title_en = find_column(values, "ชื่อบทความenglish", "ชื่อบทความอังกฤษ", "ชื่อเรื่องenglish")
    title = title_en or title_th
    if not title:
        title = find_column(values, "ชื่อบทความ", "article title", "title")
    if not title:
        return False

    doi = find_column(values, "รหัสdoi", "doi")
    year = parse_year(find_column(values, "ปีที่ตีพิมพ์", "ปีพศ", "ปีคศ", "ปี") or os.path.basename(str(source_row_id)))
    pub_type = "Conference Proceeding" if dataset_type == "conference_publication" else normalize_publication_type(find_column(values, "ประเภทบทความ", "ประเภทผลงาน"))
    cursor.execute(
        "SELECT id FROM publications WHERE (%s IS NOT NULL AND LOWER(COALESCE(doi, '')) = LOWER(%s)) OR (LOWER(COALESCE(title_en, title_th, '')) = LOWER(%s) AND EXTRACT(YEAR FROM published_date) = %s) LIMIT 1",
        (doi, doi, title, year),
    )
    existing = cursor.fetchone()
    if existing:
        cursor.execute("INSERT INTO publication_source_rows (publication_id, source_row_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (existing["id"], source_row_id))
        assign_publication_departments(cursor, existing["id"])
        return False

    journal_name = find_column(values, "วารสารหนังสือที่ตีพิมพ์", "ชื่อวารสาร", "เอกสารการประชุม", "วารสาร")
    issn = find_column(values, "issn")
    journal_id = None
    if journal_name:
        cursor.execute("SELECT id FROM journals WHERE LOWER(journal_name) = LOWER(%s) LIMIT 1", (journal_name,))
        journal = cursor.fetchone()
        if journal:
            journal_id = journal["id"]
        else:
            cursor.execute("INSERT INTO journals (journal_name, issn) VALUES (%s, %s) RETURNING id", (journal_name, issn))
            journal_id = cursor.fetchone()["id"]

    published_date = None
    raw_date = find_column(values, "publisheddate", "วันที่ตีพิมพ์")
    if raw_date:
        try:
            published_date = pd.to_datetime(raw_date, errors="coerce").date()
        except (TypeError, ValueError):
            published_date = None
    cursor.execute("""
        INSERT INTO publications
        (title_th, title_en, publication_type, journal_id, volume, issue_number,
         page_range, doi, scopus_id, external_url, quartile, percentile,
         published_date, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        title_th, title_en or title, pub_type, journal_id,
        find_column(values, "volume", "ปีที่"), find_column(values, "issue", "ฉบับที่", "number"),
        find_column(values, "หน้า", "pages"), doi,
        find_column(values, "scopusid", "ฐานข้อมูลบทความ"),
        find_column(values, "externalurl", "url"), find_column(values, "quartile"),
        parse_money(find_column(values, "percentile")), published_date,
        find_column(values, "status") or "Active",
    ))
    publication_id = cursor.fetchone()["id"]
    cursor.execute("INSERT INTO publication_source_rows (publication_id, source_row_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (publication_id, source_row_id))

    for order, name in enumerate(split_names(find_column(values, "ทีมนักวิจัย", "รายชื่อผู้แต่ง", "authors")), start=1):
        cursor.execute("SELECT id FROM researchers WHERE LOWER(full_name_th) = LOWER(%s) OR LOWER(COALESCE(full_name_en, '')) = LOWER(%s) LIMIT 1", (name, name))
        researcher = cursor.fetchone()
        if not researcher:
            cursor.execute("INSERT INTO researchers (full_name_th, full_name_en, is_internal) VALUES (%s, %s, %s) RETURNING id", (name, name if not re.search(r"[ก-๙]", name) else None, bool(re.search(r"[ก-๙]", name))))
            researcher = cursor.fetchone()
        cursor.execute("INSERT INTO publication_authors (publication_id, researcher_id, author_role, author_order) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING", (publication_id, researcher["id"], "First Author" if order == 1 else "Co-Author", order))
    assign_publication_departments(cursor, publication_id)
    return True


def classify_file(path, columns):
    name = os.path.basename(path).lower()
    folder = os.path.basename(os.path.dirname(path)).lower()
    text = " ".join(str(column) for column in columns).lower()
    if "publisher" in name:
        return "publisher"
    if "หน่วยวิจัย" in name:
        return "research_unit"
    if "บุคลากร" in name:
        return "researcher"
    if "ประชุม" in folder or "proceeding" in name:
        return "conference_publication"
    if "วารสาร" in folder or "publication" in name:
        return "journal_publication"
    if "ภาครัฐ/เอกชน" in text and "หน่วยงานที่ผ่านเรื่อง" in text:
        return "external_grant"
    if "ประเภททุน" in text or "งบประมาณสนับสนุน" in text:
        return "internal_grant"
    if "ทุนวิจัย" in folder or "ทุนวิจัย" in name or "เลขที่สัญญา" in text:
        return "internal_grant" if "ภายนอก" not in folder else "external_grant"
    if any(keyword in text for keyword in KNOWN_HEADERS):
        return "research_dataset"
    return "unclassified"


def is_summary_sheet(sheet_name):
    """Return True for workbook sheets that contain aggregates, not records."""
    normalized = normalize_key(sheet_name)
    return normalized in {"data", "summary", "สรุป"} or "รายงานสรุป" in normalized


def find_header_index(raw):
    """Find the row containing the actual table headings in formatted sheets."""
    best_index = 0
    best_score = -1
    required_groups = (
        ("ชื่อโครงการ", "โครงการวิจัย"),
        ("คณะผู้วิจัย", "หัวหน้าโครงการ", "นักวิจัย"),
        ("แหล่งทุน", "หน่วยงานผู้ให้ทุน"),
        ("งบประมาณ", "เงิน"),
        ("ปีงบประมาณ", "ปี"),
    )
    for index, values in raw.head(30).iterrows():
        cells = [normalize_key(value) for value in values if clean(value)]
        score = sum(
            any(normalize_key(needle) in cell for needle in group)
            for group in required_groups
            for cell in cells
        )
        score = min(score, len(required_groups))
        # Formatted internal-grant sheets have a report title before the real
        # header. These labels identify the actual project-record row.
        header_markers = (
            "ลำดับที่", "ลำดับ", "ประเภททุน", "งบประมาณสนับสนุน", "สถานะ", "หมายเหตุ",
            "ชื่อ", "สกุล", "ภาควิชา",
        )
        score += sum(normalize_key(marker) in cells for marker in header_markers) * 2
        if score > best_score:
            best_score = score
            best_index = index
    return best_index


def read_workbook(path):
    workbook = pd.ExcelFile(path)
    for sheet in workbook.sheet_names:
        if is_summary_sheet(sheet):
            continue
        raw = pd.read_excel(path, sheet_name=sheet, header=None)
        raw = raw.dropna(how="all")
        if raw.empty:
            continue
        header_index = find_header_index(raw)
        header = [clean(value) or f"column_{index}" for index, value in enumerate(raw.loc[header_index])]
        data = raw.loc[raw.index > header_index].copy()
        data.columns = header
        data = data.dropna(how="all")
        for row_number, (_, row) in enumerate(data.iterrows(), start=int(header_index) + 2):
            yield sheet, row_number, row.to_dict(), header


def profile(root):
    result = []
    for path in sorted(iter_workbooks(root)):
        sheets = {}
        rows = list(read_workbook(path))
        for sheet, _, _, columns in rows:
            sheets.setdefault(sheet, {"columns": columns, "rows": 0})
            sheets[sheet]["rows"] += 1
        result.append({"file": os.path.relpath(path, root), "dataset_type": classify_file(path, [c for value in sheets.values() for c in value["columns"]]), "sheets": sheets})
    return result


def iter_workbooks(root):
    for directory, _, files in os.walk(root):
        for filename in files:
            if filename.lower().endswith((".xlsx", ".xls")):
                yield os.path.join(directory, filename)


def import_workbooks(root, dry_run=False, paths=None):
    if not dry_run:
        initialize_database()
    totals = {"files": 0, "rows": 0, "accepted": 0, "projects": 0, "publications": 0, "publishers": 0, "errors": 0}
    workbooks = paths if paths is not None else iter_workbooks(root)
    for path in sorted(workbooks):
        relative = os.path.relpath(path, root)
        file_hash = hashlib.sha256(open(path, "rb").read()).hexdigest()
        rows = list(read_workbook(path))
        dataset_type = classify_file(path, [column for _, _, _, columns in rows for column in columns])
        totals["files"] += 1
        if dry_run:
            totals["rows"] += len(rows)
            print(json.dumps({"file": relative, "dataset_type": dataset_type, "rows": len(rows)}, ensure_ascii=False))
            continue
        with get_db_connection(DATABASE_URL) as connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO import_batches (source_file, dataset_type, file_hash, row_count)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (source_file, file_hash) DO UPDATE SET imported_at = NOW()
                    RETURNING id
                """, (relative, dataset_type, file_hash, len(rows)))
                batch_id = cursor.fetchone()["id"]
                for sheet, source_row, values, _ in rows:
                    raw = {str(key): json_value(value) for key, value in values.items()}
                    row_hash = fingerprint([json.dumps(raw, ensure_ascii=False, sort_keys=True)])
                    cursor.execute("""
                        INSERT INTO import_rows (batch_id, sheet_name, source_row, row_hash, dataset_type, raw_data)
                        VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                        ON CONFLICT (batch_id, sheet_name, source_row, row_hash) DO NOTHING
                        RETURNING id
                    """, (batch_id, sheet, source_row, row_hash, dataset_type, json.dumps(raw, ensure_ascii=False)))
                    inserted = cursor.fetchone()
                    if inserted:
                        row_id = inserted["id"]
                        totals["accepted"] += 1
                    else:
                        cursor.execute(
                            "SELECT id FROM import_rows WHERE batch_id = %s AND sheet_name = %s AND source_row = %s AND row_hash = %s",
                            (batch_id, sheet, source_row, row_hash),
                        )
                        existing_row = cursor.fetchone()
                        if not existing_row:
                            continue
                        row_id = existing_row["id"]
                    if dataset_type in {"journal_publication", "conference_publication"}:
                        totals["publications"] += int(ingest_publication(cursor, values, dataset_type, row_id))
                    project_title = find_grant_title(values)
                    if dataset_type.endswith("grant") and project_title:
                        project_code = find_column(values, "เลขที่สัญญา", "เลขที่คำรับรอง")
                        year = parse_year(find_column(values, "ปีงบประมาณ") or sheet)
                        amount = find_grant_budget(values)
                        funding_name = find_column(values, "แหล่งทุน", "หน่วยงานผู้ให้ทุน")
                        funding_id = None
                        if funding_name and funding_name != "-":
                            cursor.execute(
                                """
                                INSERT INTO funding_sources (name, source_type)
                                VALUES (%s, %s)
                                ON CONFLICT (name, source_type) DO UPDATE SET name = EXCLUDED.name
                                RETURNING id
                                """,
                                (funding_name, "EXTERNAL" if dataset_type == "external_grant" else "INTERNAL"),
                            )
                            funding_id = cursor.fetchone()["id"]
                        project_hash = fingerprint([project_code or project_title, year, dataset_type])
                        cursor.execute("""
                            INSERT INTO research_projects
                            (project_code, title_th, project_type, fiscal_year, budget, status,
                             funding_source_id, source_row_id, fingerprint)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (fingerprint) DO NOTHING
                            RETURNING id
                        """, (project_code, project_title, dataset_type, year, amount,
                              find_column(values, "สถานะ"), funding_id, row_id, project_hash))
                        project_row = cursor.fetchone()
                        project_id = project_row["id"] if project_row else None
                        if project_id:
                            totals["projects"] += 1
                        if project_id:
                            pi_names = split_names(find_grant_researchers(values))
                            for order, name in enumerate(pi_names, start=1):
                                cursor.execute(
                                    "SELECT id FROM researchers WHERE LOWER(full_name_th) = LOWER(%s) LIMIT 1",
                                    (name,),
                                )
                                researcher = cursor.fetchone()
                                if not researcher:
                                    cursor.execute(
                                        "INSERT INTO researchers (full_name_th, is_internal) VALUES (%s, TRUE) RETURNING id",
                                        (name,),
                                    )
                                    researcher = cursor.fetchone()
                                cursor.execute(
                                    """
                                    INSERT INTO project_researchers (project_id, researcher_id, role)
                                    VALUES (%s, %s, %s) ON CONFLICT DO NOTHING
                                    """,
                                    (project_id, researcher["id"], "PI" if order == 1 else "Co-Researcher"),
                                )
                    if dataset_type == "researcher":
                        first_name = find_column(values, "ชื่อ")
                        last_name = find_column(values, "สกุล", "นามสกุล")
                        display_name = " ".join(part for part in (first_name, last_name) if part)
                        if display_name:
                            department = find_column(values, "หน่วยงาน", "ภาควิชา")
                            department_id = upsert_department(cursor, department)
                            existing_researcher = find_researcher_by_name(cursor, display_name)
                            if existing_researcher:
                                cursor.execute(
                                    "UPDATE researchers SET department_id = COALESCE(%s, department_id) WHERE id = %s",
                                    (department_id, existing_researcher["id"]),
                                )
                            else:
                                cursor.execute("""
                                    INSERT INTO researchers
                                    (full_name_th, full_name_en, department_id, is_internal)
                                    VALUES (%s, NULL, %s, TRUE)
                                """, (display_name, department_id))
                    if dataset_type == "research_unit":
                        unit_name = find_column(values, "หน่วยวิจัย", "ชื่อหน่วย", "ชื่อกลุ่ม")
                        if not unit_name:
                            non_empty = [clean(value) for value in values.values() if clean(value)]
                            unit_name = non_empty[0] if non_empty else None
                        if unit_name and len(unit_name) < 500:
                            cursor.execute("""
                                INSERT INTO research_units (name, description, source_row_id)
                                VALUES (%s, %s, %s) ON CONFLICT (name) DO NOTHING
                            """, (unit_name, json.dumps(raw, ensure_ascii=False), row_id))
                    publisher = find_column(values, "ส่วนงานที่จัดพิมพ์", "publisher")
                    if dataset_type == "publisher" and publisher:
                        cursor.execute("""
                            INSERT INTO publishers (name, country, source_row_id)
                            VALUES (%s, %s, %s) ON CONFLICT (name) DO NOTHING
                        """, (publisher, "ในประเทศ" if "ในประเทศ" in sheet else "นอกประเทศ", row_id))
                        totals["publishers"] += cursor.rowcount
                reconcile_researcher_departments(cursor)
                rebuild_publication_departments(cursor)
                connection.commit()
        totals["rows"] += len(rows)
        print(json.dumps({"file": relative, "dataset_type": dataset_type, "rows": len(rows)}, ensure_ascii=False))
    print(json.dumps({"summary": totals}, ensure_ascii=False))
    return totals


def classify_workbook(path):
    """Classify one uploaded workbook without writing to the database."""
    rows = list(read_workbook(path))
    columns = [column for _, _, _, headers in rows for column in headers]
    return classify_file(path, columns), len(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Profile or import all KMUTNB research workbooks")
    parser.add_argument("--root", default=os.path.join(os.path.dirname(__file__), "..", "kmutnb_data"))
    parser.add_argument("--profile", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.profile:
        print(json.dumps(profile(args.root), ensure_ascii=False, indent=2))
    else:
        import_workbooks(args.root, dry_run=args.dry_run)
