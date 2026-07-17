/**
 * chat-history-sanitizer (demo-blocker fix, re-playtest 2026-06-24)
 *
 * Problem: w Zew Home (offline, jeden klucz Gemini) obrazy scen wracają jako
 * base64 `data:` URL-e. Intro obraz jest osadzany inline w `content` wiadomości
 * (`![Wprowadzenie](data:image/png;base64,...)`, useGameStart), a obrazy tur w
 * polu `generatedImages`. Gdy historia konwersacji leci do `/api/chat` jako
 * kontekst (useChat: `messages: [...messages, userMessage]`), jeden obraz ~2.4 MB
 * podbija input ponad limit 1 048 576 tokenów → HTTP 500 od tury 2.
 *
 * Fix: przed wysłaniem do API zamieniamy ciężkie base64 `data:` URL-e na lekkie
 * placeholdery, zachowując kontekst narracyjny (alt obrazu) i nietykając lekkich
 * http(s) URL-i (np. GCS). Sanityzujemy KOPIĘ - stan/UI renderuje z oryginału, więc
 * obrazy nadal widać w czacie.
 */

import type { Character, Message, NPC } from '@/lib/types';

/** Markdown obraz z base64 data: URL → `[ilustracja: alt]` (bez ~MB base64). */
const MARKDOWN_DATA_IMAGE = /!\[([^\]]*)\]\(data:[^)]*\)/gi;

/** Jak wyżej, ale przechwytuje też cały data: URL (grupa 2) - do zapisu na dysk. */
const MARKDOWN_DATA_IMAGE_CAPTURE = /!\[([^\]]*)\]\((data:[^)]*)\)/gi;

/** Zamienia markdown obrazy data: w treści na placeholder, zachowuje resztę tekstu. */
export function stripDataImagesFromContent(content: string): string {
  if (!content || !content.includes('data:')) return content;
  return content.replace(MARKDOWN_DATA_IMAGE, (_m, alt: string) =>
    alt && alt.trim() ? `[ilustracja: ${alt.trim()}]` : '[ilustracja]'
  );
}

/** True dla ciężkich base64 data: URL-i (te wycinamy z payloadu API). */
function isDataUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('data:');
}

/**
 * Zwraca kopię historii bez ciężkich base64 obrazów (content + generatedImages +
 * illustrations). Lekkie http(s) URL-e i cały tekst narracji zostają nietknięte.
 * Nie mutuje wejścia - bezpieczne do użycia tuż przed `JSON.stringify` payloadu.
 */
export function sanitizeHistoryForApi(messages: Message[]): Message[] {
  return messages.map((msg) => {
    const cleanedContent = stripDataImagesFromContent(msg.content);

    const cleanedGenerated = msg.generatedImages?.filter((u) => !isDataUrl(u));

    const cleanedIllustrations = msg.illustrations?.map((ill) =>
      isDataUrl(ill.imageUrl) ? { ...ill, imageUrl: '' } : ill
    );

    // Brak ciężkich pól → zwróć oryginał (mniej alokacji, stabilna referencja).
    if (
      cleanedContent === msg.content &&
      cleanedGenerated?.length === msg.generatedImages?.length &&
      cleanedIllustrations === msg.illustrations
    ) {
      return msg;
    }

    return {
      ...msg,
      content: cleanedContent,
      ...(msg.generatedImages ? { generatedImages: cleanedGenerated } : {}),
      ...(msg.illustrations ? { illustrations: cleanedIllustrations } : {}),
    };
  });
}

/**
 * Deskryptor obrazu base64 znalezionego w historii - kandydat do zapisu na dysk
 * jako osobny plik (zamiast inline w save.json, który przy obrazach "often"
 * przekracza limit body 10 MB → HTTP 500 przy zapisie gry).
 */
