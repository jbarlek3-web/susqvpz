import json
import re

path = r'C:\Users\Shadow 13 Solutions\.gemini\antigravity\brain\bfec4a29-48de-4670-8fd1-ba5c13123263\.system_generated\logs\transcript_full.jsonl'
output_path = r'C:\Users\Shadow 13 Solutions\Desktop\Field ACQ Ordinance Aide\Field ACQ Ordinance Aide\src\lib\data\municipal_directory.csv'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Try to find the actual massive CSV
matches = re.findall(r'(County,Municipality,Municipality URL,Muni Forms.*?(?:Adams.*?York.*?|.*?(?:Adams|Allegheny|Bucks|Chester|Delaware|Montgomery|Philadelphia).*?))(?:\n\n|\"\}|\\n\\n)', text, re.DOTALL | re.IGNORECASE)

if not matches:
    # Let's just find anything with 'County,Municipality,Municipality URL,Muni Forms' that is long
    matches = re.findall(r'(County,Municipality,Municipality URL,Muni Forms.*?)(\"|\n\n|\\n\\n)', text, re.DOTALL)
    matches = [m[0] for m in matches]

# Find the longest match
if matches:
    longest_match = max(matches, key=len)
    csv_data = longest_match.replace('\\n', '\n')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(csv_data)
    print(f"Extracted {len(csv_data)} bytes of CSV data")
else:
    print("No matches found")
