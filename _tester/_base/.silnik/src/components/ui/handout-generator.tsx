'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { Label } from './label';
import { Input } from './input';
import { Textarea } from './textarea';
import type { HandoutType } from '@/components/chat/narrative/types';

interface HandoutGeneratorProps {
  open: boolean;
  onClose: () => void;
  onGenerate?: (handout: GeneratedHandout) => void;
}

export interface GeneratedHandout {
  type: HandoutType;
  title: string;
  content: string;
  date: string;
  author?: string;
  location?: string;
  html: string;
}

const HANDOUT_TYPES: {
  id: HandoutType;
  name: string;
  icon: string;
  description: string;
}[] = [
  {
    id: 'newspaper',
    name: 'Wycinek prasowy',
    icon: '📰',
    description: 'Artykuł z gazety z lat 20.',
  },
  {
    id: 'letter',
    name: 'List osobisty',
    icon: '✉️',
    description: 'List z charakterystycznym pismem',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '📧',
    description: 'Telegram Western Union',
  },
  {
    id: 'report',
    name: 'Raport policyjny',
    icon: '📋',
    description: 'Oficjalny raport z pieczątką',
  },
  {
    id: 'diary',
    name: 'Wpis z dziennika',
    icon: '📓',
    description: 'Dziennik z plamami atramentu',
  },
  {
    id: 'book',
    name: 'Zakazana księga',
    icon: '📜',
    description: 'Fragment Necronomiconu',
  },
  { id: 'note', name: 'Notatka', icon: '📝', description: 'Odręczna notatka' },
];

const NEWSPAPERS = [
  'Arkham Advertiser',
  'Arkham Gazette',
  'Boston Globe',
  'Kurier Warszawski',
  'New York Times',
  'Miskatonic Tribune',
];

