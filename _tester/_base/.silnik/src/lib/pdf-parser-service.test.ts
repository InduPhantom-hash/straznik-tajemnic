import { extractText, getMeta } from 'unpdf';
import { pdfParserService } from './pdf-parser-service';

jest.mock('unpdf', () => ({
  extractText: jest.fn(),
  getMeta: jest.fn(),
}));

const mockedExtractText = jest.mocked(extractText);
const mockedGetMeta = jest.mocked(getMeta);

function pdfBuffer(body = 'test'): Buffer {
  return Buffer.from(`%PDF-1.7\n${body}`);
}

describe('pdfParserService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('zwraca stabilny kontrakt dla poprawnego PDF', async () => {
    mockedExtractText.mockResolvedValue({
      text: ['Tekst podręcznika'],
      totalPages: 12,
    } as never);
    mockedGetMeta.mockResolvedValue({
      info: { Title: 'Podręcznik', Author: 'Autor' },
    } as never);

    await expect(pdfParserService.parsePDFBuffer(pdfBuffer())).resolves.toEqual(
      expect.objectContaining({
        text: '<!-- Strona 1 -->\nTekst podręcznika',
        pages: 12,
        metadata: expect.objectContaining({
          title: 'Podręcznik',
          author: 'Autor',
        }),
        size: pdfBuffer().length,
      })
    );
  });

  it('odrzuca pusty bufor', async () => {
    await expect(
      pdfParserService.parsePDFBuffer(Buffer.alloc(0))
    ).rejects.toThrow('Buffer jest pusty');
    expect(mockedExtractText).not.toHaveBeenCalled();
  });

  it('odrzuca plik bez nagłówka PDF', async () => {
    await expect(
      pdfParserService.parsePDFBuffer(Buffer.from('zwykły tekst'))
    ).rejects.toThrow('Nieprawidłowy format PDF');
    expect(mockedExtractText).not.toHaveBeenCalled();
  });

  it('jawnie zwraca pusty tekst dla skanu bez warstwy tekstowej', async () => {
    mockedExtractText.mockResolvedValue({
      text: [''],
      totalPages: 3,
    } as never);
    mockedGetMeta.mockResolvedValue({
      info: {},
    } as never);

    await expect(pdfParserService.parsePDFBuffer(pdfBuffer())).resolves.toEqual(
      expect.objectContaining({ text: '', pages: 3 })
    );
  });

  it('mapuje błąd zaszyfrowanego PDF na komunikat użytkowy', async () => {
    mockedExtractText.mockRejectedValue(new Error('Password encrypted document'));

    await expect(pdfParserService.parsePDFBuffer(pdfBuffer())).rejects.toThrow(
      'PDF jest chroniony hasłem'
    );
  });
});
