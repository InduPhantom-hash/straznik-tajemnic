/** PDF Parser Service - backendowa ekstrakcja tekstu bez magazynu chmurowego z użyciem silnika unpdf (WASM). */

import { extractText, getMeta } from 'unpdf';

export interface ParsedPDFData {
  text: string;
  pages: number;
  pagesText?: string[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  size: number;
}

class PDFParserService {
  /**
   * Parsuje PDF buffer do tekstu z wykorzystaniem unpdf (WebAssembly)
   */
  async parsePDFBuffer(buffer: Buffer): Promise<ParsedPDFData> {
    try {
      // Sprawdź czy buffer nie jest pusty
      if (!buffer || buffer.length === 0) {
        throw new Error('Buffer jest pusty - plik może być uszkodzony');
      }

      console.log(`📄 PDF Buffer size: ${buffer.length} bytes`);
      console.log(
        `📄 PDF Buffer first bytes: ${buffer.slice(0, 10).toString('hex')}`
      );

      // ISO 32000 dopuszcza śmieci przed nagłówkiem, ale %PDF- powinien znaleźć
      // się w pierwszych 1024 bajtach. Odrzucamy inne formaty przed parserem.
      const headerRegion = buffer.subarray(0, Math.min(buffer.length, 1024));
      if (!headerRegion.includes(Buffer.from('%PDF-'))) {
        throw new Error(
          'Nieprawidłowy format PDF - brak nagłówka %PDF w pierwszych 1024 bajtach'
        );
      }

      console.log('🔄 Rozpoczynanie parsowania PDF przez silnik unpdf (WASM)...');
      const uint8Array = new Uint8Array(buffer);

      let textResult;
      try {
        textResult = await extractText(uint8Array, { mergePages: false });
      } catch (parseError) {
        console.error('❌ unpdf extraction error:', parseError);
        const errorMessage =
          parseError instanceof Error ? parseError.message : String(parseError);

        const normalizedError = errorMessage.toLowerCase();
        if (
          normalizedError.includes('invalid pdf') ||
          normalizedError.includes('invalid') ||
          normalizedError.includes('bad xref')
        ) {
          throw new Error(
            'Nieprawidłowy format PDF - plik może być uszkodzony lub w nieobsługiwanym formacie'
          );
        } else if (
          normalizedError.includes('password') ||
          normalizedError.includes('encrypted')
        ) {
          throw new Error('PDF jest chroniony hasłem - nie można go sparsować');
        } else if (normalizedError.includes('corrupt')) {
          throw new Error('Plik PDF jest uszkodzony');
        } else {
          throw new Error(`Błąd parsowania PDF: ${errorMessage}`);
        }
      }

      let metaResult: Awaited<ReturnType<typeof getMeta>> | null = null;
      try {
        metaResult = await getMeta(uint8Array);
      } catch (metaErr) {
        console.warn('⚠️ Nie udało się pobrać metadanych PDF (kontynuacja bez metadanych):', metaErr);
      }

      const pagesList = Array.isArray(textResult.text)
        ? textResult.text
        : [textResult.text || ''];

      const totalPages = textResult.totalPages || pagesList.length || 0;

      // Zbuduj jednolity tekst z wyraźnymi separatorami stron dla lepszego podziału
      const fullText = pagesList
        .map((pageContent, idx) => {
          const trimmed = pageContent ? pageContent.trim() : '';
          return trimmed ? `<!-- Strona ${idx + 1} -->\n${trimmed}` : '';
        })
        .filter(Boolean)
        .join('\n\n');

      if (!fullText || fullText.trim().length === 0) {
        console.warn('⚠️ PDF sparsowany, lecz nie zawiera tekstu - prawdopodobnie skan tylko ze zdjęciami');
      }

      const textLength = fullText.trim().length;
      console.log(
        `📊 PDF sparsowany pomyślnie przez unpdf: ${textLength} znaków ze stron: ${totalPages}`
      );

      const info = (metaResult?.info || {}) as Record<string, unknown>;

      return {
        text: fullText.trim(),
        pages: totalPages,
        pagesText: pagesList,
        metadata: {
          title: typeof info.Title === 'string' ? info.Title : undefined,
          author: typeof info.Author === 'string' ? info.Author : undefined,
          subject: typeof info.Subject === 'string' ? info.Subject : undefined,
          keywords: typeof info.Keywords === 'string' ? info.Keywords : undefined,
          creator: typeof info.Creator === 'string' ? info.Creator : undefined,
          producer: typeof info.Producer === 'string' ? info.Producer : undefined,
          creationDate: info.CreationDate ? new Date(String(info.CreationDate)) : undefined,
          modificationDate: info.ModDate ? new Date(String(info.ModDate)) : undefined,
        },
        size: buffer.length,
      };
    } catch (error) {
      console.error('❌ Błąd parsowania PDF:', error);

      if (error instanceof Error) {
        if (
          error.message.includes('Nieprawidłowy') ||
          error.message.includes('chroniony hasłem') ||
          error.message.includes('uszkodzony') ||
          error.message.includes('Brak nagłówka')
        ) {
          throw error;
        }
      }

      throw new Error(
        `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parsuje PDF z URL
   */
  async parsePDFFromURL(url: string): Promise<ParsedPDFData> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return await this.parsePDFBuffer(buffer);
    } catch (error) {
      console.error('Error parsing PDF from URL:', error);
      throw error;
    }
  }

  /**
   * Kompresuje tekst PDF dla optymalizacji tokenów
   */
  compressText(text: string, maxLength: number = 500000): string {
    if (text.length <= maxLength) {
      return text;
    }

    let compressed = text.replace(/\s+/g, ' ').trim();

    if (compressed.length > maxLength) {
      compressed = compressed.substring(0, maxLength) + '...';
    }

    return compressed;
  }
}

export const pdfParserService = new PDFParserService();
