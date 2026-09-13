import { indexingService } from './indexing-service';
import { bm25Index } from './bm25-index';
import { chunkText, pdfIndexingService } from './pdf-indexing-service';

jest.mock('./indexing-service', () => ({
  indexingService: { indexTexts: jest.fn() },
}));

jest.mock('./bm25-index', () => ({
  bm25Index: {
    addDocuments: jest.fn(),
    clearNamespace: jest.fn(),
    size: 0,
  },
}));

const mockedIndexTexts = jest.mocked(indexingService.indexTexts);
const longParagraph = (label: string, length = 900) =>
  `${label} ${'treść zdania. '.repeat(Math.ceil(length / 14))}`.slice(
    0,
    length
  );

describe('chunkText', () => {
  it('tworzy jeden niepusty chunk dla krótkiego dokumentu', () => {
    const text = longParagraph('Zasady', 500);
    const chunks = chunkText(text, 'rules', 'rules.pdf');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(text);
    expect(chunks[0]).toMatchObject({
      index: 0,
      startOffset: 0,
      endOffset: 500,
    });
  });

  it('zachowuje overlap, offsety i deterministyczne identyfikatory', () => {
    const text = [
      longParagraph('Rozdział pierwszy', 1800),
      '\n\n',
      longParagraph('Rozdział drugi', 1800),
    ].join('');
    const first = chunkText(text, 'adventure', 'scenario.pdf');
    const second = chunkText(text, 'adventure', 'scenario.pdf');

    expect(first.length).toBeGreaterThan(1);
    expect(first.map((chunk) => chunk.id)).toEqual(
      second.map((chunk) => chunk.id)
    );
    expect(first.every((chunk) => chunk.text.length > 0)).toBe(true);
    for (let index = 1; index < first.length; index++) {
      expect(first[index].startOffset).toBe(first[index - 1].endOffset - 200);
      expect(first[index].endOffset).toBeGreaterThan(first[index].startOffset);
    }
  });
});

describe('pdfIndexingService document policy', () => {
  beforeEach(() => jest.clearAllMocks());
  it.each(['rules', 'adventure'] as const)('blocks %s documents without changing existing indexes', async (type) => {
    const result = await pdfIndexingService.indexPdf({
      text: longParagraph('Synthetic', 500), type, fileName: 'synthetic.pdf', clearBefore: true,
    });
    expect(result).toMatchObject({ success: false, indexed: 0, error: 'DOCUMENT_MODEL_USE_BLOCKED' });
    expect(mockedIndexTexts).not.toHaveBeenCalled();
    expect(bm25Index.clearNamespace).not.toHaveBeenCalled();
    expect(bm25Index.addDocuments).not.toHaveBeenCalled();
  });
});
