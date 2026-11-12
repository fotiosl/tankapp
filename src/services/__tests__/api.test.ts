import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  clearApiCaches,
  DEMO_API_KEY,
  enableDemoMode,
  enableStandardProxyMode,
  fetchStations,
  fetchStationsAlongRoute,
  getApiMode,
  getApiStatus,
  saveApiKey,
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

    enableDemoMode();
    expect(getApiMode()).toBe('demo');
    expect(getApiStatus(true).isDemo).toBe(true);

    enableStandardProxyMode();
    expect(getApiMode()).toBe('proxy');
    expect(getApiStatus(true).isDemo).toBe(false);
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

  it('falls back to direct Tankerkoenig call when proxy returns proxyConfigured: false', async () => {
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
