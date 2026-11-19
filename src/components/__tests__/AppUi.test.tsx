import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../../App';
import { Header } from '../Header';
import { StationCard } from '../StationCard';
import { SettingsModal } from '../SettingsModal';
import { PriceAlertModal } from '../PriceAlertModal';
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

const closedCheaperStation: Station = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Shell Geschlossen',
  brand: 'Shell',
  street: 'Torstraße',
  place: 'Berlin',
  lat: 52.53,
  lng: 13.39,
  dist: 0.9999,
  diesel: 1.499,
  e5: 1.699,
  e10: 1.649,
  isOpen: false,
};

describe('UI Components & App Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    api.clearApiCaches();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TANKERKOENIG_API_KEY', '');
  });

  it('shows Demo-Modus badge in Header only when isDemoMode is true and hides install button when standalone', () => {
    const { rerender } = render(
      <Header
        onOpenSettings={vi.fn()}
        onOpenInstallGuide={vi.fn()}
        onOpenPriceAlert={vi.fn()}
        isDemoMode={false}
        showInstallButton={false}
        theme="dark"
        onToggleTheme={vi.fn()}
      />
    );
    expect(screen.queryByText(/Demo-Modus/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Installationsanleitung öffnen')).not.toBeInTheDocument();

    rerender(
      <Header
        onOpenSettings={vi.fn()}
        onOpenInstallGuide={vi.fn()}
        onOpenPriceAlert={vi.fn()}
        isDemoMode={true}
        showInstallButton={true}
        theme="dark"
        onToggleTheme={vi.fn()}
      />
    );
    expect(screen.getByText(/Demo-Modus/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Installationsanleitung öffnen')).toBeInTheDocument();
  });

  it('renders StationCard cleanly, shows detail errors and holiday overrides, and hides savings on closed stations', async () => {
    vi.spyOn(api, 'fetchStationDetails')
      .mockRejectedValueOnce(new Error('API Fehler 503'))
      .mockResolvedValueOnce({
        id: sampleStation.id,
        name: sampleStation.name,
        brand: sampleStation.brand,
        street: sampleStation.street,
        houseNumber: '12',
        postCode: 10117,
        place: 'Berlin',
        isOpen: true,
        wholeDay: false,
        openingTimes: [{ text: 'Mo-Fr', start: '06:00', end: '22:00' }],
        overrides: ['Heiligabend 08:00-14:00'],
      });

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
    expect(screen.getByText('1,739 €')).toBeInTheDocument();
    expect(screen.queryByText(/netto/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Öffnungszeiten anzeigen'));
    await waitFor(() => {
      expect(screen.getByText('API Fehler 503')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Erneut laden'));
    await waitFor(() => {
      expect(screen.getByText('Heiligabend 08:00-14:00')).toBeInTheDocument();
    });

    // Closed station must never show net savings or "1000 m"
    render(
      <StationCard
        station={closedCheaperStation}
        selectedFuel="diesel"
        minPrice={1.664}
        minDist={0.1}
        closestStationPrice={1.75}
        userSettings={{ tankVolumeLiters: 50, consumptionPer100Km: 7 }}
        isRouteMode={false}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />
    );
    expect(screen.getByText('1,0 km')).toBeInTheDocument();
    expect(screen.queryByText(/netto/)).not.toBeInTheDocument();
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

  it('saves price alert and user settings in PriceAlertModal', () => {
    const onSavePriceAlert = vi.fn();
    const onSaveUserSettings = vi.fn();
    render(
      <PriceAlertModal
        isOpen={true}
        onClose={vi.fn()}
        priceAlert={{ enabled: false, fuelType: 'diesel', targetPrice: 1.609 }}
        onSavePriceAlert={onSavePriceAlert}
        userSettings={{ tankVolumeLiters: 50, consumptionPer100Km: 7 }}
        onSaveUserSettings={onSaveUserSettings}
        currentFuelType="diesel"
      />
    );

    fireEvent.click(screen.getByLabelText(/Wunschpreis-Alarm/i));
    fireEvent.click(screen.getByText('Einstellungen speichern'));

    expect(onSavePriceAlert).toHaveBeenCalledWith({
      enabled: true,
      fuelType: 'diesel',
      targetPrice: 1.609,
    });
    expect(onSaveUserSettings).toHaveBeenCalledWith({
      tankVolumeLiters: 50,
      consumptionPer100Km: 7,
    });
  });

  it('renders CC BY 4.0 attribution, excludes closed stations from minPrice, and clears stations in Route Mode', async () => {
    localStorage.setItem('tankapp_only_open', 'false');
    localStorage.setItem(
      'tankapp_last_coords',
      JSON.stringify({ lat: 52.52, lng: 13.38, name: 'Berlin' })
    );

    vi.spyOn(api, 'fetchProxyStatus').mockResolvedValue(true);
    vi.spyOn(api, 'fetchStations').mockResolvedValue([sampleStation, closedCheaperStation]);

    render(<App />);

    // Mandatory CC BY 4.0 attribution must be present in the UI
    expect(screen.getByText(/CC BY 4\.0/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Aral Teststation')).toBeInTheDocument();
    });

    // Only the open station gets "Günstigste", not the cheaper closed station
    expect(screen.getAllByText('Günstigste')).toHaveLength(1);

    // Switching to Route Mode clears old Umkreis stations and shows route destination prompt
    fireEvent.click(screen.getByText('Entlang Route'));
    await waitFor(() => {
      expect(screen.queryByText('Aral Teststation')).not.toBeInTheDocument();
      expect(
        screen.getByText(/Bitte oben einen Zielort suchen und auswählen/i)
      ).toBeInTheDocument();
    });
  });
});
