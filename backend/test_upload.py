import urllib.request
import json
import os

file_path = os.path.join(os.path.dirname(__file__), 'sample_kmutnb_publications.xlsx')
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'

with open(file_path, 'rb') as f:
    file_bytes = f.read()

header = f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample_kmutnb_publications.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'.encode('utf-8')
footer = f'\r\n--{boundary}--\r\n'.encode('utf-8')
body = header + file_bytes + footer

req = urllib.request.Request(
    'http://localhost:5000/api/upload',
    data=body,
    headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Content-Length': str(len(body))
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req) as res:
        res_data = json.loads(res.read().decode('utf-8'))
        print('Upload Success:', json.dumps(res_data, ensure_ascii=False, indent=2))
except Exception as e:
    print('Upload Failed:', e)
