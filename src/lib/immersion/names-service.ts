export const FALLBACK_NAMES: Record<string, { male: string[]; female: string[]; surnames: string[] }> = {
  eng: {
    male: ['John', 'Arthur', 'Edward', 'Charles', 'Thomas', 'William', 'Robert', 'George', 'Richard', 'Joseph'],
    female: ['Mary', 'Helen', 'Dorothy', 'Margaret', 'Ruth', 'Mildred', 'Anna', 'Elizabeth', 'Frances', 'Virginia'],
    surnames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor']
  },
  ita: {
    male: ['Giovanni', 'Antonio', 'Giuseppe', 'Vincenzo', 'Francesco', 'Carlo', 'Angelo', 'Luigi', 'Pietro', 'Salvatore'],
    female: ['Maria', 'Rosa', 'Angela', 'Giovanna', 'Francesca', 'Anna', 'Carmela', 'Teresa', 'Lucia', 'Domenica'],
    surnames: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco']
  },
  iri: {
    male: ['Patrick', 'Michael', 'Sean', 'Connor', 'Liam', 'Daniel', 'Timothy', 'James', 'Owen', 'Ryan'],
    female: ['Kathleen', 'Bridget', 'Maureen', 'Patricia', 'Eileen', 'Colleen', 'Mary', 'Peggy', 'Nora', 'Fiona'],
    surnames: ['Murphy', 'Kelly', 'O\'Connor', 'Sullivan', 'McCarthy', 'O\'Brien', 'Ryan', 'O\'Donnell', 'Walsh', 'O\'Neill']
  },
  ger: {
    male: ['Hans', 'Otto', 'Heinrich', 'Karl', 'Wilhelm', 'Fritz', 'Friedrich', 'Walter', 'Kurt', 'Rudolf'],
    female: ['Martha', 'Erna', 'Gertrud', 'Helene', 'Anna', 'Hildegard', 'Gerda', 'Frieda', 'Marie', 'Charlotte'],
    surnames: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann']
  }
};

export interface NPCIdentityResult {
  firstName: string;
  lastName: string;
  gender: 'm' | 'f';
  usage: string;
  isFallback: boolean;
}

/**
 * Generates a random name/identity for an NPC based on usage and gender.
 * Uses Behind the Name API when available, otherwise falls back to pre-defined static lists.
 */
export async function generateNPCName(
  usage: 'eng' | 'ita' | 'iri' | 'ger' = 'eng',
  gender: 'm' | 'f' = 'm'
): Promise<NPCIdentityResult> {
  const apiKey = process.env.BEHIND_THE_NAME_API_KEY || '';
  let isFallback = true;
  let firstName = '';
  let lastName = '';

  if (apiKey) {
    try {
      const apiGender = gender === 'm' ? 'm' : 'f';
      // Behind the Name random endpoint
      const response = await fetch(
        `https://www.behindthename.com/api/random.json?usage=${usage}&gender=${apiGender}&number=1&key=${apiKey}`
      );

      if (response.ok) {
        const json = await response.json();
        if (json.names && json.names.length > 0) {
          firstName = json.names[0];
          isFallback = false;
        }
      }
    } catch (e) {
      console.warn('Behind the Name API failed, using static fallback names:', e);
    }
  }

  // Generate fallback name if API lookup failed or was skipped
  const pool = FALLBACK_NAMES[usage] || FALLBACK_NAMES.eng;
  if (!firstName) {
    const list = gender === 'm' ? pool.male : pool.female;
    firstName = list[Math.floor(Math.random() * list.length)];
  }

  // Surnames from the same cultural background
  lastName = pool.surnames[Math.floor(Math.random() * pool.surnames.length)];

  return {
    firstName,
    lastName,
    gender,
    usage,
    isFallback
  };
}
