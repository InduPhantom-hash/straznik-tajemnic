import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const endpoint = 'http://localhost:4050/api/imagen';
const sceneSpec = {
  schemaVersion: 1,
  subject: 'Niebieskie kombi zaparkowane na ulicy małego polskiego miasta',
  location: 'Polska, małe miasto, 1995 rok',
  eraContext: {
    schemaVersion: 1,
    sceneDate: null,
    effectiveYear: 1995,
    countryCode: 'PL',
    regionProfile: 'PL',
    source: 'user-selection',
    rulesVersion: '1.0.0',
  },
  entities: [
    {
      id: 'car',
      name: 'niebieskie kompaktowe kombi z 1995 roku',
      kind: 'vehicle',
      placement: 'zaparkowane przy krawężniku',
    },
    {
      id: 'street',
      name: 'brukowana ulica małego polskiego miasta',
      kind: 'environment',
    },
  ],
  spatialRelations: [
    { subjectId: 'car', relation: 'on', objectId: 'street' },
  ],
  forbidden: [
    'biurko we wnętrzu samochodu',
    'monitor komputerowy na desce rozdzielczej',
    'drukarka lub komputer ustawione jak w biurze',
    'sprzęt biurowy widoczny przez szybę',
    'współczesny samochód',
  ],
};

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Documentary street photograph. One ordinary blue compact station wagon parked at the curb. Through the windows show only normal car seats, steering wheel and an uncluttered dashboard. No cargo or objects displayed inside the car.',
    style: 'location',
    isMythos: false,
    seed: `paid-car-regression-${Date.now()}`,
    sceneSpec,
  }),
});

const data = await response.json();
if (!response.ok || !data.imageUrl) {
  throw new Error(`Paid image test failed (${response.status}): ${JSON.stringify(data)}`);
}

const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(data.imageUrl);
if (!match) throw new Error('Image endpoint did not return a base64 data URL.');

const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1] === 'image/webp' ? 'webp' : 'png';
const outputDir = path.resolve('docs/audits/prompts');
const outputPath = path.join(outputDir, `paid-car-regression-2026-09-01.${extension}`);
const metadataPath = path.join(outputDir, 'paid-car-regression-2026-09-01.json');
await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, Buffer.from(match[2], 'base64'));
await writeFile(
  metadataPath,
  `${JSON.stringify({
    testedAt: new Date().toISOString(),
    endpoint,
    provider: data.provider,
    reportedCostUsd: data.cost,
    outputPath,
    sceneSpec,
  }, null, 2)}\n`
);

console.log(JSON.stringify({
  success: true,
  provider: data.provider,
  reportedCostUsd: data.cost,
  outputPath,
  metadataPath,
}));
