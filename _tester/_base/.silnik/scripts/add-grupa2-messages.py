#!/usr/bin/env python3
"""Etap 6 Grupa 2: dodaje namespace'y FirstRunWizard/StepGeminiKey/StepContentSources/
StepUploadRulebook/StepWelcomeGM (kopie z Onboarding.*) i nowe klucze CharacterWizard."""
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
MESSAGES = os.path.join(ROOT, '..', 'messages')

CHARACTER_WIZARD_PL = {
    "adventureLabel": "📖 Przygoda: {title} ({location})",
    "halfFifthHint": "Pod każdą wartością: <half>½:XX</half> = połowa wartości (trudny test), <fifth>⅕:XX</fifth> = piąta część (ekstremalny test)",
    "rollOne": "Rzuć",
    "rerollOnce": "Przerzuć (1×)",
    "rerollUsed": "przerzut wykorzystany",
    "lowStatHintTitle": "Niska cecha to nie błąd.",
    "lowStatHintBody": "Badacz ze słabym ciałem czy chwiejną psychiką bywa ciekawszy niż ktoś dobry we wszystkim - jego braki napędzają fabułę i trudne wybory. W Zew Cthulhu zwykli ludzie mierzą się z grozą ponad ich siły; niedoskonałość jest częścią klimatu, nie przeszkodą.",
    "ageLabel": "Wiek: {age} lat",
    "physPenalty": "-{count} (S/KON/ZR)",
    "appPenalty": "-{count} WYG",
    "eduChecksBonus": "+{count} test WYK",
    "luckReroll": "Przerzut szczęścia",
    "ageModifiersWarning": "⚠️ Modyfikatory wieku:",
    "agePenaltiesPending": "Kary za wiek nie są jeszcze odjęte od cech.",
    "applyAgePenalties": "Zastosuj kary wieku",
    "agePenaltiesPreview": "Po kliknięciu: S-{str}, KON-{con}, ZR-{dex}, WYG-{app}",
    "eduDevelopmentTest": "📚 Test rozwoju Wykształcenia:",
    "eduDevelopmentDescription": "Starsza postać uczyła się dłużej, więc ma szansę podbić swoje Wykształcenie. Rzucasz {count} raz(y), żeby sprawdzić, czy te lata nauki dały owoc - i o ile.",
    "eduSuccess": "Sukces!",
    "eduRollSuccess": "Rzut {roll} > {edu} - WYK +{bonus} → {newEdu}",
    "eduRollFailure": "Rzut {roll} ≤ {edu} - WYK bez zmian.",
    "rollEduTest": "Rzuć test WYK",
    "eduTestHint": "Jeśli się powiedzie, Wykształcenie rośnie o losową wartość (do maksimum 99). Jeśli nie - zostaje bez zmian.",
    "hpAbbr": "PŻ",
    "sanAbbr": "PR",
    "mpAbbr": "PM",
    "damageBonusAbbr": "MO",
    "buildLabel": "Krzepa",
    "moveLabel": "Ruch",
    "recommendedForArchetype": "Rekomendowane dla archetypu",
    "noDescription": "Brak opisu",
    "occupationPoints": "Punkty zawodowe: {count}",
    "distributing": "⏳ Rozdzielam...",
    "distributeWithAi": "🤖 Rozdziel punkty AI",
    "occupationPointsLabel": "Punkty zawodowe:",
    "pointsUnit": "pkt",
    "intFormula": "INT × 2 = {value} × 2",
    "aiRecommendedLegend": "rekomendowane przez AI",
    "pointsSpent": "(wydano {used} z {available})",
    "overLimit": "⚠️ Przekroczono limit!",
    "baseShort": "baza:",
    "pointsAdded": "+{count} pkt",
    "namePlaceholder": "np. John Smith",
    "selectPlaceholder": "Wybierz...",
    "female": "Kobieta",
    "birthplace": "Miejsce urodzenia",
    "birthplacePlaceholder": "np. Boston, Massachusetts",
    "ideologyLabel": "Ideologia / Przekonania",
    "traitsLabel": "Przymioty",
    "statsSummary": "S:{str} KON:{con} BC:{siz} ZR:{dex} WYG:{app} INT:{int} MOC:{pow} WYK:{edu}",
    "stepNameConcept": "Koncepcja",
    "stepNameStats": "Cechy",
    "stepNameOccupation": "Zawód",
    "stepNameSkills": "Umiejętności",
    "stepNameHistory": "Historia",
    "stepNameEquipment": "Wyposażenie",
    "wizardEyebrow": "Miskatonic University · Akta nowego badacza",
    "wizardTitle": "Kreator Badacza",
}