export interface SaveImageRef {
  /** Deterministyczna nazwa pliku bez rozszerzenia (np. 'm0c0', 'm2i0', 'm3g1'). */
  name: string;
  /** Pełny base64 data: URL. */
  dataUrl: string;
  /** alt z markdown (kind='content') - zachowany w placeholderze gdy upload padnie. */
  alt?: string;
  /** Indeks wiadomości w historii. */
  msgIndex: number;
  /** Skąd pochodzi base64: treść (markdown), illustrations[] albo generatedImages[]. */
  kind: 'content' | 'illustration' | 'generated';
  /** Indeks ilustracji (tylko kind='illustration'). */
  illIndex?: number;
  /** Indeks obrazu sceny (tylko kind='generated'). */
  genIndex?: number;
}

/** Kształt wiadomości wystarczający dla collect/apply (modal i lib Message pasują). */
type ImageBearingMessage = {
  content: string;
  illustrations?: Array<{ imageUrl: string }>;
  /** Obrazy scen tur (żywe pole, w przeciwieństwie do martwych illustrations). */
  generatedImages?: string[];
};

/** Rozszerzenie pliku z data: URL (jpeg→jpg, fallback png). */
export function dataUrlExtension(dataUrl: string): string {
  const m = /^data:image\/([a-zA-Z0-9.+-]+)/.exec(dataUrl);
  const ext = (m?.[1] || 'png').toLowerCase();
  if (ext === 'jpeg') return 'jpg';
  return ext.replace(/[^a-z0-9]/g, '') || 'png';
}

/**
 * Zbiera wszystkie base64 obrazy z historii: markdown w `content` (intro), pole
 * `generatedImages` (obrazy scen tur) oraz `illustrations` (legacy). Każdy dostaje
 * deterministyczną nazwę powiązaną z pozycją, by po uploadzie podmienić go na URL
 * pliku w tej samej wiadomości. Nie mutuje wejścia.
 */
export function collectSaveImages<T extends ImageBearingMessage>(
  messages: T[]
): SaveImageRef[] {
  const refs: SaveImageRef[] = [];
  messages.forEach((msg, msgIndex) => {
    if (msg.content && msg.content.includes('data:')) {
      const matches = [...msg.content.matchAll(MARKDOWN_DATA_IMAGE_CAPTURE)];
      matches.forEach((m, i) => {
        refs.push({
          name: `m${msgIndex}c${i}`,
          dataUrl: m[2],
          alt: m[1]?.trim() || undefined,
          msgIndex,
          kind: 'content',
        });
      });
    }
    msg.generatedImages?.forEach((url, genIndex) => {
      if (isDataUrl(url)) {
        refs.push({
          name: `m${msgIndex}g${genIndex}`,
          dataUrl: url,
          msgIndex,
          kind: 'generated',
          genIndex,
        });
      }
    });
    msg.illustrations?.forEach((ill, illIndex) => {
      if (isDataUrl(ill.imageUrl)) {
        refs.push({
          name: `m${msgIndex}i${illIndex}`,
          dataUrl: ill.imageUrl,
          msgIndex,
          kind: 'illustration',
          illIndex,
        });
      }
    });
  });
  return refs;
}

/**
 * Zwraca kopię historii z base64 podmienionym na URL-e plików (z `urlByName`).
 * Gdy dla danego ref brak URL-a (upload padł / wyłączony) - degraduje gracefully:
 * content → `[ilustracja: alt]`, illustration.imageUrl → '', generatedImages[] →
 * filtrowane (usuwane). Dzięki temu zapis nigdy nie niesie base64, a obrazy które
 * się uploadowały wracają po wczytaniu. Nie mutuje wejścia.
 */
