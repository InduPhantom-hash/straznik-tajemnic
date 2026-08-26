import re
import json

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/campaign-clock.tsx', 'r') as f:
    content = f.read()

# Make it translatable
if "useTranslations" not in content:
    content = content.replace("import { Clock, Calendar, CloudFog } from 'lucide-react';", "import { Clock, Calendar, CloudFog } from 'lucide-react';\nimport { useTranslations } from 'next-intl';")
    content = content.replace("import { Moon, Sun, Clock, Calendar, CloudFog } from 'lucide-react';", "import { Moon, Sun, Clock, Calendar, CloudFog } from 'lucide-react';\nimport { useTranslations } from 'next-intl';")

# Inside CampaignClock
content = re.sub(
    r'(export function CampaignClock\(\{.*?\}\s*:\s*CampaignClockProps\)\s*\{)',
    r'\1\n  const t = useTranslations(\'CampaignClock\');',
    content,
    flags=re.DOTALL
)

# Moon phases mapping inside component is better, but it's defined outside. We can move it inside or just use t(`moon.${moonPhase}`)
content = content.replace("MOON_PHASE_NAMES[moonPhase]", "t(`moon.${moonPhase}`)")
# Remove the old MOON_PHASE_NAMES constant
content = re.sub(r'const MOON_PHASE_NAMES: Record<MoonPhase, string> = \{.*?\};', '', content, flags=re.DOTALL)

# Weather is dynamic from timeManager, but timeManager uses Polish by default. 
# We should translate weather if it matches known Polish weather, or just leave it for now and fix timeManager.

# "Chronometr Kampanii"
content = content.replace(">Chronometr Kampanii<", ">{t('title')}<")
content = content.replace(">\n          Chronometr Kampanii\n        </h3>", ">\n          {t('title')}\n        </h3>")
content = content.replace(">Noc<", ">{t('night')}<")
content = content.replace(">Dzień<", ">{t('day')}<")
content = content.replace(">Księżyc<", ">{t('moonLabel')}<")
content = content.replace(">Doba<", ">{t('dayLabel')}<")
content = content.replace("title={`Pogoda: ${weather}`}", "title={`${t('weather')}: ${weather}`}")
content = content.replace("title={`Faza księżyca: ${MOON_PHASE_NAMES[moonPhase]}`}", "title={`${t('moonLabel')}: ${t(`moon.${moonPhase}`)}`}")

with open('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/campaign-clock.tsx', 'w') as f:
    f.write(content)

pl = {
    "title": "Chronometr Kampanii",
    "night": "Noc",
    "day": "Dzień",
    "moonLabel": "Księżyc",
    "dayLabel": "Doba",
    "weather": "Pogoda",
    "moon": {
        "new": "Nów",
        "waxing_crescent": "Rosnący Sierp",
        "first_quarter": "Pierwsza Kwadra",
        "waxing_gibbous": "Rosnący Garbaty",
        "full": "Pełnia",
        "waning_gibbous": "Malejący Garbaty",
        "last_quarter": "Ostatnia Kwadra",
        "waning_crescent": "Malejący Sierp"
    }
}
en = {
    "title": "Campaign Clock",
    "night": "Night",
    "day": "Day",
    "moonLabel": "Moon",
    "dayLabel": "Day",
    "weather": "Weather",
    "moon": {
        "new": "New Moon",
        "waxing_crescent": "Waxing Crescent",
        "first_quarter": "First Quarter",
        "waxing_gibbous": "Waxing Gibbous",
        "full": "Full Moon",
        "waning_gibbous": "Waning Gibbous",
        "last_quarter": "Last Quarter",
        "waning_crescent": "Waning Crescent"
    }
}

def patch_json(filepath, lang, key, dict_data):
    with open(filepath, 'r') as f:
        data = json.load(f)
    data[key] = dict_data
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

patch_json('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/pl.json', 'pl', 'CampaignClock', pl)
patch_json('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/messages/en.json', 'en', 'CampaignClock', en)

