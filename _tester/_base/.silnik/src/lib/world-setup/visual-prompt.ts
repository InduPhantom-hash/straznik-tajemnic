import { buildEraNarrativeRules } from '@/lib/era';
import type { VisualSceneSpec } from './types';
import { assertVisualSceneSpec } from './validation';

export function compileVisualScenePrompt(spec: VisualSceneSpec): string {
  assertVisualSceneSpec(spec);
  const entityLines = spec.entities.map(
    (entity) => `- ${entity.id}: ${entity.name} (${entity.kind})${entity.placement ? `, położenie: ${entity.placement}` : ''}`
  );
  const relationLines = spec.spatialRelations.map(
    (relation) => `- ${relation.subjectId} ${relation.relation} ${relation.objectId}`
  );

  return [
    buildEraNarrativeRules(spec.eraContext),
    `TEMAT: ${spec.subject}`,
    `MIEJSCE: ${spec.location}`,
    'ENCJE:',
    ...entityLines,
    'RELACJE PRZESTRZENNE:',
    ...relationLines,
    `ZAKAZY: ${spec.forbidden.join('; ')}`,
    spec.mythosException
      ? `JAWNY WYJĄTEK MYTHOS: ${spec.mythosException.reason}`
      : 'Brak wyjątku Mythos. Nie dodawaj elementów nadprzyrodzonych.',
  ].join('\n');
}
