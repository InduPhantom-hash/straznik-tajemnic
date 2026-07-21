import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpModal } from './HelpModal';

describe('HelpModal Component', () => {
  it('should not render anything when isOpen is false', () => {
    const { container } = render(<HelpModal isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render modal header and default tab (EPOCH_WIKI) when isOpen is true', () => {
    render(<HelpModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/Pomoc & Encyklopedia Badacza/i)).toBeInTheDocument();
    expect(screen.getByText(/Polska \(1990–2000\)/i)).toBeInTheDocument();
  });

  it('should switch tabs correctly', () => {
    render(<HelpModal isOpen={true} onClose={() => {}} />);
    
    // Switch to Rules & Bestiary
    const rulesTabBtn = screen.getByRole('button', { name: /Zasady & Bestiariusz/i });
    fireEvent.click(rulesTabBtn);
    expect(screen.getByText(/Testy Umiejętności \(k100\)/i)).toBeInTheDocument();

    // Switch to AI Assistant
    const assistantTabBtn = screen.getByRole('button', { name: /Asystent AI/i });
    fireEvent.click(assistantTabBtn);
    expect(screen.getByText(/Asystent RAG Pomocy:/i)).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(<HelpModal isOpen={true} onClose={handleClose} />);
    
    const closeBtn = screen.getByTitle(/Zamknij/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', () => {
    const handleClose = jest.fn();
    render(<HelpModal isOpen={true} onClose={handleClose} />);
    
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