export function applySaveImageUrls<T extends ImageBearingMessage>(
  messages: T[],
  refs: SaveImageRef[],
  urlByName: Record<string, string | null | undefined>
): T[] {
  return messages.map((msg, msgIndex) => {
    const myRefs = refs.filter((r) => r.msgIndex === msgIndex);
    if (myRefs.length === 0) return msg;

    let content = msg.content;
    const contentRefs = myRefs.filter((r) => r.kind === 'content');
    if (contentRefs.length > 0 && content.includes('data:')) {
      let i = 0;
      content = content.replace(
        MARKDOWN_DATA_IMAGE_CAPTURE,
        (_full, alt: string) => {
          const ref = contentRefs[i++];
          const url = ref ? urlByName[ref.name] : undefined;
          if (url) return `![${alt}](${url})`;
          const a = (alt && alt.trim()) || ref?.alt || '';
          return a ? `[ilustracja: ${a}]` : '[ilustracja]';
        }
      );
    }

    let generatedImages = msg.generatedImages;
    const genRefs = myRefs.filter((r) => r.kind === 'generated');
    if (genRefs.length > 0 && generatedImages) {
      generatedImages = generatedImages
        .map((url, genIndex) => {
          if (!isDataUrl(url)) return url;
          const ref = genRefs.find((r) => r.genIndex === genIndex);
          const mapped = ref ? urlByName[ref.name] : undefined;
          return mapped || '';
        })
        .filter((url) => url !== '');
    }

    let illustrations = msg.illustrations;
    const illRefs = myRefs.filter((r) => r.kind === 'illustration');
    if (illRefs.length > 0 && illustrations) {
      illustrations = illustrations.map((ill, illIndex) => {
        const ref = illRefs.find((r) => r.illIndex === illIndex);
        if (!ref) return ill;
        const url = urlByName[ref.name];
        return { ...ill, imageUrl: url || '' };
      });
    }

    if (
      content === msg.content &&
      generatedImages === msg.generatedImages &&
      illustrations === msg.illustrations
    ) {
      return msg;
    }
    return {
      ...msg,
      content,
      ...(msg.generatedImages ? { generatedImages } : {}),
      ...(msg.illustrations ? { illustrations } : {}),
    };
  });
}

/**
 * Zwraca kopię postaci bez ciężkich base64 obrazów. `character` leci do `/api/chat`
 * jako kontekst (useChat/useGameStart) i NIE jest objęty `sanitizeHistoryForApi`
 * (ta czyści tylko `messages`). Po wygenerowaniu portretu + miniatur ekwipunku
 * (data: URL-e ~MB każdy) niesanityzowana postać podbija payload > 10 MB → serwer
 * dostaje ucięty JSON ("Unterminated string") → HTTP 500. Tu wycinamy base64 z:
 * portretu, ekwipunku, znaczących miejsc, cennych przedmiotów i avatarów ważnych
 * osób. Lekkie http(s) URL-e i cały tekst zostają. Nie mutuje wejścia; null → null.
 * UI renderuje z oryginalnego stanu/IndexedDB, więc obrazy nadal widać.
 */
export function sanitizeCharacterForApi(
  character: Character | null
): Character | null {
  if (!character) return character;

  return {
    ...character,
    portraitUrl: isDataUrl(character.portraitUrl ?? '')
      ? ''
      : character.portraitUrl,
    equipment: character.equipment?.map((item) =>
      isDataUrl(item.imageUrl ?? '') ? { ...item, imageUrl: '' } : item
    ),
    significantPlaces: character.significantPlaces?.map((place) =>
      isDataUrl(place.imageUrl ?? '') ? { ...place, imageUrl: '' } : place
    ),
    valuableItems: character.valuableItems?.map((vi) =>
      isDataUrl(vi.imageUrl ?? '') ? { ...vi, imageUrl: '' } : vi
    ),
    importantPeople: character.importantPeople?.map((person) =>
      isDataUrl(person.avatarUrl ?? '') ? { ...person, avatarUrl: '' } : person
    ),
  };
}

/**
 * Zwraca kopię NPC bez ciężkiego base64 portretu. Analog `sanitizeCharacterForApi`
 * dla NPC (jedyne pole obrazowe to `portraitUrl`). NPC trafiają do payloadu zapisu
 * gry (`/api/game-save`) - niesanityzowany base64 (~MB) podbija body > 10 MB →
 * ucięty JSON → HTTP 500. Lekkie http(s) URL-e i cały tekst zostają. Nie mutuje
 * wejścia. UI/IndexedDB trzymają oryginał, więc portret nadal widać po wczytaniu.
 */
export function sanitizeNpcForApi(npc: NPC): NPC {
  if (!isDataUrl(npc.portraitUrl ?? '')) return npc;
  return { ...npc, portraitUrl: '' };
}
