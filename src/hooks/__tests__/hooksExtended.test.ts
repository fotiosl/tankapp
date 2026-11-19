import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePriceAlert } from '../usePriceAlert';
import { useTheme } from '../useTheme';
import { useFavorites } from '../useFavorites';
import { usePwaInstall } from '../usePwaInstall';
import { useStations } from '../useStations';
import type { Station } from '../../types';
import * as api from '../../services/api';

const openStation: Station = {
  id: 'open-1',
  name: 'JET Alexanderplatz',
  brand: 'JET',
  street: 'Alexanderplatz',
  place: 'Berlin',
  lat: 52.52,
  lng: 13.41,
  dist: 1.2,
  diesel: 1.589,
  e5: 1.729,
  e10: 1.679,
  isOpen: true,
};

const closedCheapStation: Station = {
  ...openStation,
  id: 'closed-1',
  name: 'Geschlossen Billig',
  diesel: 1.399,
  isOpen: false,
};

describe('Extended Hooks Coverage', () => {
  const originalNotification = window.Notification;
  const originalOnLine = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'Notification', {
      value: originalNotification,
      configurable: true,
      writable: true,
    });
    if (originalOnLine) {
      Object.defineProperty(Navigator.prototype, 'onLine', originalOnLine);
    }
  });

  it('usePriceAlert ignores closed stations, returns cheapest open hit, and notifies via ServiceWorker', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({ showNotification }),
      },
      configurable: true,
    });
    Object.defineProperty(window, 'Notification', {
      value: Object.assign(vi.fn(), { permission: 'granted' }),
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() =>
      usePriceAlert([closedCheapStation, openStation], {
        enabled: true,
        fuelType: 'diesel',
        targetPrice: 1.6,
      })
    );

    expect(result.current).toEqual({
      stationId: 'open-1',
      stationName: 'JET Alexanderplatz',
      price: 1.589,
      count: 1,
    });

    await waitFor(() => {
      expect(showNotification).toHaveBeenCalledTimes(1);
    });
    expect(String(showNotification.mock.calls[0]?.[0])).toContain('1,589 €');
  });

  it('useTheme respects prefers-color-scheme and updates theme-color & iOS status bar meta tags', () => {
    const themeMeta = document.createElement('meta');
    themeMeta.setAttribute('name', 'theme-color');
    const statusMeta = document.createElement('meta');
    statusMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
    document.head.append(themeMeta, statusMeta);

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true }) // prefers-color-scheme: light
    );

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(themeMeta.getAttribute('content')).toBe('#f1f5f9');
    expect(statusMeta.getAttribute('content')).toBe('default');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(themeMeta.getAttribute('content')).toBe('#0f172a');
    expect(statusMeta.getAttribute('content')).toBe('black-translucent');

    themeMeta.remove();
    statusMeta.remove();
  });

  it('useFavorites toggles IDs and recovers from corrupted localStorage', () => {
    localStorage.setItem('tankapp_favorites', '{"broken":true}');
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favoriteIds).toEqual([]);

    act(() => {
      result.current.toggleFavorite('station-a');
    });
    expect(result.current.isFavorite('station-a')).toBe(true);

    act(() => {
      result.current.toggleFavorite('station-a');
    });
    expect(result.current.isFavorite('station-a')).toBe(false);
  });

  it('usePwaInstall captures beforeinstallprompt and triggers native install prompt', async () => {
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.canPromptNativeInstall).toBe(false);

    const installEvent = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(installEvent, 'prompt', { value: promptMock });
    Object.defineProperty(installEvent, 'userChoice', {
      value: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });

    act(() => {
      window.dispatchEvent(installEvent);
    });

    expect(result.current.canPromptNativeInstall).toBe(true);

    let accepted = false;
    await act(async () => {
      accepted = await result.current.triggerNativeInstall();
    });

    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(accepted).toBe(true);
    expect(result.current.isStandalone).toBe(true);
  });

  it('useStations falls back to offline snapshot when offline fetch fails', async () => {
    localStorage.setItem(
      'tankapp_offline_stations',
      JSON.stringify({ timestamp: Date.now() - 60_000, stations: [openStation] })
    );
    Object.defineProperty(Navigator.prototype, 'onLine', {
      get: () => false,
      configurable: true,
    });
    vi.spyOn(api, 'fetchStations').mockRejectedValueOnce(new Error('Offline'));

    const { result } = renderHook(() =>
      useStations({
        coords: { lat: 52.52, lng: 13.4 },
        radiusKm: 5,
        isRouteMode: false,
        routeDest: null,
        hasResolvedInitialLocation: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isShowingCachedOffline).toBe(true);
    });
    expect(result.current.stations).toHaveLength(1);
    expect(result.current.stations[0]?.name).toBe('JET Alexanderplatz');
  });
});
