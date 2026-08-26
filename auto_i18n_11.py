import os
import sys
import json
import urllib.request
import re
import time

API_KEY = os.environ.get("GEMINI_API_KEY")
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"

def call_gemini(prompt):
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "systemInstruction": {
            "parts": [{"text": "You are a senior React engineer. Return only valid JSON. Do not use markdown blocks like ```json."}]
        },
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.0
        }
    }
    
    req = urllib.request.Request(URL, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                return json.loads(result['candidates'][0]['content']['parts'][0]['text'])
        except Exception as e:
            print(f"Error calling Gemini: {e}. Retrying in 10 seconds...")
            time.sleep(10)
    return None

def process_file(filepath):
    print(f"Processing {filepath}...")
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the namespace to use (e.g. filename without extension)
    filename = os.path.basename(filepath)
    namespace = filename.split('.')[0]
    namespace = "".join(x.capitalize() for x in re.split(r'[^a-zA-Z0-9]', namespace) if x)

    prompt = f"""
I have a React (Next.js) TSX file. I need to internationalize it using `next-intl`.
Your task is to:
1. Find all Polish hardcoded texts in the file (JSX text, placeholders, titles, aria-labels, comments, etc).
2. Generate translation keys for them. The namespace is `{namespace}`.
3. Generate the updated TSX file content.
   - Add `import {{ useTranslations }} from 'next-intl';`
   - Add `const t = useTranslations('{namespace}');` inside the component.
   - Replace Polish strings with `t('key')` or `{{t('key')}}` as appropriate.
   - TRANSLATE OR REMOVE ALL POLISH COMMENTS. No Polish words should remain in the file anywhere, not even in comments!
   - IMPORTANT: If interpolating values, ensure they are strictly strings or numbers (e.g., `{{ value: value || 0 }}` or `{{ value: String(value) }}`), because `null` or `undefined` is not allowed by next-intl.
4. Provide the English and Polish translations.

Return ONLY a JSON object with this exact structure:
{{
  "updated_content": "Full updated TSX content",
  "translations": {{
    "pl": {{ "key1": "Polski tekst" }},
    "en": {{ "key1": "English text" }}
  }}
}}

File content:
{content}
"""
    result = call_gemini(prompt)
    if not result:
        return

    # Write updated file
    with open(filepath, 'w') as f:
        f.write(result['updated_content'])

    # Update messages
    update_messages('pl', namespace, result['translations'].get('pl', {}))
    update_messages('en', namespace, result['translations'].get('en', {}))
    print(f"Done {filepath}")
    time.sleep(10) # Prevent 429

def update_messages(lang, namespace, new_translations):
    if not new_translations:
        return
    msg_path = f"/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/{lang}.json"
    if os.path.exists(msg_path):
        with open(msg_path, 'r') as f:
            msgs = json.load(f)
    else:
        msgs = {}

    if namespace not in msgs:
        msgs[namespace] = {}
    
    msgs[namespace].update(new_translations)

    with open(msg_path, 'w') as f:
        json.dump(msgs, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    files = [
        "_tester/_base/.silnik/src/components/chat/chat-window/components/skill-test-card.tsx",
        "_tester/_base/.silnik/src/components/chat/chat-window/components/tts-hard-loading-screen.tsx",
        "_tester/_base/.silnik/src/components/dialogs/ApiKeysModal.tsx",
        "_tester/_base/.silnik/src/components/dialogs/CharacterDialog.tsx",
        "_tester/_base/.silnik/src/components/dialogs/DevelopmentPhaseModal.tsx",
        "_tester/_base/.silnik/src/components/dialogs/DiceDialog.tsx",
        "_tester/_base/.silnik/src/components/dialogs/JournalDialog.tsx"
    ]
    for file in files:
        process_file(file)
