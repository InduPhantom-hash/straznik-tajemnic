import { render, screen } from '@testing-library/react';
import { WizardEquipmentView } from './wizard-equipment-view';

describe('WizardEquipmentView', () => {
  it('poprawnie renderuje prerenderowane przedmioty startowe z miniaturami i mechanikami', () => {
    render(
      <WizardEquipmentView
        equipmentStr="Nóż, Lina (15 m), Manierka, Apteczka"
        era="1920s"
      />
    );

    // Nazwy przedmiotów
    expect(screen.getByText('Nóż')).toBeInTheDocument();
    expect(screen.getByText('Lina (15 m)')).toBeInTheDocument();
    expect(screen.getByText('Manierka')).toBeInTheDocument();
    expect(screen.getByText('Apteczka')).toBeInTheDocument();

    // Miniatury WebP z katalogu
    const knifeImg = screen.getByAltText('Nóż');
    expect(knifeImg).toHaveAttribute(
      'src',
      expect.stringContaining('/equipment/catalog/knife-shared.webp')
    );

    const ropeImg = screen.getByAltText('Lina (15 m)');
    expect(ropeImg).toHaveAttribute(
      'src',
      expect.stringContaining('/equipment/catalog/rope-shared.webp')
    );

    const flaskImg = screen.getByAltText('Manierka');
    expect(flaskImg).toHaveAttribute(
      'src',
      expect.stringContaining('/equipment/catalog/flask-shared.webp')
    );

    const aidImg = screen.getByAltText('Apteczka');
    expect(aidImg).toHaveAttribute(
      'src',
      expect.stringContaining('/equipment/catalog/first-aid-prl-1970s.webp')
    );

    // Mechanika broni: obrażenia
    expect(screen.getByText('1d4+2')).toBeInTheDocument();

    // Mechanika medyczna: dawki/użycia
    expect(screen.getByText(/3 (dawek|użycia)/)).toBeInTheDocument();
  });

  it('renderuje stan pusty gdy brak przedmiotów', () => {
    render(<WizardEquipmentView equipmentStr="" era="1920s" />);
    expect(
      screen.getByText(/Brak przypisanego ekwipunku/i)
    ).toBeInTheDocument();
  });
});
