# Applied-Science-Research-and-Publication-Management-System

## Research data catalogue

The backend now includes an additive catalogue schema for the workbooks in
`kmutnb_data`. It preserves every source row in `import_batches` and
`import_rows`, then extracts grants, researchers, research units, and
publishers when the source columns are identifiable. Existing publication
tables and APIs remain compatible.

Run these commands from the repository root after starting PostgreSQL with
`backend/docker-compose.yml`:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/kmutnb_db"
py -3 backend/research_importer.py --profile
py -3 backend/research_importer.py --dry-run
py -3 backend/research_importer.py
```

The importer is idempotent for the same source file hash and stores the source
file, sheet, row number, row hash, and raw JSON for audit and reprocessing.