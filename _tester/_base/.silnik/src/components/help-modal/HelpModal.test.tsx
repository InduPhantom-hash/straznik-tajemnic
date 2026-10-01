import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HelpModal } from './HelpModal';

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        entries: [
          {
            id: 'arkham',
            category: 'locations',
            categoryTitle: 'Lokacje',
            term: 'Arkham',
            shortDefinition: 'Miasteczko w Massachusetts.',
            fullContent: 'Siedziba Uniwersytetu Miskatonic.',
            tags: ['lovecraft'],
            isPublicDomain: true,
          },
        ],
      }),
  })
) as jest.Mock;

describe('HelpModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render anything when isOpen is false', () => {
    const { container } = render(<HelpModal isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render modal header and default tab (EPOCH_WIKI) when isOpen is true', async () => {
    render(<HelpModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/MISKATONIC ARCHIVES • 1920s/i)).toBeInTheDocument();
    expect(screen.getByText(/Pomoc & Encyklopedia Badacza/i)).toBeInTheDocument();
    expect(screen.getByText(/Polska \(1990–2000\)/i)).toBeInTheDocument();
    const epochTabBtn = screen.getByRole('button', { name: /Polska \(1990–2000\)/i });
    expect(epochTabBtn).toHaveClass('border-primary', 'text-primary');

    await waitFor(() => {
      expect(screen.getAllByText('Arkham').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should switch tabs correctly and apply emerald accent to active sub-tabs and CTA', async () => {
    render(<HelpModal isOpen={true} onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getAllByText('Arkham').length).toBeGreaterThanOrEqual(1);
    });
    
    // Switch to Rules & Bestiary
    const rulesTabBtn = screen.getByRole('button', { name: /Zasady & Bestiariusz/i });
    fireEvent.click(rulesTabBtn);
    expect(screen.getByText(/Testy Umiejętności \(k100\)/i)).toBeInTheDocument();
    expect(rulesTabBtn).toHaveClass('border-primary', 'text-primary');

    // Switch to AI Assistant
    const assistantTabBtn = screen.getByRole('button', { name: /Asystent AI/i });
    fireEvent.click(assistantTabBtn);
    expect(screen.getByText(/Asystent RAG Pomocy:/i)).toBeInTheDocument();
    expect(assistantTabBtn).toHaveClass('border-primary', 'text-primary');

    const askBtn = screen.getByRole('button', { name: /Zadaj Pytanie/i });
    expect(askBtn).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('should call onClose when close button is clicked', async () => {
    const handleClose = jest.fn();
    render(<HelpModal isOpen={true} onClose={handleClose} />);
    await waitFor(() => {
      expect(screen.getAllByText('Arkham').length).toBeGreaterThanOrEqual(1);
    });
    
    const closeBtn = screen.getByTitle(/Zamknij/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', async () => {
    const handleClose = jest.fn();
    render(<HelpModal isOpen={true} onClose={handleClose} />);
    await waitFor(() => {
      expect(screen.getAllByText('Arkham').length).toBeGreaterThanOrEqual(1);
    });
    
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
