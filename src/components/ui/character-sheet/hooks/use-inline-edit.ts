/**
 * CharacterSheet - inline edit hook (IND-185 M4, sesja 132).
 *
 * Hook izolujący stan edycji inline cech pochodnych (HP/SAN/MP/LUCK).
 * 2 useState + 3 callbacks (start/save/cancel). Wycięte z character-sheet.tsx
 * (lin 42-70 "Stan edycji inline").
 *
 * Pattern bottom-up extraction (analog sesji 130 use-typewriter-sound).
 */

import { useState, useCallback } from 'react';
import type { Character } from '@/lib/types';

export interface UseInlineEditReturn {
  /** Aktualnie edytowane pole (np. 'hp', 'san', 'mp', 'luck') albo null. */
  editingField: string | null;
  /** Wartość w inputie liczbowym podczas edycji. */
  editValue: number;
  /** Setter `editValue` (do bezpośredniego użycia w onChange inputa). */
  setEditValue: (value: number) => void;
  /** Rozpocznij edycję pola: zapamiętaj nazwę + bieżącą wartość. */
  startEditing: (field: string, currentValue: number) => void;
  /** Zatwierdź edycję: zaktualizuj character przez onCharacterUpdate. */
  saveEditing: () => void;
  /** Anuluj edycję: wyzeruj editingField bez zmian. */
  cancelEditing: () => void;
}

/**
 * Hook stanu edycji inline cech pochodnych karty postaci.
 *
 * Wspiera 4 pola CoC 7e: 'hp', 'san', 'mp', 'luck'. Inne wartości pola
 * w `saveEditing` są ignorowane (no-op po onCharacterUpdate update).
 *
 * @param character Postać (snapshot) - undefined ⇒ no-op w save.
 * @param onCharacterUpdate Callback do zapisu zaktualizowanej postaci.
 */
export function useInlineEdit(
  character: Character | undefined,
  onCharacterUpdate: ((c: Character) => void) | undefined
): UseInlineEditReturn {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const startEditing = useCallback((field: string, currentValue: number) => {
    setEditingField(field);
    setEditValue(currentValue);
  }, []);

  const saveEditing = useCallback(() => {
    if (!character || !editingField || !onCharacterUpdate) return;

    const updatedCharacter = { ...character };

    if (editingField === 'hp') updatedCharacter.hp = editValue;
    else if (editingField === 'san') updatedCharacter.san = editValue;
    else if (editingField === 'mp') updatedCharacter.mp = editValue;
    else if (editingField === 'luck') updatedCharacter.luck = editValue;

    onCharacterUpdate(updatedCharacter);
    setEditingField(null);
  }, [character, editingField, editValue, onCharacterUpdate]);

  const cancelEditing = useCallback(() => {
    setEditingField(null);
  }, []);

  return {
    editingField,
    editValue,
    setEditValue,
    startEditing,
    saveEditing,
    cancelEditing,
  };
}
