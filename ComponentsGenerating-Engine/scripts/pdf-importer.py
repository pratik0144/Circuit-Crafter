import PyPDF2
import json
import os
import re

PDF_PATH = '/Users/pratikpotadar/Downloads/CircuitCrafter_Component_Library.pdf'
OUTPUT_DIR = '../metadata'

def generate_stubs():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    with open(PDF_PATH, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ''
        # We only need the first few pages for the 557 components names
        for i in range(min(15, len(reader.pages))):
            text += reader.pages[i].extract_text() + '\n'

    # Simple heuristic to find components:
    # They usually start with [PRIORITY], [EXISTS], or are just capitalized names following a category header.
    # Since parsing this perfectly without tables is impossible, we will extract lines that look like components.
    
    lines = text.split('\n')
    components_found = 0
    current_category = "Uncategorized"
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Detect category headers like "Passive Components (28 components)"
        cat_match = re.search(r'([A-Za-z &]+) \(\d+ components\)', line)
        if cat_match:
            current_category = cat_match.group(1).strip()
            continue
            
        # Ignore boilerplate
        if line.startswith('Part') or line.startswith('Circuit Crafter') or line.startswith('Legend'):
            continue
            
        # Clean up the name
        name = line.replace('[EXISTS]', '').replace('[PRIORITY]', '').strip()
        
        # Heuristic: Valid component names shouldn't be too long
        if 2 < len(name) < 40 and not name.startswith('['):
            comp_id = f"gen_{components_found+1:03d}_{name.split()[0].lower()}"
            comp_id = re.sub(r'[^a-z0-9_]', '', comp_id)
            
            stub = {
                "id": comp_id,
                "displayName": name,
                "category": current_category,
                "family": "DipIc", # Fallback
                "pinCount": 4, # Fallback
                "layout": {
                    "left": ["PIN1", "PIN2"],
                    "right": ["PIN3", "PIN4"],
                    "top": [],
                    "bottom": []
                },
                "packageType": "UNKNOWN",
                "keywords": name.lower().split()
            }
            
            # Write stub
            # with open(os.path.join(OUTPUT_DIR, f"{comp_id}.json"), 'w') as f:
            #     json.dump(stub, f, indent=2)
                
            components_found += 1
            
    print(f"Scanned PDF and extracted {components_found} component names.")
    print("WARNING: The PDF does NOT contain pin mappings for Part 1.")
    print("You will need to manually populate the pins, or use the CSV logic instead.")

if __name__ == '__main__':
    generate_stubs()
