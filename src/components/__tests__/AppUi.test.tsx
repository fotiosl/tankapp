import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from '../Header';
import { StationCard } from '../StationCard';
import { SettingsModal } from '../SettingsModal';
import type { Station } from '../../types';
import * as api from '../../services/api';

const sampleStation: Station = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Aral Teststation',
  brand: 'ARAL',
  street: 'Friedrichstraße',
  place: 'Berlin',
  lat: 52.52,
  lng: 13.38,
  dist: 2.5,
  diesel: 1.664,
  e5: 1.799,
  e10: 1.739,
  isOpen: true,
};

describe('UI Components', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TANKERKOENIG_API_KEY', '');
  });

  it('shows Demo-Modus badge in Header only when isDemoMode is true', () => {
    const { rerender } = render(
      <Header
        onOpenSettings={vi.fn()}
        onOpenInstallGuide={vi.fn()}
        onOpenPriceAlert={vi.fn()}
        isDemoMode={false}
        theme="dark"
        onToggleTheme={vi.fn()}
      />
    );
    expect(screen.queryByText(/Demo-Modus/i)).not.toBeInTheDocument();

    rerender(
      <Header
        onOpenSettings={vi.fn()}
        onOpenInstallGuide={vi.fn()}
        onOpenPriceAlert={vi.fn()}
        isDemoMode={true}
        theme="dark"
        onToggleTheme={vi.fn()}
      />
    );
    expect(screen.getByText(/Demo-Modus/i)).toBeInTheDocument();
  });

  it('renders StationCard cleanly without "undefined", formats prices consistently, and shows detail errors', async () => {
    vi.spyOn(api, 'fetchStationDetails').mockRejectedValueOnce(new Error('API Fehler 503'));

    render(
      <StationCard
        station={sampleStation}
        selectedFuel="diesel"
        minPrice={1.66}
        minDist={0.5}
        closestStationPrice={1.75}
        userSettings={{ tankVolumeLiters: 50, consumptionPer100Km: 7 }}
        isRouteMode={true}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />
    );

    expect(screen.getByText('Friedrichstraße, Berlin')).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    expect(screen.getByText('+0,4 ct ggü. Günstigste')).toBeInTheDocument();
    // Secondary fuels use 3 decimals with German comma
    expect(screen.getByText('1,739 €')).toBeInTheDocument();
    // Savings banner is hidden in Route Mode
    expect(screen.queryByText(/netto/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Öffnungszeiten anzeigen'));
    await waitFor(() => {
      expect(screen.getByText('API Fehler 503')).toBeInTheDocument();
    });
  });

  it('closes SettingsModal on Escape key and displays accurate proxy status', () => {
    const onClose = vi.fn();
    render(
      <SettingsModal
        isOpen={true}
        onClose={onClose}
        onModeChanged={vi.fn()}
        apiStatus={{
          mode: 'proxy',
          proxyConfigured: false,
          hasCustomKey: false,
          isDemo: true,
        }}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Kostenloser persönlicher API-Key/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
