import { render, screen } from '@testing-library/react';
import type { Character } from '@/lib/types';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { EquipmentModal } from './equipment-modal';

jest.mock('@/lib/api-keys-service', () => ({
  fetchWithApiKeys: jest.fn(),
}));

describe('EquipmentModal catalog images', () => {
  it('does not expose AI regeneration for a catalog asset', () => {
    const character = {
      id: 'investigator-1',
      name: 'Janina Różycka',
      equipment: [
        {
          id: 'revolver-1',
          templateId: 'weapon.revolver-38',
          name: 'Rewolwer .38',
          category: 'weapon',
          visualSource: 'catalog',
          imageUrl: '/equipment/catalog/revolver-1940s.webp',
        },
      ],
    } as Character;

    render(
      <EquipmentModal
        open
        onOpenChange={jest.fn()}
        character={character}
        onCharacterUpdate={jest.fn()}
        era="1946"
      />
    );

    expect(screen.getByAltText('Rewolwer .38')).toBeInTheDocument();
    expect(
      screen.queryByTitle('Wygeneruj nową ilustrację AI przedmiotu')
    ).not.toBeInTheDocument();
    expect(fetchWithApiKeys).not.toHaveBeenCalled();
  });
});
