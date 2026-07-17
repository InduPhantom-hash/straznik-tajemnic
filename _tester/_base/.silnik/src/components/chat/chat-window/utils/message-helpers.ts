/**
 * @file message-helpers - pure functions dla formatowania wiadomości czatu (IND-144 Wariant C, sesja 131).
 *
 * Extracted z ChatWindow.tsx (lin 98-139 przed split) jako micro 3/8.
 * Closure → pure functions (przyjmują `activeCharacter` przez arg zamiast lexical scope).
 * Plik leaf module bez `'use client'` (czysty TS, brak JSX).
 */

import type { Character, Message } from '@/lib/types';

export function getMessageStyle(role: Message['role']): string {
  if (role === 'assistant') {
    return 'border-l-4 border-l-primary bg-primary/5';
  } else if (role === 'user') {
    return 'border-l-4 border-l-accent bg-accent/10';
  }
  return 'border-l-4 border-l-muted bg-muted/20';
}

export function getAuthorColor(role: Message['role']): string {
  switch (role) {
    case 'assistant':
      return 'text-primary';
    case 'user':
      return 'text-foreground';
    default:
      return 'text-muted-foreground';
  }
}

export function getAuthorName(
  message: Message,
  activeCharacter: Character | null
): string {
  if (message.role === 'assistant') {
    return 'Mistrz Gry';
  } else if (message.role === 'user') {
    return activeCharacter?.name || 'Gracz';
  }
  return 'System';
}

export function getAuthorInitials(
  message: Message,
  activeCharacter: Character | null
): string {
  if (message.role === 'assistant') {
    return 'MG';
  } else if (message.role === 'user') {
    return activeCharacter?.name
      ? activeCharacter.name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
      : 'GR';
  }
  return 'SYS';
}
