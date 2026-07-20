// U.S. Historical CPI (Consumer Price Index) from 1913 to 2026 baseline.
// CPI base period is 1982-1984 = 100.
export const STATIC_CPI_TABLE: Record<number, number> = {
  1913: 9.9, 1914: 10.0, 1915: 10.1, 1916: 10.9, 1917: 12.8, 1918: 15.0, 1919: 17.3,
  1920: 20.0, 1921: 17.9, 1922: 16.8, 1923: 17.1, 1924: 17.1, 1925: 17.5, 1926: 17.7,
  1927: 17.4, 1928: 17.1, 1929: 17.1, 1930: 16.7, 1931: 15.2, 1932: 13.6, 1933: 12.9,
  1934: 13.4, 1935: 13.7, 1936: 13.9, 1937: 14.4, 1938: 14.1, 1939: 13.9, 1940: 14.0,
  1941: 14.7, 1942: 16.3, 1943: 17.3, 1944: 17.6, 1945: 18.0, 1946: 19.5, 1947: 22.3,
  1948: 24.1, 1949: 23.8, 1950: 24.1, 1951: 26.0, 1952: 26.5, 1953: 26.7, 1954: 26.9,
  1955: 26.8, 1956: 27.2, 1957: 28.1, 1958: 28.9, 1959: 29.1, 1960: 29.6, 1961: 29.9,
  1962: 30.2, 1963: 30.6, 1964: 31.0, 1965: 31.5, 1966: 32.4, 1967: 33.4, 1968: 34.8,
  1969: 36.7, 1970: 38.8, 1971: 40.5, 1972: 41.8, 1973: 44.4, 1974: 49.3, 1975: 53.8,
  1976: 56.9, 1977: 60.6, 1978: 65.2, 1979: 72.6, 1980: 82.4, 1981: 90.9, 1982: 96.5,
  1983: 99.6, 1984: 103.9, 1985: 107.6, 1986: 109.6, 1987: 113.6, 1988: 118.3, 1989: 124.0,
  1990: 130.7, 1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2, 1995: 152.4, 1996: 156.9,
  1997: 160.5, 1998: 163.0, 1999: 166.6, 2000: 172.2, 2001: 177.1, 2002: 179.9, 2003: 184.0,
  2004: 188.9, 2005: 195.3, 2006: 201.6, 2007: 207.3, 2008: 215.3, 2009: 214.5, 2010: 218.1,
  2011: 224.9, 2012: 229.6, 2013: 233.0, 2014: 236.7, 2015: 237.0, 2016: 240.0, 2017: 245.1,
  2018: 251.1, 2019: 255.7, 2020: 258.8, 2021: 271.0, 2022: 292.7, 2023: 304.7, 2024: 313.2,
  2025: 321.0, 2026: 328.0
};

export interface PriceConversionResult {
  originalAmount: number;
  originalYear: number;
  targetYear: number;
  convertedAmount: number;
  inflationMultiplier: number;
  isFallback: boolean;
}

/**
 * Converts US Dollars from one year to another using the BLS CPI dataset.
 * Supports online fetch (via BLS API key) and automatic graceful fallback to static data.
 */
export async function convertUSD(
  amount: number,
  originalYear: number,
  targetYear: number
): Promise<PriceConversionResult> {
  const apiKey = process.env.BLS_API_KEY || '';
  let isFallback = true;
  let originalCPI = STATIC_CPI_TABLE[originalYear];
  let targetCPI = STATIC_CPI_TABLE[targetYear];

  // Try to query BLS API if we have a key and years are in valid range
  if (process.env.IMMERSION_OFFLINE !== '1' && apiKey && originalYear >= 1913 && targetYear <= 2026) {
    try {
      const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesid: ['CUUR0000SA0'],
          startyear: Math.min(originalYear, targetYear).toString(),
          endyear: Math.max(originalYear, targetYear).toString(),
          registrationkey: apiKey,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const seriesData = json.results?.series?.[0]?.data;
        if (Array.isArray(seriesData)) {
          // Find the annual average or closest month's index
          const findCPI = (year: number) => {
            interface CPIDataPoint {
              year: string;
              period: string;
              value: string;
            }
            const matches = (seriesData as CPIDataPoint[]).filter((d: CPIDataPoint) => d.year === year.toString());
            if (matches.length > 0) {
              // Try to find Annual average (M13) or average the available months
              const m13 = matches.find((d: CPIDataPoint) => d.period === 'M13');
              if (m13) return parseFloat(m13.value);
              const sum = matches.reduce((acc: number, cur: CPIDataPoint) => acc + parseFloat(cur.value), 0);
              return sum / matches.length;
            }
            return null;
          };

          const fetchedOrig = findCPI(originalYear);
          const fetchedTarget = findCPI(targetYear);

          if (fetchedOrig && fetchedTarget) {
            originalCPI = fetchedOrig;
            targetCPI = fetchedTarget;
            isFallback = false;
          }
        }
      }
    } catch (e) {
      console.warn('BLS API request failed, falling back to static CPI table:', e);
    }
  }

  // Fallback sanity check
  if (!originalCPI) originalCPI = STATIC_CPI_TABLE[1920];
  if (!targetCPI) targetCPI = STATIC_CPI_TABLE[2026];

  const multiplier = targetCPI / originalCPI;
  const converted = amount * multiplier;

  return {
    originalAmount: amount,
    originalYear,
    targetYear,
    convertedAmount: Math.round(converted * 100) / 100,
    inflationMultiplier: Math.round(multiplier * 1000) / 1000,
    isFallback,
  };
}
