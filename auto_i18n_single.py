import os
import sys
import json
import urllib.request
import re

API_KEY = os.environ.get("GEMINI_API_KEY")
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"

def call_gemini(prompt):
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.0
        }
    }
    req = urllib.request.Request(URL, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as response:
        res = json.loads(response.read().decode("utf-8"))
        return res["candidates"][0]["content"]["parts"][0]["text"]

def process_file(filename):
    print(f"Processing {filename}...")
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    ns = ''.join(x.capitalize() for x in re.split(r'[^a-zA-Z0-9]', os.path.basename(filename).split('.')[0]) if x)

    prompt = f"""
You are an expert React/Next.js i18n developer.
Refactor the following TSX file to use `next-intl`.
1. Extract all Polish texts (including from comments, alt attributes, placeholders, titles, generic texts) into English keys.
2. Replace them in the code with `t('key')` where `const t = useTranslations('{ns}');`.
3. If it's a component, add the hook. If it's outside, or in a type, ignore it or translate it appropriately.
4. REMOVE ALL POLISH COMMENTS. No Polish words should remain anywhere in the file.
5. Provide the output in JSON format with two keys:
{{
  "code": "the full refactored TSX code",
  "pl": {{ "key1": "Polski tekst" }},
  "en": {{ "key1": "English text" }}
}}
Respond ONLY with the JSON object, nothing else.

Code:
```tsx
{content}
```
"""
    
    try:
        text = call_gemini(prompt)
        data = json.loads(text.strip())
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(data['code'])
            
        def update_json(lang, new_data):
            msg_path = f"/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/{lang}.json"
            with open(msg_path, 'r') as f:
                msgs = json.load(f)
            if ns not in msgs: msgs[ns] = {}
            msgs[ns].update(new_data)
            with open(msg_path, 'w') as f:
                json.dump(msgs, f, ensure_ascii=False, indent=2)
                
        update_json('pl', data['pl'])
        update_json('en', data['en'])
        print(f"Successfully processed {filename}")
        
    except Exception as e:
        print(f"Failed processing {filename}: {e}")
        sys.exit(1)

if __name__ == '__main__':
    process_file(sys.argv[1])
