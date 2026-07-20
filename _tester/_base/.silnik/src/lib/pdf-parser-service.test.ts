import pdfParse from 'pdf-parse';
import { pdfParserService } from './pdf-parser-service';

jest.mock('pdf-parse', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedPdfParse = jest.mocked(pdfParse);

function pdfBuffer(body = 'test'): Buffer {
  return Buffer.from(`%PDF-1.7\n${body}`);
}

describe('pdfParserService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('zwraca stabilny kontrakt dla poprawnego PDF', async () => {
    mockedPdfParse.mockResolvedValue({
      text: '  Tekst podręcznika  ',
      numpages: 12,
      info: { Title: 'Podręcznik', Author: 'Autor' },
    } as never);

    await expect(pdfParserService.parsePDFBuffer(pdfBuffer())).resolves.toEqual(
      expect.objectContaining({
        text: 'Tekst podręcznika',
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
    expect(mockedPdfParse).not.toHaveBeenCalled();
  });

  it('odrzuca plik bez nagłówka PDF', async () => {
    await expect(
      pdfParserService.parsePDFBuffer(Buffer.from('zwykły tekst'))
    ).rejects.toThrow('Nieprawidłowy format PDF');
    expect(mockedPdfParse).not.toHaveBeenCalled();
  });

  it('jawnie zwraca pusty tekst dla skanu bez warstwy tekstowej', async () => {
    mockedPdfParse.mockResolvedValue({
      text: '',
      numpages: 3,
      info: {},
    } as never);

    await expect(pdfParserService.parsePDFBuffer(pdfBuffer())).resolves.toEqual(
      expect.objectContaining({ text: '', pages: 3 })
    );
  });

  it('mapuje błąd zaszyfrowanego PDF na komunikat użytkowy', async () => {
    mockedPdfParse.mockRejectedValue(new Error('Password encrypted document'));

    await expect(pdfParserService.parsePDFBuffer(pdfBuffer())).rejects.toThrow(
      'PDF jest chroniony hasłem'
    );
  });
});
