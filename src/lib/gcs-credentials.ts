import type { StorageOptions } from '@google-cloud/storage';

/**
 * Zwraca credentials dla Google Cloud Storage SDK z priorytetem inline JSON nad path.
 *
 * Priority:
 * 1. `GOOGLE_CLOUD_CREDENTIALS_JSON` (inline JSON) - preferred dla Vercel/serverless,
 *    bo serverless runtime nie ma persistent FS poza `/tmp/`.
 * 2. `GOOGLE_CLOUD_STORAGE_KEY_FILE` (path do JSON) - fallback dla local dev,
 *    backward-compat z istniejacym setupem.
 * 3. Oba unset - zwraca `{}`, Storage SDK probuje Application Default Credentials
 *    (gcloud login, metadata server). Bez throw - blad bedzie clear przy pierwszym
 *    requescie do GCS, nie przy module load (Vercel build nie pada).
 *
 * @example
 * const storage = new Storage({
 *   projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
 *   ...getGcsCredentials(),
 * });
 */
export function getGcsCredentials(): Pick<
  StorageOptions,
  'credentials' | 'keyFilename'
> {
  const inlineJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;

  if (inlineJson) {
    try {
      return { credentials: JSON.parse(inlineJson) };
    } catch (e) {
      console.error(
        'GOOGLE_CLOUD_CREDENTIALS_JSON contains invalid JSON, falling back to KEY_FILE:',
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  const keyFile = process.env.GOOGLE_CLOUD_STORAGE_KEY_FILE;
  if (keyFile) {
    return { keyFilename: keyFile };
  }

  return {};
}
