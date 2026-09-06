export interface ImportedFileResult {
  fileName: string;
  fileType: 'document' | 'spreadsheet' | 'audio' | 'image' | 'unknown';
  fileSize: number;
  extractedText?: string;
  previewUrl?: string;
  parsedSummary?: string;
}

/**
 * Rozpoznaje typ pliku i przygotowuje wstępne dane do kreatora przygody
 */
export async function processImportedFile(file: File): Promise<ImportedFileResult> {
  const name = file.name;
  const ext = name.split('.').pop()?.toLowerCase() || '';

  let fileType: ImportedFileResult['fileType'] = 'unknown';
  if (['pdf', 'docx', 'doc', 'odt', 'rtf', 'txt', 'md', 'epub'].includes(ext)) {
    fileType = 'document';
  } else if (['xlsx', 'xls', 'ods', 'csv'].includes(ext)) {
    fileType = 'spreadsheet';
  } else if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    fileType = 'audio';
  } else if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg'].includes(ext)) {
    fileType = 'image';
  }

  let extractedText: string | undefined;
  let previewUrl: string | undefined;

  if (fileType === 'document' && (ext === 'txt' || ext === 'md')) {
    try {
      extractedText = await file.text();
    } catch {
      // Ignoruj błędy odczytu surowego tekstu
    }
  } else if (fileType === 'image' || fileType === 'audio') {
    try {
      previewUrl = URL.createObjectURL(file);
    } catch {
      // Ignoruj w środowisku bez DOM
    }
  }

  return {
    fileName: name,
    fileType,
    fileSize: file.size,
    extractedText,
    previewUrl,
    parsedSummary: `${fileType.toUpperCase()}: ${name} (${(file.size / 1024).toFixed(1)} KB)`
  };
}
