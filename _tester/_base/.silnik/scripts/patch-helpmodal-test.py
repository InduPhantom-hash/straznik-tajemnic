import re

path = 'src/components/help-modal/HelpModal.test.tsx'
with open(path, 'r') as f:
    code = f.read()

code = code.replace('/Pomoc & Encyklopedia Badacza/i', '/HelpModal.title/i')
code = code.replace('/Polska \\(1990–2000\\)/i', '/EpochWikiTab.datasetEpoch/i')
code = code.replace('/Zasady & Bestiariusz/i', '/HelpModal.tabRulesBestiary/i')
code = code.replace('/Testy Umiejętności \\(k100\\)/i', '/BestiaryRulesTab.titleMechanics/i')
code = code.replace('/Asystent AI/i', '/HelpModal.tabAssistant/i')
code = code.replace('/Asystent RAG Pomocy:/i', '/HelpAssistantTab.title/i')
code = code.replace('/Zamknij/i', '/HelpModal.closeTitle/i')

with open(path, 'w') as f:
    f.write(code)

print("HelpModal.test.tsx patched!")