CHARACTER_WIZARD_EN = {
    "adventureLabel": "📖 Adventure: {title} ({location})",
    "halfFifthHint": "Below each value: <half>½:XX</half> = half the value (hard test), <fifth>⅕:XX</fifth> = one fifth (extreme test)",
    "rollOne": "Roll",
    "rerollOnce": "Reroll (1×)",
    "rerollUsed": "reroll used",
    "lowStatHintTitle": "A low score is not a flaw.",
    "lowStatHintBody": "An investigator with a frail body or a fragile mind is often more interesting than someone good at everything - their shortcomings drive the story and hard choices. In Call of Cthulhu ordinary people face horror beyond their strength; imperfection is part of the mood, not an obstacle.",
    "ageLabel": "Age: {age}",
    "physPenalty": "-{count} (STR/CON/DEX)",
    "appPenalty": "-{count} APP",
    "eduChecksBonus": "+{count} EDU checks",
    "luckReroll": "Luck reroll",
    "ageModifiersWarning": "⚠️ Age modifiers:",
    "agePenaltiesPending": "Age penalties have not been subtracted from the scores yet.",
    "applyAgePenalties": "Apply age penalties",
    "agePenaltiesPreview": "On click: STR-{str}, CON-{con}, DEX-{dex}, APP-{app}",
    "eduDevelopmentTest": "📚 Education development check:",
    "eduDevelopmentDescription": "An older investigator has studied longer, so their Education may improve. You roll {count} time(s) to see whether those years of study paid off - and by how much.",
    "eduSuccess": "Success!",
    "eduRollSuccess": "Roll {roll} > {edu} - EDU +{bonus} → {newEdu}",
    "eduRollFailure": "Roll {roll} ≤ {edu} - EDU unchanged.",
    "rollEduTest": "Roll EDU check",
    "eduTestHint": "On a success, Education increases by a random amount (up to a maximum of 99). On a failure it stays unchanged.",
    "hpAbbr": "HP",
    "sanAbbr": "SAN",
    "mpAbbr": "MP",
    "damageBonusAbbr": "DB",
    "buildLabel": "Build",
    "moveLabel": "Move",
    "recommendedForArchetype": "Recommended for the archetype",
    "noDescription": "No description",
    "occupationPoints": "Occupation points: {count}",
    "distributing": "⏳ Distributing...",
    "distributeWithAi": "🤖 Distribute points with AI",
    "occupationPointsLabel": "Occupation points:",
    "pointsUnit": "pts",
    "intFormula": "INT × 2 = {value} × 2",
    "aiRecommendedLegend": "recommended by AI",
    "pointsSpent": "(spent {used} of {available})",
    "overLimit": "⚠️ Limit exceeded!",
    "baseShort": "base:",
    "pointsAdded": "+{count} pts",
    "namePlaceholder": "e.g. John Smith",
    "selectPlaceholder": "Select...",
    "female": "Female",
    "birthplace": "Birthplace",
    "birthplacePlaceholder": "e.g. Boston, Massachusetts",
    "ideologyLabel": "Ideology / Beliefs",
    "traitsLabel": "Traits",
    "statsSummary": "STR:{str} CON:{con} SIZ:{siz} DEX:{dex} APP:{app} INT:{int} POW:{pow} EDU:{edu}",
    "stepNameConcept": "Concept",
    "stepNameStats": "Stats",
    "stepNameOccupation": "Occupation",
    "stepNameSkills": "Skills",
    "stepNameHistory": "History",
    "stepNameEquipment": "Equipment",
    "wizardEyebrow": "Miskatonic University · New investigator files",
    "wizardTitle": "Investigator Creator",
}

for lang, cw_new in (("pl", CHARACTER_WIZARD_PL), ("en", CHARACTER_WIZARD_EN)):
    path = os.path.join(MESSAGES, f"{lang}.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    onboarding = data["Onboarding"]

    data["FirstRunWizard"] = {
        "steps": onboarding["steps"],
        "gameWelcome": onboarding["gameWelcome"],
        "firstRun": onboarding["firstRun"],
        "gameWelcomeDescription": onboarding["gameWelcomeDescription"],
        "firstRunDescription": onboarding["firstRunDescription"],
    }
    data["StepGeminiKey"] = onboarding["gemini"]
    data["StepContentSources"] = onboarding["sources"]
    data["StepUploadRulebook"] = onboarding["upload"]
    data["StepWelcomeGM"] = onboarding["gm"]

    for key, value in cw_new.items():
        assert key not in data["CharacterWizard"], f"{lang}: {key} już istnieje"
        data["CharacterWizard"][key] = value

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"✓ {lang}.json: FirstRunWizard({len(data['FirstRunWizard'])}), "
          f"StepGeminiKey({len(data['StepGeminiKey'])}), "
          f"StepContentSources({len(data['StepContentSources'])}), "
          f"StepUploadRulebook({len(data['StepUploadRulebook'])}), "
          f"StepWelcomeGM({len(data['StepWelcomeGM'])}), "
          f"CharacterWizard +{len(cw_new)}")
