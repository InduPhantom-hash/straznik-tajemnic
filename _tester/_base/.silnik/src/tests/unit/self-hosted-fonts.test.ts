import fs from 'fs';
import path from 'path';

describe('Self-Hosted Fonts (Issue #480)', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const fontsCssPath = path.join(rootDir, 'src/app/fonts.css');
  const layoutPath = path.join(rootDir, 'src/app/layout.tsx');
  const publicFontsDir = path.join(rootDir, 'public/fonts');

  it('powinien zawierać plik src/app/fonts.css z definicjami wszystkich wymaganych krojów Dark Art Déco', () => {
    expect(fs.existsSync(fontsCssPath)).toBe(true);
    const content = fs.readFileSync(fontsCssPath, 'utf8');

    expect(content).toContain("font-family: 'Cinzel'");
    expect(content).toContain("font-family: 'Cinzel Decorative'");
    expect(content).toContain("font-family: 'Cormorant Garamond'");
    expect(content).toContain("font-family: 'Special Elite'");
  });

  it('nie powinien zawierać żadnych zewnętrznych linków sieciowych w src/app/fonts.css', () => {
    const content = fs.readFileSync(fontsCssPath, 'utf8');
    expect(content).not.toMatch(/https?:\/\//i);
    expect(content).not.toContain('fonts.googleapis.com');
    expect(content).not.toContain('fonts.gstatic.com');
  });

  it('każdy plik woff2 zadeklarowany w fonts.css musi fizycznie istnieć w public/fonts/ i mieć niezerowy rozmiar', () => {
    const content = fs.readFileSync(fontsCssPath, 'utf8');
    const urlMatches = content.match(/url\(['"]?\/fonts\/([^'")]+)['"]?\)/g) || [];
    expect(urlMatches.length).toBeGreaterThan(0);

    const filenames = new Set(
      urlMatches.map((m) => m.replace(/url\(['"]?\/fonts\//, '').replace(/['"]?\)/, ''))
    );

    for (const filename of filenames) {
      const filePath = path.join(publicFontsDir, filename);
      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(1000); // pliki woff2 mają zazwyczaj od kilku do kilkunastu KB
    }
  });

  it('src/app/layout.tsx nie powinien zawierać zewnętrznych linków do Google Fonts w sekcji head', () => {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    expect(layoutContent).not.toContain('fonts.googleapis.com');
    expect(layoutContent).not.toContain('fonts.gstatic.com');
    expect(layoutContent).toContain("import './fonts.css';");
  });
});
