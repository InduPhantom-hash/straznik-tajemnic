import { NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    console.log('Upload API called');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nie przesłano pliku' },
        { status: 400 }
      );
    }

    console.log(`Otrzymano plik: ${file.name}, deklarowany typ: ${file.type}, rozmiar: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);

    // BEZPIECZEŃSTWO: Zmniejszono limit z 500MB do 150MB (zapobiega file bomb attacks)
    const maxSize = 150 * 1024 * 1024; // 150MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Plik zbyt duży. Maksymalny rozmiar: 150MB. Aktualny: ${(file.size / (1024 * 1024)).toFixed(1)}MB` },
        { status: 400 }
      );
    }

    // BEZPIECZEŃSTWO: Weryfikacja rzeczywistego typu pliku (magic bytes)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detectedType = await fileTypeFromBuffer(buffer);

    const allowedMimeTypes = ['application/pdf', 'text/plain'];
    if (detectedType && !allowedMimeTypes.includes(detectedType.mime)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy typ pliku', details: `Wykryto: ${detectedType.mime}. Dozwolone: PDF, TXT` },
        { status: 400 }
      );
    }

    // Dla plików tekstowych file-type może zwrócić undefined (to normalne)
    const isTXT = file.name.toLowerCase().endsWith('.txt');
    const isPDF = detectedType?.mime === 'application/pdf';

    if (!isPDF && !isTXT) {
      return NextResponse.json(
        { error: 'Nieobsługiwany typ pliku. Dozwolone: PDF, TXT' },
        { status: 400 }
      );
    }

    console.log(`✅ Walidacja pliku przeszła pomyślnie: ${isPDF ? 'PDF' : 'TXT'}`);

    let extractedText = '';
    let pageCount = 0;
    let wordCount = 0;

    try {
      if (isPDF) {
        console.log(`Przetwarzanie PDF: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);

        // PDF nie wymaga kompresji - Gemini Pro 1.5 radzi sobie z plikami do 500MB
        console.log('PDF processing without compression - Gemini Pro 1.5 handles large files efficiently');

        const arrayBuffer = await file.arrayBuffer();
        const pdfBuffer = Buffer.from(arrayBuffer);

        // Użyj pdf-parse dla wszystkich plików PDF (bardziej niezawodne)
        console.log('Parsing PDF with pdf-parse...');
        try {
          const pdfParse = await import('pdf-parse');
          console.log('Parsing PDF...');
          const pdfData = await pdfParse.default(pdfBuffer);
          extractedText = pdfData.text;
          pageCount = pdfData.numpages;
          console.log(`PDF processed: ${pageCount} pages, ${extractedText.length} characters`);
        } catch (pdfParseError) {
          console.error('pdf-parse failed:', pdfParseError);
          throw new Error('Failed to parse PDF file with pdf-parse');
        }

      } else if (isTXT) {
        console.log(`Processing TXT file: ${file.name}`);
        extractedText = await file.text();
        pageCount = 1; // TXT pliki traktujemy jako 1 stronę
        console.log(`TXT processed: ${extractedText.length} characters`);
      }

      // Wyczyść i przetwórz tekst
      console.log('Cleaning extracted text...');
      extractedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/\f/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

      // Policz słowa
      wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
      console.log(`Text processing completed: ${wordCount} words, ${extractedText.length} characters`);

      // Przygotuj odpowiedź
      const response = {
        success: true,
        filename: file.name,
        size: file.size,
        fileType: isPDF ? 'pdf' : 'txt',
        pages: pageCount,
        wordCount: wordCount,
        text: extractedText,
        message: `Plik ${file.name} został pomyślnie przetworzony (${(file.size / (1024 * 1024)).toFixed(1)}MB, ${pageCount} stron, ${wordCount} słów)`
      };

      console.log('Upload successful, returning response...');
      return NextResponse.json(response);

    } catch (processingError) {
      console.error('File processing error:', processingError);
      return NextResponse.json(
        {
          error: 'File processing failed',
          details: processingError instanceof Error ? processingError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}