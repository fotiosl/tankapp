import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { PWAInstallGuideModal } from '../PWAInstallGuideModal';
import { AddressSearchBox } from '../AddressSearchBox';
import { SearchAndFilters } from '../SearchAndFilters';
import { SettingsModal } from '../SettingsModal';
import { ModalShell } from '../ModalShell';
import { MapView } from '../MapView';
import type { Station } from '../../types';
import * as api from '../../services/api';

function CrashComponent(): never {
  throw new Error('Test crash');
}

const mapStation: Station = {
  id: 'map-station-1',
  name: 'Aral Kurfürstendamm',
  brand: 'ARAL',
  street: 'Kurfürstendamm',
  place: 'Berlin',
  lat: 52.502,
  lng: 13.332,
  dist: 1.5,
  diesel: 1.659,
  e5: 1.799,
  e10: 1.739,
  isOpen: true,
};

describe('Extended Component Coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    api.clearApiCaches();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ErrorBoundary catches runtime errors and displays recovery UI', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <CrashComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Unerwarteter Fehler')).toBeInTheDocument();
    expect(screen.getByText('App neu laden')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('PWAInstallGuideModal renders 1-click install prompt when supported', async () => {
    const onTrigger = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <PWAInstallGuideModal
        isOpen={true}
        onClose={onClose}
        canPromptNativeInstall={true}
        onTriggerNativeInstall={onTrigger}
      />
    );

    fireEvent.click(screen.getByText('TankApp jetzt installieren'));
    await waitFor(() => {
      expect(onTrigger).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('AddressSearchBox validates minimum length, handles errors, and selects geocoding results', async () => {
    const onSelect = vi.fn();
    vi.spyOn(api, 'searchAddress')
      .mockRejectedValueOnce(new Error('Ortssuche fehlgeschlagen'))
      .mockResolvedValueOnce([{ lat: 48.1351, lng: 11.582, displayName: 'München, Bayern' }]);

    render(
      <AddressSearchBox placeholder="Ort suchen..." submitLabel="Suchen" onSelect={onSelect} />
    );

    const input = screen.getByLabelText('Ort suchen...');
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.click(screen.getByText('Suchen'));
    expect(screen.getByText('Bitte mindestens 2 Zeichen eingeben.')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'München' } });
    fireEvent.click(screen.getByText('Suchen'));
    await waitFor(() => {
      expect(screen.getByText('Ortssuche fehlgeschlagen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Suchen'));
    await waitFor(() => {
      expect(screen.getByText('München, Bayern')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('München, Bayern'));
    expect(onSelect).toHaveBeenCalledWith({
      lat: 48.1351,
      lng: 11.582,
      displayName: 'München, Bayern',
    });
  });

  it('SearchAndFilters debounces radius slider, saves/clears quick locations, and swaps route endpoints', () => {
    vi.useFakeTimers();
    const onRadiusChange = vi.fn();
    const onSelectCoords = vi.fn();
    const onSelectRouteDest = vi.fn();

    render(
      <SearchAndFilters
        searchTerm=""
        onSearchTermChange={vi.fn()}
        radiusKm={5}
        onRadiusChange={onRadiusChange}
        sortMode="price"
        onSortModeChange={vi.fn()}
        onlyOpen={true}
        onOnlyOpenChange={vi.fn()}
        currentCoords={{ lat: 52.52, lng: 13.4, name: 'Berlin' }}
        onSelectCoords={onSelectCoords}
        onRefreshLocation={vi.fn()}
        isLoadingLocation={false}
        onlyFavorites={false}
        onOnlyFavoritesChange={vi.fn()}
        favoriteCount={0}
        isRouteMode={false}
        onToggleRouteMode={vi.fn()}
        routeDestination={null}
        onSelectRouteDestination={onSelectRouteDest}
      />
    );

    // Open filter panel and drag slider rapidly
    fireEvent.click(screen.getByTitle('Filter & Radius anpassen'));
    const slider = screen.getByLabelText('Suchradius');
    fireEvent.change(slider, { target: { value: '10' } });
    fireEvent.change(slider, { target: { value: '15' } });
    fireEvent.change(slider, { target: { value: '20' } });

    expect(onRadiusChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(310);
    });
    expect(onRadiusChange).toHaveBeenCalledTimes(1);
    expect(onRadiusChange).toHaveBeenCalledWith(20);

    // Save Quick Location "Zuhause" and verify confirmation feedback + delete button
    fireEvent.click(screen.getByText('+ Zuhause'));
    expect(screen.getByText('Zuhause gespeichert ✓')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Zuhause-Speicherpunkt löschen'));
    expect(screen.getByText('+ Zuhause')).toBeInTheDocument();

    vi.useRealTimers();

    // Route start/dest swap
    render(
      <SearchAndFilters
        searchTerm=""
        onSearchTermChange={vi.fn()}
        radiusKm={5}
        onRadiusChange={vi.fn()}
        sortMode="price"
        onSortModeChange={vi.fn()}
        onlyOpen={true}
        onOnlyOpenChange={vi.fn()}
        currentCoords={{ lat: 52.52, lng: 13.4, name: 'Berlin' }}
        onSelectCoords={onSelectCoords}
        onRefreshLocation={vi.fn()}
        isLoadingLocation={false}
        onlyFavorites={false}
        onOnlyFavoritesChange={vi.fn()}
        favoriteCount={0}
        isRouteMode={true}
        onToggleRouteMode={vi.fn()}
        routeDestination={{ lat: 48.13, lng: 11.58, name: 'München' }}
        onSelectRouteDestination={onSelectRouteDest}
      />
    );

    fireEvent.click(screen.getByLabelText('Start und Ziel tauschen'));
    expect(onSelectCoords).toHaveBeenCalledWith({ lat: 48.13, lng: 11.58, name: 'München' });
    expect(onSelectRouteDest).toHaveBeenCalledWith({ lat: 52.52, lng: 13.4, name: 'Berlin' });
  });

  it('SettingsModal validates custom keys and clears stored key on empty submit in demo fallback', async () => {
    api.saveApiKey('old-custom-key');
    vi.spyOn(api, 'validateApiKey').mockResolvedValueOnce({ valid: false, message: 'Key ungültig' });

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        onModeChanged={vi.fn()}
        apiStatus={{ mode: 'custom', proxyConfigured: false, hasCustomKey: true, isDemo: false }}
      />
    );

    const input = screen.getByLabelText('Persönlicher API-Key');
    expect(input).toHaveValue('old-custom-key');

    fireEvent.click(screen.getByText('Key prüfen & speichern'));
    await waitFor(() => {
      expect(screen.getByText('Key ungültig')).toBeInTheDocument();
    });

    // Clearing input removes stored key cleanly
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText('Key prüfen & speichern'));
    await waitFor(() => {
      expect(api.getCustomApiKey()).toBe('');
    });
  });

  it('ModalShell traps Tab focus inside the dialog and restores focus on close', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <ModalShell isOpen={true} onClose={vi.fn()} titleId="test-modal">
        <h2 id="test-modal">Titel</h2>
        <button type="button">Erster</button>
        <button type="button">Letzter</button>
      </ModalShell>
    );

    const first = screen.getByText('Erster');
    const last = screen.getByText('Letzter');
    expect(document.activeElement).toBe(first);

    // Shift+Tab from first wraps to last
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    // Tab from last wraps to first
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(first);

    // Closing restores focus to trigger
    rerender(
      <ModalShell isOpen={false} onClose={vi.fn()} titleId="test-modal">
        <h2 id="test-modal">Titel</h2>
      </ModalShell>
    );
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('MapView mounts with dark/light tiles, route overlay, and updates markers in-place on favorite toggle', () => {
    const onCenterUser = vi.fn();
    const { container, rerender } = render(
      <MapView
        stations={[mapStation]}
        userCoords={{ lat: 52.52, lng: 13.4, name: 'Berlin' }}
        selectedFuel="diesel"
        minPrice={1.659}
        theme="dark"
        isRouteMode={true}
        routeDestination={{ lat: 52.55, lng: 13.45, name: 'Ziel' }}
        onCenterUser={onCenterUser}
        favoriteIds={[]}
        onToggleFavorite={vi.fn()}
      />
    );

    // Outer container has isolate stacking context
    expect(container.firstElementChild?.className).toContain('isolate');

    // Rerender with favorite toggled & light theme (in-place marker update, no crash)
    rerender(
      <MapView
        stations={[mapStation]}
        userCoords={{ lat: 52.52, lng: 13.4, name: 'Berlin' }}
        selectedFuel="diesel"
        minPrice={1.659}
        theme="light"
        isRouteMode={true}
        routeDestination={{ lat: 52.55, lng: 13.45, name: 'Ziel' }}
        onCenterUser={onCenterUser}
        favoriteIds={['map-station-1']}
        onToggleFavorite={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Karte auf meinen Standort zentrieren'));
    expect(onCenterUser).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Alle Tankstellen auf der Karte einpassen'));
  });
});
