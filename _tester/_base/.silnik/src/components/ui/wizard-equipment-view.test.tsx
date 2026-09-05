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

  it('poprawnie renderuje przedmioty Parapsychologa (Termometr, Detektor EMF, Aparat) z odpowiednimi kategoriami i grafikami', () => {
    render(
      <WizardEquipmentView
        equipmentStr="Termometr, Detektor pola elektromagnetycznego, Aparat fotograficzny, Notatnik i ołówek"
        era="1920s"
      />
    );

    // Nazwy przedmiotów
    expect(screen.getByText('Termometr')).toBeInTheDocument();
    expect(screen.getByText('Detektor pola elektromagnetycznego')).toBeInTheDocument();
    expect(screen.getByText('Aparat fotograficzny')).toBeInTheDocument();
    expect(screen.getByText('Notatnik i ołówek')).toBeInTheDocument();

    // Miniatura aparatu z epoki 1920s
    const cameraImg = screen.getByAltText('Aparat fotograficzny');
    expect(cameraImg).toHaveAttribute(
      'src',
      expect.stringContaining('/equipment/catalog/camera-1920s.webp')
    );

    // Narzędzia: Termometr, Detektor EMF, Aparat fotograficzny
    const toolBadges = screen.getAllByText('Narzędzia');
    expect(toolBadges.length).toBeGreaterThanOrEqual(3);
  });

  it('renderuje stan pusty gdy brak przedmiotów', () => {
    render(<WizardEquipmentView equipmentStr="" era="1920s" />);
    expect(
      screen.getByText(/Brak przypisanego ekwipunku/i)
    ).toBeInTheDocument();
  });
});
