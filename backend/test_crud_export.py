"""Comprehensive automated integration tests for KMUTNB Research APIs: CRUD and Export"""
import urllib.request
import urllib.parse
import json
import io
import pandas as pd

BASE_URL = "http://localhost:5000/api"

def request_json(method, path, data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode("utf-8")
        return resp.status, json.loads(content)

def request_raw(method, path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read(), resp.headers

def run_tests():
    print("=== STARTING KMUTNB RESEARCH BACKEND API TESTS ===\n")

    # 1. Test GET /api
    print("1. Testing GET /api (Catalog)...")
    status, catalog = request_json("GET", "")
    assert status == 200, f"Expected 200, got {status}"
    assert "endpoints" in catalog
    print(f"   [OK] API Catalog ok: {len(catalog['endpoints'])} endpoints registered.")

    # 2. Test Export to Excel (.xlsx)
    print("2. Testing GET /api/publications/export?format=xlsx...")
    status, raw_xlsx, headers = request_raw("GET", "/publications/export?format=xlsx&limit=5")
    assert status == 200, f"Expected 200, got {status}"
    assert len(raw_xlsx) > 100, "XLSX payload too small"
    df_xlsx = pd.read_excel(io.BytesIO(raw_xlsx))
    print(f"   [OK] Exported Excel successfully: {len(df_xlsx)} rows, columns: {list(df_xlsx.columns[:5])}...")

    # 3. Test Export to CSV
    print("3. Testing GET /api/publications/export?format=csv...")
    status, raw_csv, headers = request_raw("GET", "/publications/export?format=csv")
    assert status == 200, f"Expected 200, got {status}"
    csv_text = raw_csv.decode("utf-8-sig")
    assert "ชื่องานวิจัย (EN)" in csv_text
    print(f"   [OK] Exported CSV successfully: {len(csv_text.splitlines())} lines.")

    # 4. Test POST /api/publications (Create Publication)
    print("4. Testing POST /api/publications (Create)...")
    new_pub_payload = {
        "title_en": "Integration Test Article on Renewable Energy Systems",
        "title_th": "บทความทดสอบระบบพลังงานหมุนเวียน",
        "publication_type": "Article",
        "journal_name": "KMUTNB Journal of Applied Science and Technology",
        "issn": "1234-5678",
        "volume": "34",
        "issue_number": "1",
        "page_range": "10-25",
        "doi": "10.14416/j.kmutnb.2026.09.001",
        "scopus_id": "2-s2.0-9999999999",
        "external_url": "https://doi.org/10.14416/j.kmutnb.2026.09.001",
        "quartile": "Q1",
        "percentile": 96.5,
        "published_date": "2026-09-01",
        "status": "Active",
        "authors": [
            {
                "full_name_th": "ผู้ทดสอบ ระบบหนึ่ง",
                "full_name_en": "Test User One",
                "prefix_title": "ผศ.ดร.",
                "author_role": "First Author",
                "author_order": 1,
                "is_internal": True
            },
            {
                "full_name_th": "ผู้ทดสอบ ระบบสอง",
                "full_name_en": "Test User Two",
                "prefix_title": "รศ.ดร.",
                "author_role": "Co-Author",
                "author_order": 2,
                "is_internal": True
            }
        ],
        "sdgs": ["SDG-7", "SDG-13"]
    }
    status, create_res = request_json("POST", "/publications", new_pub_payload)
    assert status == 201, f"Expected 201, got {status}"
    assert create_res.get("success") is True
    pub_id = create_res["id"]
    print(f"   [OK] Created publication with ID: {pub_id}")

    # 5. Test GET /api/publications/<id>
    print(f"5. Testing GET /api/publications/{pub_id}...")
    status, pub_data = request_json("GET", f"/publications/{pub_id}")
    assert status == 200, f"Expected 200, got {status}"
    assert pub_data["title_en"] == new_pub_payload["title_en"]
    assert pub_data["quartile"] == "Q1"
    assert len(pub_data["authors"]) == 2
    assert len(pub_data["sdgs"]) == 2
    print(f"   [OK] Retrieved publication: {pub_data['title_en']}, Authors: {len(pub_data['authors'])}, SDGs: {len(pub_data['sdgs'])}")

    # 6. Test PUT /api/publications/<id> (Update)
    print(f"6. Testing PUT /api/publications/{pub_id}...")
    update_payload = {
        "title_en": "Updated Integration Test Article on Renewable Energy Systems",
        "quartile": "Q2",
        "percentile": 88.0,
        "sdgs": ["SDG-9"]
    }
    status, update_res = request_json("PUT", f"/publications/{pub_id}", update_payload)
    assert status == 200, f"Expected 200, got {status}"
    
    # Verify update
    status, pub_updated = request_json("GET", f"/publications/{pub_id}")
    assert pub_updated["title_en"] == update_payload["title_en"]
    assert pub_updated["quartile"] == "Q2"
    assert len(pub_updated["sdgs"]) == 1
    assert pub_updated["sdgs"][0]["code"] == "SDG-9"
    print(f"   [OK] Updated publication verified: new title and Q2 quartile.")

    # 7. Test DELETE /api/publications/<id>
    print(f"7. Testing DELETE /api/publications/{pub_id}...")
    status, del_res = request_json("DELETE", f"/publications/{pub_id}")
    assert status == 200, f"Expected 200, got {status}"
    
    # Verify deleted
    try:
        request_json("GET", f"/publications/{pub_id}")
        assert False, "Publication should not exist"
    except urllib.error.HTTPError as e:
        assert e.code == 404
        print("   [OK] Deleted publication successfully confirmed (404 on fetch).")

    # 8. Test POST /api/researchers (Create Researcher)
    print("8. Testing POST /api/researchers...")
    res_payload = {
        "prefix_title": "ศ.ดร.",
        "full_name_th": "ศาสตราจารย์ ทดสอบ",
        "full_name_en": "Prof. Test Researcher",
        "academic_position": "ศาสตราจารย์",
        "position_type": "อาจารย์ประจำ",
        "is_internal": True
    }
    status, res_create = request_json("POST", "/researchers", res_payload)
    assert status == 201, f"Expected 201, got {status}"
    researcher_id = res_create["id"]
    print(f"   [OK] Created researcher with ID: {researcher_id}")

    # 9. Test GET /api/researchers/<id> (Profile & Stats)
    print(f"9. Testing GET /api/researchers/{researcher_id}...")
    status, res_profile = request_json("GET", f"/researchers/{researcher_id}")
    assert status == 200, f"Expected 200, got {status}"
    assert res_profile["full_name_th"] == res_payload["full_name_th"]
    assert "publications" in res_profile
    assert "quartile_counts" in res_profile
    print(f"   [OK] Retrieved researcher profile: {res_profile['full_name_th']}, Publications: {res_profile['total_publications']}")

    # 10. Test PUT /api/researchers/<id> (Update Researcher)
    print(f"10. Testing PUT /api/researchers/{researcher_id}...")
    status, res_update = request_json("PUT", f"/researchers/{researcher_id}", {"academic_position": "ศาสตราจารย์พิเศษ"})
    assert status == 200, f"Expected 200, got {status}"
    status, res_profile_updated = request_json("GET", f"/researchers/{researcher_id}")
    assert res_profile_updated["academic_position"] == "ศาสตราจารย์พิเศษ"
    print(f"   [OK] Updated researcher verified: {res_profile_updated['academic_position']}")

    # 11. Test DELETE /api/researchers/<id> (Delete Researcher)
    print(f"11. Testing DELETE /api/researchers/{researcher_id}...")
    status, res_del = request_json("DELETE", f"/researchers/{researcher_id}")
    assert status == 200, f"Expected 200, got {status}"
    try:
        request_json("GET", f"/researchers/{researcher_id}")
        assert False, "Researcher should not exist"
    except urllib.error.HTTPError as e:
        assert e.code == 404
        print("   [OK] Deleted researcher confirmed (404 on fetch).")

    print("\n==========================================")
    print("ALL 11 BACKEND API TESTS PASSED SUCCESSFULLY! [OK]")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
