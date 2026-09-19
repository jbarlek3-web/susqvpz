import csv
import json

input_path = r'c:\Users\Shadow 13 Solutions\Desktop\Field ACQ Ordinance Aide\Field ACQ Ordinance Aide\src\lib\data\municipal_directory.csv'
output_path = r'c:\Users\Shadow 13 Solutions\Desktop\Field ACQ Ordinance Aide\Field ACQ Ordinance Aide\src\lib\data\municipal_documents.json'

with open(input_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(rows, f, indent=2)
