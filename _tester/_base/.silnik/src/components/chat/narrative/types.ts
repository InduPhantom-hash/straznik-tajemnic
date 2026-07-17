/**
 * NarrativeFormatter types - IND-144 micro 1/8 (extract z NarrativeFormatter.tsx)
 *
 * Leaf module bez deps. Reuse przez: parse-sections, render-*, formatter, index.
 */

export type SectionType =
  | 'narrative'
  | 'dialogue'
  | 'handout'
  | 'mechanic'
  | 'roll'
  | 'whisper'
  | 'perspective';

export type HandoutType =
  | 'newspaper'
  | 'letter'
  | 'telegram'
  | 'report'
  | 'diary'
  | 'book'
  | 'note';

export interface Section {
  type: SectionType;
  content: string;
  speaker?: string;
  handoutType?: HandoutType;
  characterName?: string; // dla type='perspective' - imię postaci kierowanej
  characterColor?: string; // opcjonalny kolor ramki
}
