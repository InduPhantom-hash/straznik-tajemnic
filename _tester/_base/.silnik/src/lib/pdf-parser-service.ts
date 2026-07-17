/**
 * PDF Parser Service - Backend PDF parsing
 * Parsuje PDF na backendzie i przechowuje w Google Cloud Storage
 */

export interface ParsedPDFData {
  text: string;
  pages: number;
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
   * Parsuje PDF buffer do tekstu
   */
  async parsePDFBuffer(buffer: Buffer): Promise<ParsedPDFData> {
    try {
      // Sprawdź czy buffer nie jest pusty
      if (!buffer || buffer.length === 0) {
        throw new Error('Buffer jest pusty - plik może być uszkodzony');
      }

      console.log(`📄 PDF Buffer size: ${buffer.length} bytes`);
      console.log(`📄 PDF Buffer first bytes: ${buffer.slice(0, 10).toString('hex')}`);

      // Sprawdź czy to rzeczywiście PDF (powinien zaczynać się od %PDF)
      const pdfHeader = buffer.slice(0, 4).toString('ascii');
      if (pdfHeader !== '%PDF') {
        console.warn(`⚠️ PDF header mismatch: expected '%PDF', got '${pdfHeader}'`);
        // Nie rzucamy błędu - niektóre PDF mogą mieć różne nagłówki
      }

      // Dynamiczny import pdf-parse (unikamy problemów z Next.js build)
      let pdfParse;
      try {
        pdfParse = (await import('pdf-parse')).default;
        console.log('✅ pdf-parse module loaded successfully');
      } catch (importError) {
        console.error('❌ Failed to import pdf-parse:', importError);
        throw new Error(`Brak wymaganego modułu pdf-parse: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
      }
      
      // Parsuj PDF używając pdf-parse
      console.log('🔄 Starting PDF parsing...');
      let data;
      try {
        data = await pdfParse(buffer, {
          max: 0, // Brak limitu stron
        });
        console.log(`✅ PDF parsed successfully: ${data.numpages} pages`);
      } catch (parseError) {
        console.error('❌ pdf-parse error:', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        
        // Sprawdź typ błędu
        if (errorMessage.includes('Invalid PDF') || errorMessage.includes('invalid')) {
          throw new Error('Nieprawidłowy format PDF - plik może być uszkodzony lub w nieobsługiwanym formacie');
        } else if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
          throw new Error('PDF jest chroniony hasłem - nie można go sparsować');
        } else if (errorMessage.includes('corrupt') || errorMessage.includes('corrupted')) {
          throw new Error('Plik PDF jest uszkodzony');
        } else {
          throw new Error(`Błąd parsowania PDF: ${errorMessage}`);
        }
      }
      
      // Sprawdź czy parsowanie zwróciło jakiekolwiek dane
      if (!data) {
        throw new Error('PDF nie zawiera danych');
      }

      if (!data.text || data.text.trim().length === 0) {
        console.warn('⚠️ PDF parsed but contains no text - may be image-only PDF');
        // Nie rzucamy błędu - zwracamy pusty tekst
      }
      
      const textLength = data.text ? data.text.trim().length : 0;
      console.log(`📊 PDF text extracted: ${textLength} characters from ${data.numpages || 0} pages`);
      
      return {
        text: data.text ? data.text.trim() : '',
        pages: data.numpages || 0,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          keywords: data.info?.Keywords,
          creator: data.info?.Creator,
          producer: data.info?.Producer,
          creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
        },
        size: buffer.length,
      };
    } catch (error) {
      console.error('❌ Error parsing PDF:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      
      // Rzuć błąd z bardziej szczegółowym komunikatem
      if (error instanceof Error) {
        // Jeśli błąd już ma szczegółowy komunikat, użyj go
        if (error.message.includes('Nieprawidłowy') || 
            error.message.includes('chroniony hasłem') || 
            error.message.includes('uszkodzony') ||
            error.message.includes('Brak wymaganego modułu')) {
          throw error;
        }
      }
      
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    // Usuń nadmiarowe spacje i znaki nowej linii
    let compressed = text.replace(/\s+/g, ' ').trim();
    
    // Jeśli nadal za długi, skróć
    if (compressed.length > maxLength) {
      compressed = compressed.substring(0, maxLength) + '...';
    }
    
    return compressed;
  }
}

export const pdfParserService = new PDFParserService();
