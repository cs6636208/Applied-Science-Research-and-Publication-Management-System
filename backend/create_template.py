"""Script to generate a sample/template Excel file for KMUTNB Research Management"""
import os
import pandas as pd

template_data = [
    {
        "ชื่อบทความ (ไทย)": "การเพิ่มประสิทธิภาพระบบโครงข่ายพลังงานหมุนเวียนด้วยปัญญาประดิษฐ์",
        "ชื่อบทความ (English)": "AI-Driven Optimization for Renewable Energy Microgrids",
        "รายชื่อผู้แต่ง": "ผศ.ดร.สมชาย ใจดี, รศ.ดร.วิชัย สุขเกษม, Dr. Alex Smith",
        "ชื่อวารสาร": "IEEE Transactions on Sustainable Energy",
        "ISSN": "1949-3029",
        "ปีที่ตีพิมพ์": 2024,
        "วันที่ตีพิมพ์": "2024-03-15",
        "Quartile": "Q1",
        "Percentile": 94.5,
        "SDG Goals": "SDG 7, SDG 13",
        "ประเภทผลงาน": "Article",
        "เล่มที่ (Volume)": "15",
        "ฉบับที่ (Issue)": "2",
        "เลขหน้า (Pages)": "120-135",
        "DOI": "10.1109/TSTE.2024.123456",
        "Scopus ID": "2-s2.0-85123456789",
        "External URL": "https://doi.org/10.1109/TSTE.2024.123456"
    },
    {
        "ชื่อบทความ (ไทย)": "การสังเคราะห์อนุภาคนาโนเพื่อประยุกต์ใช้ในการตรวจวัดสารมลพิษในน้ำ",
        "ชื่อบทความ (English)": "Synthesis of Functional Nanoparticles for Water Contaminant Sensing",
        "รายชื่อผู้แต่ง": "รศ.ดร.กัญญา ศรีสวัสดิ์, ผศ.ดร.ภาณุพงศ์ ทองแท้",
        "ชื่อวารสาร": "Sensors and Actuators B: Chemical",
        "ISSN": "0925-4005",
        "ปีที่ตีพิมพ์": 2023,
        "วันที่ตีพิมพ์": "2023-11-20",
        "Quartile": "Q1",
        "Percentile": 91.0,
        "SDG Goals": "SDG 6, SDG 9",
        "ประเภทผลงาน": "Article",
        "เล่มที่ (Volume)": "395",
        "ฉบับที่ (Issue)": "1",
        "เลขหน้า (Pages)": "134200",
        "DOI": "10.1016/j.snb.2023.134200",
        "Scopus ID": "2-s2.0-85176543210",
        "External URL": "https://doi.org/10.1016/j.snb.2023.134200"
    },
    {
        "ชื่อบทความ (ไทย)": "การวิเคราะห์ข้อมูลจราจรในเมืองอัจฉริยะด้วยการประมวลผลแบบเอดจ์",
        "ชื่อบทความ (English)": "Edge Computing Framework for Real-Time Smart City Traffic Analytics",
        "รายชื่อผู้แต่ง": "ผศ.ดร.ธีรพงษ์ มั่นคง, อ.ดร.นภัสสร รักษ์ดี",
        "ชื่อวารสาร": "Journal of Network and Computer Applications",
        "ISSN": "1084-8045",
        "ปีที่ตีพิมพ์": 2024,
        "วันที่ตีพิมพ์": "2024-01-10",
        "Quartile": "Q2",
        "Percentile": 78.5,
        "SDG Goals": "SDG 11, SDG 9",
        "ประเภทผลงาน": "Article",
        "เล่มที่ (Volume)": "220",
        "ฉบับที่ (Issue)": "3",
        "เลขหน้า (Pages)": "103750",
        "DOI": "10.1016/j.jnca.2024.103750",
        "Scopus ID": "2-s2.0-85189012345",
        "External URL": "https://doi.org/10.1016/j.jnca.2024.103750"
    }
]

def create_template():
    df = pd.DataFrame(template_data)
    
    # Save to backend
    backend_path = os.path.join(os.path.dirname(__file__), "kmutnb_publication_template.xlsx")
    df.to_excel(backend_path, index=False, sheet_name="Publication")
    print(f"✓ Saved to: {backend_path}")
    
    # Save to frontend public folder for direct browser download
    frontend_public = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")
    if os.path.exists(frontend_public):
        pub_path = os.path.join(frontend_public, "kmutnb_publication_template.xlsx")
        df.to_excel(pub_path, index=False, sheet_name="Publication")
        print(f"✓ Saved to frontend public: {pub_path}")

if __name__ == "__main__":
    create_template()