export function HandoutGenerator({
  open,
  onClose,
  onGenerate,
}: HandoutGeneratorProps) {
  const [selectedType, setSelectedType] = useState<HandoutType>('newspaper');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState('17 października 1928');
  const [author, setAuthor] = useState('');
  const [location, setLocation] = useState('Arkham');
  const [newspaper, setNewspaper] = useState('Arkham Advertiser');
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const generateHandout = () => {
    const html = renderHandoutHTML(selectedType, {
      title,
      content,
      date,
      author,
      location,
      newspaper,
    });
    setPreview(html);

    if (onGenerate) {
      onGenerate({
        type: selectedType,
        title,
        content,
        date,
        author,
        location,
        html,
      });
    }
  };

  const copyToClipboard = () => {
    if (preview) {
      navigator.clipboard.writeText(preview);
      alert('Skopiowano do schowka!');
    }
  };

  const downloadAsImage = async () => {
    if (!previewRef.current) return;

    try {
      // Dynamiczny import html2canvas tylko gdy potrzebny
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: '#1a1a1a',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `handout-${selectedType}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Błąd podczas eksportu:', error);
      alert('Nie udało się wyeksportować obrazu. Sprawdź konsolę.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="wide">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            📜 Generator Handoutów
          </DialogTitle>
          <DialogDescription>
            Twórz realistyczne dokumenty w stylu lat 1920-1930
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edytor */}
          <div className="space-y-4">
            {/* Wybór typu */}
            <div>
              <Label>Typ dokumentu</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {HANDOUT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedType === type.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    title={type.description}
                  >
                    <span className="text-xl block">{type.icon}</span>
                    <span className="text-xs">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pola formularza zależne od typu */}
            {selectedType === 'newspaper' && (
              <>
                <div>
                  <Label>Gazeta</Label>
                  <select
                    value={newspaper}
                    onChange={(e) => setNewspaper(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground"
                  >
                    {NEWSPAPERS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tytuł artykułu</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="TAJEMNICZY ZGON NA UNIWERSYTECIE"
                  />
                </div>
              </>
            )}

            {selectedType === 'letter' && (
              <>
                <div>
                  <Label>Od kogo</Label>
                  <Input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Prof. Henry Armitage"
                  />
                </div>
                <div>
                  <Label>Miejsce nadania</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Biblioteka Uniwersytetu Miskatonic"
                  />
                </div>
              </>
            )}

            {selectedType === 'telegram' && (
              <div>
                <Label>Nadawca</Label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="DR WILMARTH STOP"
                />
              </div>
            )}

            {selectedType === 'report' && (
              <>
                <div>
                  <Label>Numer sprawy</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="AK-28-4472"
                  />
                </div>
                <div>
                  <Label>Prowadzący</Label>
                  <Input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Det. Francis Morgan"
                  />
                </div>
              </>
            )}

            {selectedType === 'book' && (
              <div>
                <Label>Tytuł księgi</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Necronomicon"
                />
              </div>
            )}

            {/* Pola wspólne */}
            <div>
              <Label>Data</Label>
              <Input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="17 października 1928"
              />
            </div>

            <div>
              <Label>Treść</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Treść dokumentu..."
                className="min-h-[150px]"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={generateHandout} className="flex-1">
                ✨ Generuj podgląd
              </Button>
            </div>
          </div>

          {/* Podgląd */}
          <div className="space-y-4">
            <Label>Podgląd</Label>
            <div
              ref={previewRef}
              className="bg-stone-900 border border-border rounded-lg p-4 min-h-[400px]"
            >
              {preview ? (
                <div
                  dangerouslySetInnerHTML={{ __html: preview }}
                  className="handout-preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Wygeneruj dokument, aby zobaczyć podgląd</p>
                </div>
              )}
            </div>

            {preview && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex-1"
                >
                  📋 Kopiuj HTML
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadAsImage}
                  className="flex-1"
                >
                  📥 Pobierz obraz
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function renderHandoutHTML(
  type: HandoutType,
  data: {
    title: string;
    content: string;
    date: string;
    author?: string;
    location?: string;
    newspaper?: string;
  }
): string {
  switch (type) {
    case 'newspaper':
      return `
<div style="font-family: 'Times New Roman', Georgia, serif; background: linear-gradient(135deg, #d4c4a8 0%, #c4b393 100%); padding: 20px; border: 3px double #5c4a32; max-width: 400px;">
  <div style="text-align: center; border-bottom: 2px solid #5c4a32; padding-bottom: 10px; margin-bottom: 15px;">
    <div style="font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #2d2416;">${data.newspaper || 'ARKHAM ADVERTISER'}</div>
    <div style="font-size: 11px; color: #5c4a32; margin-top: 5px;">${data.date}</div>
  </div>
  <div style="font-size: 16px; font-weight: bold; text-transform: uppercase; color: #2d2416; margin-bottom: 10px; line-height: 1.2;">
    ${data.title || 'TAJEMNICZE WYDARZENIA'}
  </div>
  <div style="font-size: 12px; color: #3d3020; line-height: 1.6; text-align: justify; column-count: 1;">
    ${data.content.replace(/\n/g, '<br>')}
  </div>
</div>`;

    case 'letter':
      return `
<div style="font-family: 'Brush Script MT', cursive, Georgia, serif; background: linear-gradient(135deg, #f5f0e1 0%, #e8dcc8 100%); padding: 30px; border: 1px solid #c4b393; max-width: 400px; position: relative;">
  <div style="position: absolute; top: 10px; right: 15px; font-size: 11px; color: #8b7355;">${data.location || 'Arkham'}, ${data.date}</div>
  <div style="margin-top: 30px; font-size: 16px; color: #3d3020; line-height: 1.8;">
    ${data.content.replace(/\n/g, '<br>')}
  </div>
  <div style="margin-top: 30px; text-align: right; font-style: italic; color: #5c4a32;">
    ${data.author || 'Twój przyjaciel'}
  </div>
</div>`;

    case 'telegram':
      return `
<div style="font-family: 'Courier New', monospace; background: #f5e6c8; padding: 20px; border: 3px solid #c4a35a; max-width: 400px;">
  <div style="text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 4px; color: #5c4a32; border-bottom: 2px solid #c4a35a; padding-bottom: 10px;">
    ═══ WESTERN UNION ═══
  </div>
  <div style="margin-top: 15px; font-size: 10px; color: #8b7355;">
    DATA: ${data.date} | KLASA: PILNE
  </div>
  <div style="margin-top: 15px; font-size: 14px; color: #2d2416; letter-spacing: 1px; line-height: 2; text-transform: uppercase;">
    ${data.content.replace(/\n/g, ' STOP<br>').replace(/\.\s*/g, ' STOP ')}
  </div>
  <div style="margin-top: 15px; font-size: 12px; color: #5c4a32;">
    NADAWCA: ${data.author || 'NIEZNANY'}
  </div>
</div>`;

    case 'report':
      return `
<div style="font-family: 'Courier New', monospace; background: #f8f6f0; padding: 20px; border: 1px solid #999; max-width: 450px;">
  <div style="text-align: center; font-size: 14px; font-weight: bold; letter-spacing: 2px; color: #333; border: 2px solid #333; padding: 8px; margin-bottom: 15px;">
    DEPARTAMENT POLICJI ARKHAM<br>
    <span style="font-size: 11px; font-weight: normal;">RAPORT DOCHODZENIOWY</span>
  </div>
  <div style="font-size: 11px; color: #555; margin-bottom: 10px;">
    Sprawa nr: ${data.title || 'AK-XX-XXXX'} | Data: ${data.date}<br>
    Prowadzący: ${data.author || 'Det. [NAZWISKO]'}
  </div>
  <div style="font-size: 12px; color: #333; line-height: 1.6; border-top: 1px solid #ccc; padding-top: 10px;">
    ${data.content.replace(/\n/g, '<br>')}
  </div>
  <div style="margin-top: 20px; text-align: right; font-size: 10px; color: #666; font-style: italic;">
    [PIECZĄTKA: POUFNE]
  </div>
</div>`;

    case 'diary':
      return `
<div style="font-family: 'Brush Script MT', cursive, Georgia, serif; background: linear-gradient(135deg, #e8dcc8 0%, #d4c4a8 100%); padding: 25px; border-left: 3px solid #8b4513; max-width: 400px; position: relative;">
  <div style="position: absolute; top: 10px; right: 10px; width: 20px; height: 20px; background: radial-gradient(circle, #8b0000 0%, transparent 70%); border-radius: 50%; opacity: 0.6;"></div>
  <div style="font-size: 12px; color: #5c4a32; margin-bottom: 15px; font-style: italic;">${data.date}</div>
  <div style="font-size: 14px; color: #2d2416; line-height: 1.8;">
    ${data.content.replace(/\n/g, '<br>')}
  </div>
  <div style="position: absolute; bottom: 20px; left: 30px; width: 40px; height: 15px; background: linear-gradient(90deg, #1a0a00 0%, transparent 100%); opacity: 0.3; transform: rotate(-5deg);"></div>
</div>`;

    case 'book':
      return `
<div style="font-family: Georgia, serif; background: linear-gradient(135deg, #1a0a00 0%, #2d1810 100%); padding: 25px; border: 2px solid #4a3020; max-width: 400px; color: #c4a878;">
  <div style="text-align: center; font-size: 14px; letter-spacing: 4px; color: #8b6914; margin-bottom: 20px; text-transform: uppercase;">
    ✦ ${data.title || 'NECRONOMICON'} ✦
  </div>
  <div style="font-size: 13px; font-style: italic; line-height: 1.8; text-align: justify;">
    ${data.content.replace(/\n/g, '<br>')}
  </div>
  <div style="margin-top: 20px; text-align: center; font-size: 20px; color: #8b6914;">
    ☠ ✦ ☠
  </div>
</div>`;

    case 'note':
    default:
      return `
<div style="font-family: 'Brush Script MT', cursive, Georgia, serif; background: #fffef0; padding: 20px; border: 1px dashed #999; max-width: 300px; transform: rotate(-1deg); box-shadow: 3px 3px 10px rgba(0,0,0,0.2);">
  <div style="font-size: 14px; color: #333; line-height: 1.8;">
    ${data.content.replace(/\n/g, '<br>')}
  </div>
  ${data.author ? `<div style="margin-top: 15px; text-align: right; font-size: 12px; color: #666;">- ${data.author}</div>` : ''}
</div>`;
  }
}

export default HandoutGenerator;
