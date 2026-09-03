import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EquipmentDetailDialog } from './equipment-detail-dialog';
import { EquipmentItem } from '@/lib/types';

describe('EquipmentDetailDialog', () => {
  const mockItem: EquipmentItem = {
    id: 'eq_1',
    name: 'Tajemniczy List',
    category: 'document',
    description: 'Stary pożółkły list znaleziony w piwnicy.',
    condition: 'used',
    source: 'found',
    obtainedAt: new Date(),
  };

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('renders item details correctly', () => {
    render(<EquipmentDetailDialog item={mockItem} onClose={jest.fn()} />);
    expect(screen.getByText('Tajemniczy List')).toBeInTheDocument();
    expect(screen.getByText('Stary pożółkły list znaleziony w piwnicy.')).toBeInTheDocument();
  });

  it('renders read button for document categories', () => {
    const handleUpdate = jest.fn();
    render(
      <EquipmentDetailDialog
        item={mockItem}
        onClose={jest.fn()}
        onUpdateItem={handleUpdate}
      />
    );
    expect(screen.getByText('📖 Przeczytaj dokument')).toBeInTheDocument();
  });

  it('displays readable content when present', () => {
    const readableItem: EquipmentItem = {
      ...mockItem,
      readableContent: 'Treść sekretnej wiadomości...',
      readableContentStatus: 'ready',
    };
    render(<EquipmentDetailDialog item={readableItem} onClose={jest.fn()} />);
    expect(screen.queryByText('📖 Przeczytaj dokument')).not.toBeInTheDocument();
    expect(screen.getByText('Treść sekretnej wiadomości...')).toBeInTheDocument();
  });

  it('triggers API call on read click and updates item', async () => {
    const handleUpdate = jest.fn();
    localStorage.setItem(
      'adventure_context',
      JSON.stringify({
        id: 'test-1973',
        title: 'Test 1973',
        yearRange: '1973',
        country: 'Polska',
      })
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, content: 'Zinterpretowana treść z API...' }),
    });

    render(
      <EquipmentDetailDialog
        item={mockItem}
        onClose={jest.fn()}
        onUpdateItem={handleUpdate}
      />
    );

    const button = screen.getByText('📖 Przeczytaj dokument');
    fireEvent.click(button);

    expect(screen.getByText('Badanie dokumentu...')).toBeInTheDocument();

    await waitFor(() => {
      expect(handleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          readableContent: 'Zinterpretowana treść z API...',
          readableContentStatus: 'ready',
          isReadable: true,
        })
      );
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/equipment/read-item',
      expect.objectContaining({
        body: expect.stringContaining('"effectiveYear":1973'),
      })
    );
  });

  it('calls onClose when close X button is clicked', () => {
    const handleClose = jest.fn();
    render(<EquipmentDetailDialog item={mockItem} onClose={handleClose} />);
    const closeButton = screen.getByRole('button', { name: 'Zamknij' });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalled();
  });

  it('allows expanding and collapsing the document viewer', () => {
    const readableItem: EquipmentItem = {
      ...mockItem,
      readableContent: 'Bardzo długi tekst z archiwum...',
      readableContentStatus: 'ready',
    };
    render(<EquipmentDetailDialog item={readableItem} onClose={jest.fn()} />);
    
    // Przycisk powiększenia
    const expandBtn = screen.getByTitle('Powiększ dokument');
    expect(expandBtn).toBeInTheDocument();
    fireEvent.click(expandBtn);

    // W trybie rozszerzonym pojawia się przycisk zwinięcia
    const collapseBtn = screen.getByText('Zwiń do widoku przedmiotu');
    expect(collapseBtn).toBeInTheDocument();

    // Zwinięcie z powrotem
    fireEvent.click(collapseBtn);
    expect(screen.getByTitle('Powiększ dokument')).toBeInTheDocument();
  });
});
