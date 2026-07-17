export interface HistoricalBookItem {
  title: string;
  author: string;
  publishYear: number;
  subject: string[];
  url: string;
}

export const FALLBACK_BOOKS: HistoricalBookItem[] = [
  {
    title: "The Golden Bough: A Study in Comparative Religion",
    author: "Sir James George Frazer",
    publishYear: 1890,
    subject: ["Mythology", "Religion", "Magic"],
    url: "https://openlibrary.org/works/OL18228W"
  },
  {
    title: "The Book of Ceremonial Magic",
    author: "Arthur Edward Waite",
    publishYear: 1911,
    subject: ["Magic", "Occultism", "Grimoires"],
    url: "https://openlibrary.org/works/OL16075489W"
  },
  {
    title: "Compendium Maleficarum",
    author: "Francesco Maria Guazzo",
    publishYear: 1920,
    subject: ["Witchcraft", "Demonology", "Inquisition"],
    url: "https://openlibrary.org/works/OL16877995W"
  }
];

export async function fetchHistoricalBooks(
  query: string,
  maxYear = 1925
): Promise<{ books: HistoricalBookItem[]; isFallback: boolean }> {
  try {
    const cleanQuery = encodeURIComponent(query);
    const url = `https://openlibrary.org/search.json?q=${cleanQuery}&limit=15`;
    const res = await fetch(url);

    if (res.ok) {
      const json = await res.json();
      if (json.docs && json.docs.length > 0) {
        const books: HistoricalBookItem[] = json.docs
          .map((doc: { title: string; first_publish_year?: number; publish_year?: number[]; author_name?: string[]; key?: string; subject?: string[] }) => {
            const firstPublishYear = doc.first_publish_year || (doc.publish_year ? Math.min(...doc.publish_year) : 9999);
            const author = doc.author_name ? doc.author_name.join(', ') : 'Unknown Author';
            return {
              title: doc.title,
              author,
              publishYear: firstPublishYear,
              subject: doc.subject ? doc.subject.slice(0, 5) : [],
              url: doc.key ? `https://openlibrary.org${doc.key}` : 'https://openlibrary.org'
            };
          })
          // Filter books that were written/published before the target adventure era
          .filter((b: HistoricalBookItem) => b.publishYear <= maxYear)
          .slice(0, 5);

        if (books.length > 0) {
          return { books, isFallback: false };
        }
      }
    }
  } catch (e) {
    console.warn('Open Library API request failed, using static book library fallbacks:', e);
  }

  // Return static fallback matching query or random ones
  const filtered = FALLBACK_BOOKS.filter(b => 
    b.title.toLowerCase().includes(query.toLowerCase()) || 
    b.subject.some(s => s.toLowerCase().includes(query.toLowerCase()))
  );
  
  return {
    books: filtered.length > 0 ? filtered : FALLBACK_BOOKS.slice(0, 3),
    isFallback: true
  };
}
