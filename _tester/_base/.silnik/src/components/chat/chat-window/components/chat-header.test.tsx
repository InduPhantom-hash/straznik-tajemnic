import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ChatHeader } from './chat-header';

jest.mock('../../../ui/campaign-clock', () => ({
  CampaignClock: () => <div data-testid="campaign-clock" />,
}));

describe('ChatHeader', () => {
  it('reserves desktop width for the full Miskatonic adventure title', () => {
    const title = 'Mystery of the Miskatonic Library';

    render(<ChatHeader title={title} />);

    const titleLabel = screen.getByTitle(title);
    expect(titleLabel).toHaveTextContent(title);
    expect(titleLabel).toHaveClass('truncate');
    expect(titleLabel.parentElement?.parentElement).toHaveClass(
      'md:grid-cols-[minmax(24rem,1fr)_minmax(0,1fr)_auto]'
    );
  });

  it('shows the complete region and current place without an artificial width limit', () => {
    const location =
      'Inkaskie grobowce pod stacją kolejową · Region Huancayo/Huancavelica (La Mejorada, Yauli)';

    render(
      <ChatHeader
        title="Tajemnica Czarnego Sarkofagu"
        region="Region Huancayo/Huancavelica (La Mejorada, Yauli)"
        currentLocation="Inkaskie grobowce pod stacją kolejową"
      />
    );

    const locationLabel = screen.getByTitle(location);
    expect(locationLabel).toHaveTextContent(location);
    expect(locationLabel).not.toHaveClass('max-w-[10rem]');
    expect(locationLabel).not.toHaveClass('sm:max-w-[16rem]');
    expect(screen.getByTestId('campaign-clock')).toBeInTheDocument();
  });
});
