export interface HistoricalNewsItem {
  title: string;
  date: string;
  snippet: string;
  url: string;
}

export const FALLBACK_HEADLINES: HistoricalNewsItem[] = [
  {
    title: "The Boston Globe",
    date: "1925-05-12",
    snippet: "POLICE RAID ILLEGAL SPEAKEASY IN NORTH END. Six barrels of contraband whiskey seized. Proprietor eludes arrest through back alleyway.",
    url: "https://chroniclingamerica.loc.gov/"
  },
  {
    title: "The Arkham Advertiser",
    date: "1926-10-18",
    snippet: "MYSTERIOUS DISAPPEARANCES IN MISKATONIC VALLEY. Authorities search local woods after two university students fail to return from archaeological field trip.",
    url: "https://chroniclingamerica.loc.gov/"
  },
  {
    title: "New York Tribune",
    date: "1923-08-04",
    snippet: "PRESIDENT COOLIDGE TAKES OATH OF OFFICE. Midnight ceremony held at family homestead in Vermont following the sudden passing of President Harding.",
    url: "https://chroniclingamerica.loc.gov/"
  },
  {
    title: "The Chicago Tribune",
    date: "1924-11-03",
    snippet: "JAZZ AGE FEVER GRIPS DOWNTOWN THEATERS. Music critics divided over the impact of syncopated rhythms on young generation. Dance halls packed nightly.",
    url: "https://chroniclingamerica.loc.gov/"
  }
];

export async function fetchHistoricalNews(
  dateStr: string // Format: YYYY-MM-DD
): Promise<{ news: HistoricalNewsItem[]; isFallback: boolean }> {
  if (process.env.IMMERSION_OFFLINE === '1') {
    return {
      news: [FALLBACK_HEADLINES[Math.floor(Math.random() * FALLBACK_HEADLINES.length)]],
      isFallback: true
    };
  }

  // Chronicling America has no API key required.
  // Format target date for API: MM/DD/YYYY
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      const apiDate = `${month}/${day}/${year}`;

      const url = `https://chroniclingamerica.loc.gov/search/pages/results/?dateFilterType=range&date1=${apiDate}&date2=${apiDate}&format=json&rows=5`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.items && json.items.length > 0) {
          const news: HistoricalNewsItem[] = json.items.map((item: { title?: string; ocr_eng?: string; id?: string }) => {
            // Clean up title/state
            const rawTitle = item.title || 'United States Newspaper';
            const cleanSnippet = item.ocr_eng
              ? item.ocr_eng.replace(/\s+/g, ' ').substring(0, 200) + '...'
              : 'Historical newspaper page covering local and national news.';

            return {
              title: rawTitle,
              date: dateStr,
              snippet: cleanSnippet,
              url: `https://chroniclingamerica.loc.gov${item.id}`
            };
          });

          return { news, isFallback: false };
        }
      }
    }
  } catch (e) {
    console.warn('Chronicling America API failed, using fallback headlines:', e);
  }

  // Pick a matching fallback headline or a random one
  return {
    news: [FALLBACK_HEADLINES[Math.floor(Math.random() * FALLBACK_HEADLINES.length)]],
    isFallback: true
  };
}
