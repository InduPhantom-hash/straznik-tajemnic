// Pure function - generuje losowy NPC z jednego z 4 szablonów (NPC_TEMPLATES).
// Optional `seed` param dla deterministycznych testów + sesja replay (wzór z IND-127 B5).

import type { NPC } from '@/lib/types';
import { NPC_TEMPLATES, type NpcTemplateKey } from '@/lib/data/npc';
import { DEFAULT_SKILLS } from '@/lib/data/npc';
import { calculateDerivedStats } from './derived-stats';
import { createSeededRandom } from '@/lib/utils/seedable-random';

// Profile Egriego (trójwymiarowość postaci)
const PHYSIOLOGICAL_DETAILS = [
  'Nerwowo wyciera druciane okulary o rąbek kamizelki',
  'Lekkie utykanie na lewą nogę, podpiera się hebanową laską',
  'Paznokcie pożółkłe od mocnego tytoniu i zapach nafty',
  'Nieustannie zerka przez lewe ramię, jakby spodziewał się ciosu',
  'Oczy zaczerwienione od bezsenności, suchy i chrapliwy kaszel',
  'Blada, niemal woskowa cera i nienaturalnie chłodne dłonie',
  'Zaciska szczęki przy trudnych pytaniach, tik nerwowy przy powiece',
  'Niezwykle staranny ubiór znoszony na mankietach i kołnierzu',
];

const SOCIOLOGICAL_STATUSES = [
  'Zubożała arystokracja desperacko broniąca pozorów prestiżu',
  'Drobny urzędnik miejski z dostępem do tajnych ksiąg meldunkowych',
  'Portowy robotnik zależny od łaski bezwzględnego majstra',
  'Szanowany akademicki wykładowca na krawędzi dyscyplinarnego zwolnienia',
  'Lokalny antykwariusz powiązany długami z podejrzanymi wierzycielami',
  'Śledczy ubezpieczeniowy pracujący na prowizji od wykrytych oszustw',
  'Zaufana służąca znająca intymne sekrety i grzechy swoich pracodawców',
  'Lekarz z prowincjonalnej kliniki zmagający się z brakami morfiny',
];

const PSYCHOLOGICAL_AGENDAS = [
  'Panicznie boi się, że badacze odkryją jego udział w zniknięciu archiwów',
  'Chce skierować podejrzenia na rywala, aby ocalić własną reputację',
  'Desperacko szuka pieniędzy na spłatę długu u ludzi z doków',
  'Pragnie zdobyć zaufanie badacza, by zyskać ochronę przed nocnymi gośćmi',
  'Ukrywa wiedzę o dziwnych obrzędach w obawie przed linczem społeczności',
  'Uważa, że badacze są agentami sił, które prześladują jego rodzinę',
  'Szuka sojusznika do bezpiecznej ucieczki z miasta przed końcem tygodnia',
  'Maniakalnie gromadzi informacje o zakazanych księgach, ignorując ryzyko',
];

export function generateRandomNPC(seed?: number): Partial<NPC> {
  const rng = createSeededRandom(seed);
  const templateKeys = Object.keys(NPC_TEMPLATES) as NpcTemplateKey[];
  const templateKey = templateKeys[Math.floor(rng() * templateKeys.length)];
  const template = NPC_TEMPLATES[templateKey];
  const stats: Record<string, number> = { ...template.stats };
  const skills = { ...template.skills, ...DEFAULT_SKILLS };

  // Losowe modyfikacje ±10 dla każdej statystyki bazowej
  for (const key of Object.keys(stats)) {
    stats[key] = stats[key] + Math.floor(rng() * 20) - 10;
  }

  const derived = calculateDerivedStats(stats as Partial<NPC>);

  const physiologicalDetail =
    PHYSIOLOGICAL_DETAILS[Math.floor(rng() * PHYSIOLOGICAL_DETAILS.length)];
  const sociologicalStatus =
    SOCIOLOGICAL_STATUSES[Math.floor(rng() * SOCIOLOGICAL_STATUSES.length)];
  const psychologicalAgenda =
    PSYCHOLOGICAL_AGENDAS[Math.floor(rng() * PSYCHOLOGICAL_AGENDAS.length)];

  return {
    type:
      templateKey === 'monster'
        ? 'monster'
        : rng() > 0.5
          ? 'neutral'
          : 'friendly',
    occupation: template.name,
    ...(stats as Pick<
      NPC,
      'str' | 'dex' | 'con' | 'app' | 'pow' | 'edu' | 'siz' | 'int' | 'luck'
    >),
    ...derived,
    maxHp: derived.hp,
    maxSan: derived.san,
    maxMp: derived.mp,
    skills,
    status: 'alive',
    physiologicalDetail,
    sociologicalStatus,
    psychologicalAgenda,
  };
}
