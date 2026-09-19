import re
import ast

path = r'C:\Users\Shadow 13 Solutions\.gemini\antigravity\brain\bfec4a29-48de-4670-8fd1-ba5c13123263\.system_generated\logs\transcript_full.jsonl'
output_path = r'C:\Users\Shadow 13 Solutions\Desktop\Field ACQ Ordinance Aide\Field ACQ Ordinance Aide\src\lib\data\municipal_directory.csv'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the CSV
match = re.search(r'County,Municipality,Municipality URL,Muni Forms.*?(?=",\s*"[A-Za-z]+":|\\n\\n|"\})', content, re.DOTALL)
if match:
    csv_raw = match.group(0)
    # The string might have JSON escaping, let's unescape it
    try:
        csv_data = ast.literal_eval('"' + csv_raw.replace('"', '\\"') + '"')
    except Exception:
        # If it fails, just replace \n manually
        csv_data = csv_raw.replace('\\n', '\n').replace('\\"', '"')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(csv_data)
    print(f"Extracted {len(csv_data)} bytes of CSV data using raw regex search")
else:
    print("Not found")
