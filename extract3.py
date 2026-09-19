import json
import re

path = r'C:\Users\Shadow 13 Solutions\.gemini\antigravity\brain\bfec4a29-48de-4670-8fd1-ba5c13123263\.system_generated\logs\transcript_full.jsonl'
output_path = r'C:\Users\Shadow 13 Solutions\Desktop\Field ACQ Ordinance Aide\Field ACQ Ordinance Aide\src\lib\data\municipal_directory.csv'

with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'messages' in data:
                for msg in data['messages']:
                    if isinstance(msg.get('content'), str) and 'County,Municipality,Municipality URL,Muni Forms' in msg['content']:
                        # Extract the CSV portion
                        content = msg['content']
                        start = content.find('County,Municipality,Municipality URL,Muni Forms')
                        if start != -1:
                            # Assuming the CSV goes to the end of the message or is followed by some backticks
                            csv_data = content[start:]
                            # Strip off any closing backticks if it was inside a markdown block
                            csv_data = re.sub(r'```.*$', '', csv_data, flags=re.DOTALL)
                            with open(output_path, 'w', encoding='utf-8') as out:
                                out.write(csv_data)
                            print(f"Extracted {len(csv_data)} bytes of CSV data using message object parsing")
                            exit(0)
            
            # also check if the json object is just the message
            if isinstance(data, dict) and data.get('content') and isinstance(data['content'], str):
                if 'County,Municipality,Municipality URL,Muni Forms' in data['content']:
                    content = data['content']
                    start = content.find('County,Municipality,Municipality URL,Muni Forms')
                    if start != -1:
                        csv_data = content[start:]
                        csv_data = re.sub(r'```.*$', '', csv_data, flags=re.DOTALL)
                        with open(output_path, 'w', encoding='utf-8') as out:
                            out.write(csv_data)
                        print(f"Extracted {len(csv_data)} bytes of CSV data using direct message parsing")
                        exit(0)
        except Exception:
            pass
