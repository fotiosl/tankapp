import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  clearApiCaches,
  DEMO_API_KEY,
  enableDemoMode,
  enableStandardProxyMode,
  fetchProxyStatus,
  fetchStationDetails,
  fetchStations,
  fetchStationsAlongRoute,
  getApiMode,
  getApiStatus,
  getCustomApiKey,
  saveApiKey,
  searchAddress,
} from '../api';
import type { Station } from '../../types';

const sampleStation: Station = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Aral Musterstraße',
  brand: 'ARAL',
  street: 'Musterstraße',
  place: 'Berlin',
  lat: 52.52,
  lng: 13.4,
  dist: 1.0,
  diesel: 1.659,
  e5: 1.799,
  e10: 1.739,
  isOpen: true,
};

describe('services/api', () => {
  beforeEach(() => {
    localStorage.clear();
    clearApiCaches();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TANKERKOENIG_API_KEY', '');
  });

  it('reports accurate mode and demo status for proxy, custom key, and explicit demo mode', () => {
    expect(getApiMode()).toBe('proxy');
    expect(getApiStatus(true)).toEqual({
      mode: 'proxy',
      proxyConfigured: true,
      hasCustomKey: false,
      isDemo: false,
    });
    expect(getApiStatus(false).isDemo).toBe(true);

    saveApiKey('my-user-key-123');
    expect(getApiMode()).toBe('custom');
    expect(getApiStatus(true).isDemo).toBe(false);

    enableDemoMode(true);
    expect(getApiMode()).toBe('demo');
    expect(getCustomApiKey()).toBe('');
    expect(getApiStatus(true).isDemo).toBe(true);

    enableStandardProxyMode();
    expect(getApiMode()).toBe('proxy');
    expect(getApiStatus(true).isDemo).toBe(false);
  });

  it('does NOT poison cachedProxyStatus on AbortError (React StrictMode safety)', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError');
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(abortErr)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, proxyConfigured: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchProxyStatus();
    expect(first).toBeNull();

    const second = await fetchProxyStatus();
    expect(second).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT silently fall back to DEMO_API_KEY when proxy returns upstream 503', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ ok: false, message: 'Tankerkönig Server antwortete mit HTTP 503' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchStations({ lat: 52.52, lng: 13.4 }, 5)).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/stations?');
  });

  it('uses direct Tankerkoenig endpoint with DEMO_API_KEY in explicit demo mode even if proxy exists', async () => {
    enableDemoMode();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, stations: [sampleStation] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const stations = await fetchStations({ lat: 52.52, lng: 13.4 }, 5);
    expect(stations).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain('creativecommons.tankerkoenig.de/json/list.php');
    expect(calledUrl).toContain(`apikey=${DEMO_API_KEY}`);
  });

  it('bypasses 20s client cache when forceRefresh is true', async () => {
    saveApiKey('custom-key-abc');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, stations: [sampleStation] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          stations: [{ ...sampleStation, diesel: 1.619 }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchStations({ lat: 52.52, lng: 13.4 }, 5);
    const cached = await fetchStations({ lat: 52.52, lng: 13.4 }, 5);
    expect(cached[0]?.diesel).toBe(1.659);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const refreshed = await fetchStations({ lat: 52.52, lng: 13.4 }, 5, {
      forceRefresh: true,
    });
    expect(refreshed[0]?.diesel).toBe(1.619);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first).not.toBe(refreshed);
  });

  it('falls back to direct Tankerkoenig call only when proxy returns proxyConfigured: false or 404', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ ok: false, proxyConfigured: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, stations: [sampleStation] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchStations({ lat: 52.52, lng: 13.4 }, 5);
    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/stations?');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('creativecommons.tankerkoenig.de');
  });

  it('fetches and caches station details via proxy', async () => {
    const detail = {
      id: sampleStation.id,
      name: sampleStation.name,
      brand: sampleStation.brand,
      street: sampleStation.street,
      houseNumber: '1',
      postCode: 10117,
      place: 'Berlin',
      isOpen: true,
      wholeDay: false,
      openingTimes: [{ text: 'Mo-Fr', start: '06:00', end: '22:00' }],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, station: detail }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res1 = await fetchStationDetails(sampleStation.id);
    const res2 = await fetchStationDetails(sampleStation.id);
    expect(res1?.wholeDay).toBe(false);
    expect(res2).toEqual(res1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('routes searchAddress through /api/geocode and falls back to Nominatim on 404', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          results: [{ lat: 52.52, lng: 13.4, displayName: 'Berlin' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => null,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ lat: '48.1351', lon: '11.5820', display_name: 'München' }],
      });
    vi.stubGlobal('fetch', fetchMock);

    const berlin = await searchAddress('Berlin');
    expect(berlin[0]?.displayName).toBe('Berlin');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/geocode?q=Berlin');

    // Cache hit for Berlin
    const berlinCached = await searchAddress('berlin');
    expect(berlinCached).toEqual(berlin);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Fallback on 404 for München
    const munich = await searchAddress('München');
    expect(munich[0]?.displayName).toBe('München');
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain('nominatim.openstreetmap.org');
  });

  it('deduplicates identical start/dest waypoints and warns on partial failures or long routes', async () => {
    enableDemoMode();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, stations: [sampleStation] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchStationsAlongRoute({ lat: 52.52, lng: 13.4 }, { lat: 52.52, lng: 13.4 }, 4);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    clearApiCaches();
    let warning = '';
    await fetchStationsAlongRoute(
      { lat: 53.55, lng: 9.99 },
      { lat: 48.13, lng: 11.58 },
      4,
      {
        onWarning: (msg) => {
          warning = msg;
        },
      }
    );
    expect(warning).toContain('Lange Strecke');
  });

  it('throws error in fetchStationsAlongRoute when all waypoints fail', async () => {
    enableDemoMode();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ ok: false }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchStationsAlongRoute({ lat: 52.52, lng: 13.4 }, { lat: 52.6, lng: 13.5 }, 4)
    ).rejects.toThrow(/503/);
  });
});
