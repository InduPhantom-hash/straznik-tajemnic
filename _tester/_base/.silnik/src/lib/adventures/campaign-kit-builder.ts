import JSZip from 'jszip';
import { AdventureContext } from '../adventures-data';

export interface CampaignKitOptions {
  includeMermaidDiagram?: boolean;
  includeHandoutFolder?: boolean;
  includeAudioFolder?: boolean;
  notes?: string;
}

/**
 * Buduje spójny pakiet ZIP Campaign Kit dla Mistrza Gry CoC 7e
 */
export async function buildCampaignKitZip(
  adventure: AdventureContext,
  options: CampaignKitOptions = {}
): Promise<Blob> {
  const zip = new JSZip();

  const titleSafe = adventure.title.replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_');

  // 1. Podręcznik scenariusza (SCENARIUSZ.md)
  const scenarioMarkdown = generateScenarioMarkdown(adventure, options);
  zip.file(`SCENARIUSZ_${titleSafe}.md`, scenarioMarkdown);

  // 2. Dramatis Personae (karty NPC)
  if (adventure.graph?.npcs && adventure.graph.npcs.length > 0) {
    const npcFolder = zip.folder('dramatis_personae');
    adventure.graph.npcs.forEach((npc) => {
      const npcFileSafe = npc.name.replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_');
      const npcContent = [
        `# ${npc.name}`,
        `**Rola:** ${npc.description}`,
        '',
        '## Statystyki CoC 7e RAW',
        npc.statsSummary || 'Standardowe statystyki CoC 7e: STR 50, CON 50, SIZ 50, DEX 50, INT 60, POW 50, HP 10, SAN 50',
        '',
        '## Sekrety i Motywacje (Tylko dla MG)',
        `> ⚠️ **ŚCIŚLE TAJNE:** ${npc.secret || 'Brak ukrytych motywów.'}`,
        '',
      ].join('\n');
      npcFolder?.file(`${npcFileSafe}.md`, npcContent);
    });
  }

  // 3. Graf Śledztwa (Clue Web)
  if (adventure.graph && (options.includeMermaidDiagram ?? true)) {
    const clueWebMermaid = generateClueWebMermaid(adventure);
    zip.file('GRAF_SLEDZTWA_CLUE_WEB.mmd', clueWebMermaid);
    
    // Wersja HTML z podglądem
    const clueWebHtml = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Graf Śledztwa: ${adventure.title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body { background-color: #0d0b09; color: #d4af37; font-family: 'Courier New', monospace; padding: 20px; }
    h1 { border-bottom: 2px solid #b8860b; padding-bottom: 10px; }
  </style>
</head>
<body>
  <h1>Graf Śledztwa (Clue Web) &mdash; ${adventure.title}</h1>
  <p><em>Zew Cthulhu 7ed &bull; Pakiet Mistrza Gry</em></p>
  <div class="mermaid">
${clueWebMermaid}
  </div>
  <script>mermaid.initialize({ startOnLoad: true, theme: 'dark' });</script>
</body>
</html>`;
    zip.file('GRAF_SLEDZTWA_PODGLAD.html', clueWebHtml);
  }

  // 4. Katalog rekwizytów (handouts)
  const handoutsFolder = zip.folder('handouts');
  handoutsFolder?.file(
    'INSTRUKCJA_REKWIZYTOW.txt',
    `Pakiet rekwizytów (Handoutów) do scenariusza: ${adventure.title}\n\nWydrukuj lub zaprezentuj graczom w trakcie odkrywania kolejnych wskazówek.`
  );
  if (adventure.graph?.clues) {
    adventure.graph.clues.forEach((clue, idx) => {
      const clueSafe = clue.name.replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_');
      handoutsFolder?.file(
        `Handout_${idx + 1}_${clueSafe}.txt`,
        `[REKWIZYT DLA BADACZY]\nNazwa: ${clue.name}\n\nOpis / Treść:\n${clue.description}\n`
      );
    });
  }

  // 5. Katalog audio (notatka o muzyce)
  const audioFolder = zip.folder('audio');
  audioFolder?.file(
    'SUGEROWANA_SZYNA_DZWIEKOWA.txt',
    `Szyna Dźwiękowa i Rekwizyty Audio do sesji: ${adventure.title}\n\n` +
    `Epoka: ${adventure.eraLabel || adventure.era}\n` +
    `Styl: Dark Ambient / 1920s Jazz / Złowrogie drony\n\n` +
    `Sugerowane motywy:\n` +
    `- Wejście w ciemność: Niskie drony wiolonczelowe, gramofonowy szum igły 78 RPM\n` +
    `- Konfrontacja z kultem: Monotonne bębnienie i szepty w języku Aklo\n` +
    `- Szaleństwo (SAN Loss): Pisk w uszach, zakłócenia częstotliwości radiowych\n`
  );

  return await zip.generateAsync({ type: 'blob' });
}

function generateScenarioMarkdown(adventure: AdventureContext, options: CampaignKitOptions): string {
  const lines: string[] = [
    `# ${adventure.title}`,
    `*Zew Cthulhu 7ed &bull; Podręcznik Prowadzenia (Campaign Kit)*`,
    '',
    `**Epoka:** ${adventure.eraLabel || adventure.era} | **Rok:** ${adventure.yearRange} | **Lokalizacja:** ${adventure.location} (${adventure.country})`,
    `**Ton:** ${adventure.tone || 'purist'} | **Trudność:** ${adventure.difficulty || 'normal'} | **Liczba sesji:** ${adventure.estimatedSessions || '1-2 sesje'}`,
    '',
    '---',
    '',
    '## 1. WPROWADZENIE DLA MISTRZA GRY (Tylko dla Twoich Oczu)',
    adventure.customDescription || adventure.description || 'Brak dodatkowego opisu założeń.',
    '',
    '## 2. ZAHACZKA DLA BADACZY (Co wiedzą na starcie)',
    `> "${adventure.hook || adventure.description}"`,
    '',
    '## 3. SUGEROWANE PROFESJE I ARCHETYPY BADACZY',
    `**Rekomendowane profesje:** ${adventure.suggestedOccupations?.join(', ') || 'Dowolne'}`,
    `**Archetypy:** ${adventure.suggestedArchetypes?.join(', ') || 'Klasyczne'}`,
    '',
    '## 4. KLUCZOWE LOKACJE',
  ];

  if (adventure.graph?.locations) {
    adventure.graph.locations.forEach((loc) => {
      lines.push(`### ${loc.name}`);
      lines.push(`**Opis:** ${loc.description}`);
      if (loc.atmosphere) {
        lines.push(`*Klimat/Sensoryka:* ${loc.atmosphere}`);
      }
      lines.push('');
    });
  }

  lines.push('## 5. REKWIZYTY I WSKAZÓWKI (CLUES)');
  if (adventure.graph?.clues) {
    adventure.graph.clues.forEach((clue) => {
      lines.push(`- **${clue.name}**: ${clue.description}${clue.isRedHerring ? ' *(Fałszywy trop)*' : ''}`);
    });
  }

  lines.push('');
  lines.push('---');
  lines.push('*Wygenerowano automatycznie w Strażniku Tajemnic AI &mdash; System Campaign Kit CoC 7e RAW*');

  return lines.join('\n');
}

function generateClueWebMermaid(adventure: AdventureContext): string {
  const lines: string[] = ['graph TD'];

  if (adventure.graph?.connections && adventure.graph.connections.length > 0) {
    adventure.graph.connections.forEach((conn) => {
      const fromSafe = conn.fromId.replace(/[^a-zA-Z0-9_]/g, '_');
      const toSafe = conn.toId.replace(/[^a-zA-Z0-9_]/g, '_');
      const desc = conn.description.replace(/["']/g, '');
      lines.push(`  ${fromSafe} -->|"${desc}"| ${toSafe}`);
    });
  } else {
    lines.push('  Start["Początek śledztwa"] --> Clue1["Pierwsza wskazówka"]');
    lines.push('  Clue1 --> Culmination["Kulminacja"]');
  }

  return lines.join('\n');
}
