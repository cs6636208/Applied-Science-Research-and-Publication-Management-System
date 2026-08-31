"""Script to re-import all Excel files in uploads/ into the relational schema"""
import glob
import os
import logging
from database import get_db_connection, DATABASE_URL, initialize_database
from main import parse_uploaded_file, ingest_dataframe_to_db

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def reingest():
    logger.info("Initializing database schema...")
    initialize_database()

    # Clear existing publications & researchers (to avoid duplicates during fresh sync)
    with get_db_connection(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            logger.info("Clearing existing publications and authors for clean re-sync...")
            cur.execute("TRUNCATE TABLE publication_authors, publication_sdgs, publications, researchers, journals, academic_papers RESTART IDENTITY CASCADE;")
            conn.commit()

    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    files = sorted(glob.glob(os.path.join(uploads_dir, "*.xlsx")))
    
    total_stats = {
        "files_processed": 0,
        "total_publications": 0,
        "total_researchers": 0,
        "total_journals": 0,
        "total_authors_links": 0,
        "total_sdgs": 0,
    }

    for f in files:
        fname = os.path.basename(f)
        logger.info(f"Processing: {fname}...")
        try:
            df = parse_uploaded_file(f, fname)
            stats = ingest_dataframe_to_db(df)
            total_stats["files_processed"] += 1
            total_stats["total_publications"] += stats["inserted_publications"]
            total_stats["total_researchers"] += stats["inserted_researchers"]
            total_stats["total_journals"] += stats["inserted_journals"]
            total_stats["total_authors_links"] += stats["inserted_authors_links"]
            total_stats["total_sdgs"] += stats["inserted_sdgs"]
            logger.info(f"✓ {fname}: inserted {stats['inserted_publications']} publications, {stats['inserted_researchers']} new researchers")
        except Exception as e:
            logger.error(f"Failed to process {fname}: {e}")

    logger.info(f"Re-ingest Complete! Summary: {total_stats}")

if __name__ == "__main__":
    reingest()
