import json
import re

path = r'C:\Users\Shadow 13 Solutions\.gemini\antigravity\brain\bfec4a29-48de-4670-8fd1-ba5c13123263\.system_generated\logs\transcript_full.jsonl'
output_path = r'C:\Users\Shadow 13 Solutions\Desktop\Field ACQ Ordinance Aide\Field ACQ Ordinance Aide\src\lib\data\municipal_directory.csv'

csv_data = ""
with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'USER_INPUT' in line and 'County,Municipality,Municipality URL,Muni Forms' in line:
                # Need to extract from the JSON
                # The structure depends on the jsonl format
                if isinstance(data, dict):
                    # just extract the raw text
                    text_content = json.dumps(data)
                    match = re.search(r'(County,Municipality,Municipality URL,Muni Forms.*?)(\n\n|$)', text_content, re.DOTALL | re.IGNORECASE)
                    if not match:
                        # Try to find it in strings
                        match = re.search(r'(County,Municipality,Municipality URL,Muni Forms.*?)(\"|\n\n)', text_content)
                    
                    if match:
                        csv_data = match.group(1).replace('\\n', '\n')
                        break
        except Exception as e:
            pass

if not csv_data:
    # Fallback to pure regex on file
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        match = re.search(r'(County,Municipality,Municipality URL,Muni Forms.*?)(?:\"\n|\\n\\n)', content, re.DOTALL)
        if match:
            csv_data = match.group(1).replace('\\n', '\n')

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(csv_data)

print(f"Extracted {len(csv_data)} bytes of CSV data")
