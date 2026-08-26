#!/usr/bin/env python3
"""Audyt i18n: wykrywa hardcode'owane polskie teksty w plikach TSX/TS.

Uzycie:
    python3 find_jsx_text.py <plik.tsx> [plik2.tsx ...]
    python3 find_jsx_text.py $(cat chunk_aa)

Zasada: kazda linia z polskimi znakami diakrytycznymi poza komentarzami
jest trafieniem. Czysty plik (teksty w messages/*.json przez t()) = 0 trafien.
Exit code: 0 = czysto, 1 = sa trafienia.
"""
import re
import sys

POLISH = re.compile(r'[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]')


def strip_comments(src: str) -> str:
    """Usuwa komentarze blokowe /* */ i liniowe // (ale nie w URL-ach)."""
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.DOTALL)
    src = re.sub(r'(^|[^:"\'`\w])//.*$', r'\1', src, flags=re.MULTILINE)
    return src


def scan_file(path: str) -> list[tuple[int, str]]:
    try:
        with open(path, encoding='utf-8') as f:
            src = f.read()
    except OSError as exc:
        print(f'{path}: BLAD ODCZYTU: {exc}')
        return []
    code = strip_comments(src)
    hits = []
    for lineno, line in enumerate(code.split('\n'), 1):
        if POLISH.search(line):
            hits.append((lineno, line.strip()))
    return hits


def main() -> int:
    files = sys.argv[1:]
    if not files:
        print('uzycie: find_jsx_text.py <plik...>')
        return 2
    total = 0
    per_file: dict[str, int] = {}
    for path in files:
        hits = scan_file(path)
        per_file[path] = len(hits)
        total += len(hits)
        for lineno, text in hits:
            print(f'{path}:{lineno}: {text}')
    print(f'--- {total} trafien w {len(files)} plikach ---')
    for path, count in sorted(per_file.items(), key=lambda kv: -kv[1]):
        if count:
            print(f'  {count:>4}  {path}')
    return 1 if total else 0


if __name__ == '__main__':
    sys.exit(main())
