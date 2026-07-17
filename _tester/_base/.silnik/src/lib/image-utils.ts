/**
 * Image Utilities
 * Narzędzia do konwersji i przetwarzania obrazów dla Gemini Vision API
 */

/**
 * Sprawdza czy URL jest base64 data URL
 */
export function isDataUrl(url: string): boolean {
    return url.startsWith('data:');
}

/**
 * Wyodrębia base64 i mimeType z data URL
 */
export function parseDataUrl(dataUrl: string): { data: string; mimeType: string } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;

    return {
        mimeType: match[1],
        data: match[2]
    };
}

/**
 * Pobiera obraz z URL i konwertuje na base64
 * Działa po stronie serwera (Node.js)
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
    try {
        // Jeśli to już data URL, wyodrębnij dane
        if (isDataUrl(imageUrl)) {
            return parseDataUrl(imageUrl);
        }

        // Pobierz obraz
        const response = await fetch(imageUrl);

        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            return null;
        }

        // Pobierz content-type
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const mimeType = contentType.split(';')[0].trim();

        // Sprawdź czy to obsługiwany format
        const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!supportedTypes.includes(mimeType)) {
            console.warn(`Unsupported image type: ${mimeType}`);
            return null;
        }

        // Konwertuj na base64
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        return {
            data: base64,
            mimeType
        };
    } catch (error) {
        console.error('Error fetching image:', error);
        return null;
    }
}

/**
 * Przygotowuje dane obrazu do Gemini API (format inlineData)
 */
export async function prepareImageForGemini(imageUrl: string): Promise<{
    inlineData: { mimeType: string; data: string }
} | null> {
    const imageData = await fetchImageAsBase64(imageUrl);

    if (!imageData) return null;

    return {
        inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data
        }
    };
}

/**
 * Przygotowuje wiele obrazów do Gemini API
 * Zwraca tylko te które udało się załadować
 */
export async function prepareImagesForGemini(
    imageUrls: string[],
    maxImages: number = 5
): Promise<Array<{ inlineData: { mimeType: string; data: string } }>> {
    const limited = imageUrls.slice(0, maxImages);
    const results = await Promise.all(limited.map(url => prepareImageForGemini(url)));

    return results.filter((r): r is { inlineData: { mimeType: string; data: string } } => r !== null);
}

/**
 * Sprawdza rozmiar obrazu base64 (w bajtach)
 */
export function getBase64Size(base64: string): number {
    // Base64 koduje 3 bajty w 4 znaki
    return Math.ceil((base64.length * 3) / 4);
}

/**
 * Sprawdza czy obraz jest za duży dla Gemini API (limit ~20MB)
 */
export function isImageTooLarge(base64: string, maxSizeMB: number = 4): boolean {
    const sizeBytes = getBase64Size(base64);
    const sizeMB = sizeBytes / (1024 * 1024);
    return sizeMB > maxSizeMB;
}
