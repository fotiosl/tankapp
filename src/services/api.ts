import type {
  ApiMode,
  ApiStatusInfo,
  Coordinates,
  Station,
  StationDetailData,
  TankerkoenigDetailResponse,
  TankerkoenigResponse,
} from '../types';

export const DEMO_API_KEY = '00000000-0000-0000-0000-000000000002';
const API_KEY_STORAGE = 'tankapp_api_key';
const API_MODE_STORAGE = 'tankapp_api_mode';
const CACHE_TTL_MS = 20_000;
const MAX_CACHE_ENTRIES = 30;
const REQUEST_TIMEOUT_MS = 10_000;

interface StationCacheEntry {
  timestamp: number;
  stations: Station[];
}

const stationCache = new Map<string, StationCacheEntry>();
const detailCache = new Map<string, { timestamp: number; data: StationDetailData }>();
let cachedProxyStatus: boolean | null = null;

export function clearApiCaches(): void {
  stationCache.clear();
  detailCache.clear();
}

export function getCustomApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE)?.trim() || '';
  } catch {
    return '';
  }
}

export function getDevEnvApiKey(): string {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_TANKERKOENIG_API_KEY?.trim() || '';
  }
  return '';
}

export function getApiMode(): ApiMode {
  try {
    const savedMode = localStorage.getItem(API_MODE_STORAGE);
    const customKey = getCustomApiKey();

    if (savedMode === 'demo') return 'demo';
    if (savedMode === 'custom' && customKey) return 'custom';
    if (!savedMode && customKey) return 'custom';
  } catch {
    // Fallback to proxy mode
  }
  return 'proxy';
}

export function getStoredApiKey(): string {
  const mode = getApiMode();
  if (mode === 'demo') return DEMO_API_KEY;
  if (mode === 'custom') {
    const customKey = getCustomApiKey();
    if (customKey) return customKey;
  }

  const devEnvKey = getDevEnvApiKey();
  if (devEnvKey) return devEnvKey;

  return DEMO_API_KEY;
}

export function saveApiKey(key: string): void {
  const cleanKey = key.trim();
  try {
    if (!cleanKey) {
      localStorage.removeItem(API_KEY_STORAGE);
      localStorage.setItem(API_MODE_STORAGE, 'proxy');
    } else {
      localStorage.setItem(API_KEY_STORAGE, cleanKey);
      localStorage.setItem(API_MODE_STORAGE, 'custom');
    }
  } catch {
    // Ignore storage errors
  }
  clearApiCaches();
}

export function enableDemoMode(): void {
  try {
    localStorage.setItem(API_MODE_STORAGE, 'demo');
  } catch {
    // Ignore storage errors
  }
  clearApiCaches();
}

export function enableStandardProxyMode(): void {
  try {
    localStorage.removeItem(API_KEY_STORAGE);
    localStorage.setItem(API_MODE_STORAGE, 'proxy');
  } catch {
    // Ignore storage errors
  }
  clearApiCaches();
}

export function getApiStatus(proxyConfigured: boolean | null = cachedProxyStatus): ApiStatusInfo {
  const mode = getApiMode();
  const hasCustomKey = Boolean(getCustomApiKey());

  if (mode === 'custom' && hasCustomKey) {
    return {
      mode: 'custom',
      proxyConfigured,
      hasCustomKey: true,
      isDemo: false,
    };
  }

  if (mode === 'demo') {
    return {
      mode: 'demo',
      proxyConfigured,
      hasCustomKey,
      isDemo: true,
    };
  }

  const hasDevKey = Boolean(getDevEnvApiKey());
  const isDemo = proxyConfigured === false && !hasDevKey;

  return {
    mode: 'proxy',
    proxyConfigured,
    hasCustomKey,
    isDemo,
  };
}

export async function fetchProxyStatus(signal?: AbortSignal): Promise<boolean> {
  if (cachedProxyStatus !== null) {
    return cachedProxyStatus;
  }

  try {
    const combinedSignal = combineAbortSignals(signal, 4000);
    const res = await fetch('/api/stations?mode=status', { signal: combinedSignal });
    if (!res.ok) {
      cachedProxyStatus = false;
      return false;
    }
    const data = (await res.json()) as { ok?: boolean; proxyConfigured?: boolean };
    cachedProxyStatus = Boolean(data.ok && data.proxyConfigured);
    return cachedProxyStatus;
  } catch {
    cachedProxyStatus = false;
    return false;
  }
}

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function validateApiKey(key: string): Promise<{ valid: boolean; message?: string }> {
  try {
    const params = new URLSearchParams({
      lat: '52.521',
      lng: '13.438',
      rad: '1.5',
      sort: 'dist',
      type: 'all',
      apikey: key.trim(),
    });
    const url = `https://creativecommons.tankerkoenig.de/json/list.php?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) {
      return { valid: false, message: `Server antwortete mit HTTP ${res.status}` };
    }
    const data = (await res.json()) as TankerkoenigResponse;
    if (data.ok) {
      return { valid: true };
    }
    return { valid: false, message: data.message || 'API-Key ungültig' };
  } catch (err: unknown) {
    return { valid: false, message: formatFetchError(err).message };
  }
}

function combineAbortSignals(externalSignal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!externalSignal) return timeoutSignal;
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([externalSignal, timeoutSignal]);
  }
  return externalSignal;
}

function formatFetchError(err: unknown): Error {
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return err;
    }
    if (err.name === 'TimeoutError') {
      return new Error('Zeitüberschreitung bei der Anfrage an Tankerkönig. Bitte erneut versuchen.');
    }
    const msg = err.message.toLowerCase();
    if (
      err instanceof TypeError &&
      (msg.includes('fetch') || msg.includes('load failed') || msg.includes('network'))
    ) {
      return new Error(
        'Verbindung zu Tankerkönig fehlgeschlagen oder blockiert. Bei zu vielen Anfragen blockiert die Tankerkönig-Firewall IP-Adressen vorübergehend für ca. 10 Minuten – bitte kurz warten oder Netz wechseln.'
      );
    }
    return err;
  }
  return new Error('Unbekannter Netzwerkfehler');
}

function getStationCacheKey(coords: Coordinates, radKm: number, mode: ApiMode): string {
  return `${mode}:${coords.lat.toFixed(3)}:${coords.lng.toFixed(3)}:${radKm}`;
}

function setBoundedCacheEntry(key: string, stations: Station[]): void {
  if (stationCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = stationCache.keys().next().value;
    if (oldestKey) stationCache.delete(oldestKey);
  }
  stationCache.set(key, { timestamp: Date.now(), stations });
}

export interface FetchStationsOptions {
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

export async function fetchStations(
  coords: Coordinates,
  radKm: number = 5,
  options: FetchStationsOptions = {}
): Promise<Station[]> {
  const { forceRefresh = false, signal } = options;
  const clampedRadius = Math.min(Math.max(radKm, 1), 25);
  const mode = getApiMode();
  const cacheKey = getStationCacheKey(coords, clampedRadius, mode);
  const now = Date.now();

  // 1. Client-seitiger Cache (überspringbar via forceRefresh)
  if (!forceRefresh) {
    const cached = stationCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.stations;
    }
  }

  // 2. Primär: Vercel Serverless Function (/api/stations), wenn Proxy-Modus aktiv
  if (mode === 'proxy') {
    let shouldFallbackToDirect = false;

    try {
      const proxyParams = new URLSearchParams({
        lat: coords.lat.toFixed(4),
        lng: coords.lng.toFixed(4),
        rad: String(clampedRadius),
      });
      const proxyRes = await fetch(`/api/stations?${proxyParams.toString()}`, {
        signal: combineAbortSignals(signal, REQUEST_TIMEOUT_MS),
      });

      if (proxyRes.status === 404) {
        cachedProxyStatus = false;
        shouldFallbackToDirect = true;
      } else {
        const data = (await proxyRes.json().catch(() => null)) as
          | (TankerkoenigResponse & { proxyConfigured?: boolean })
          | null;

        if (data?.proxyConfigured === false) {
          cachedProxyStatus = false;
          shouldFallbackToDirect = true;
        } else if (!proxyRes.ok) {
          if (proxyRes.status === 503) {
            throw new Error('Rate-Limit erreicht: Bitte kurz warten und erneut versuchen (Fehler 503).');
          }
          throw new Error(
            data?.message || `Fehler bei der Proxy-Abfrage: HTTP ${proxyRes.status}`
          );
        } else if (data && data.ok && Array.isArray(data.stations)) {
          cachedProxyStatus = true;
          setBoundedCacheEntry(cacheKey, data.stations);
          return data.stations;
        } else {
          throw new Error(data?.message || 'Tankerkönig API meldete einen Fehler.');
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      if (!shouldFallbackToDirect && cachedProxyStatus === true) {
        throw formatFetchError(err);
      }
      shouldFallbackToDirect = true;
    }

    if (!shouldFallbackToDirect) {
      return [];
    }
  }

  // 3. Direkter Aufruf der Tankerkönig API (Custom-Key, expliziter Demo-Modus oder lokaler Fallback)
  const apiKey = getStoredApiKey();
  const directParams = new URLSearchParams({
    lat: String(coords.lat),
    lng: String(coords.lng),
    rad: String(clampedRadius),
    sort: 'dist',
    type: 'all',
    apikey: apiKey,
  });
  const directUrl = `https://creativecommons.tankerkoenig.de/json/list.php?${directParams.toString()}`;

  try {
    const response = await fetch(directUrl, {
      signal: combineAbortSignals(signal, REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('Rate-Limit erreicht: Bitte kurz warten und erneut versuchen (Fehler 503).');
      }
      throw new Error(`Fehler bei der Tankstellen-Abfrage: HTTP ${response.status}`);
    }

    const data = (await response.json()) as TankerkoenigResponse;

    if (!data.ok) {
      throw new Error(data.message || 'Tankerkönig API meldete einen Fehler.');
    }

    const stations = data.stations || [];
    setBoundedCacheEntry(cacheKey, stations);

    return stations;
  } catch (err: unknown) {
    throw formatFetchError(err);
  }
}

/**
 * Ruft Detailinformationen (inkl. Öffnungszeiten-Wochenplan) für eine Tankstelle ab
 */
export async function fetchStationDetails(
  stationId: string,
  signal?: AbortSignal
): Promise<StationDetailData | null> {
  const mode = getApiMode();
  const cacheKey = `${mode}:${stationId}`;
  const cached = detailCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < 1000 * 60 * 30) {
    return cached.data;
  }

  if (mode === 'proxy') {
    let shouldFallbackToDirect = false;
    try {
      const res = await fetch(`/api/stations?id=${encodeURIComponent(stationId)}`, {
        signal: combineAbortSignals(signal, REQUEST_TIMEOUT_MS),
      });
      if (res.status === 404) {
        shouldFallbackToDirect = true;
      } else {
        const data = (await res.json().catch(() => null)) as
          | (TankerkoenigDetailResponse & { proxyConfigured?: boolean })
          | null;

        if (data?.proxyConfigured === false) {
          shouldFallbackToDirect = true;
        } else if (!res.ok) {
          throw new Error(data?.message || `HTTP ${res.status}`);
        } else if (data?.ok && data.station) {
          detailCache.set(cacheKey, { timestamp: now, data: data.station });
          return data.station;
        } else {
          throw new Error(data?.message || 'Details konnten nicht geladen werden.');
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      if (!shouldFallbackToDirect && cachedProxyStatus === true) {
        throw formatFetchError(err);
      }
      shouldFallbackToDirect = true;
    }

    if (!shouldFallbackToDirect) return null;
  }

  const apiKey = getStoredApiKey();
  const directParams = new URLSearchParams({
    id: stationId,
    apikey: apiKey,
  });
  const directUrl = `https://creativecommons.tankerkoenig.de/json/detail.php?${directParams.toString()}`;

  try {
    const res = await fetch(directUrl, {
      signal: combineAbortSignals(signal, REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`Fehler beim Laden der Details: HTTP ${res.status}`);
    }
    const data = (await res.json()) as TankerkoenigDetailResponse;
    if (!data.ok) {
      throw new Error(data.message || 'Details konnten nicht geladen werden.');
    }
    if (data.station) {
      detailCache.set(cacheKey, { timestamp: now, data: data.station });
      return data.station;
    }
    return null;
  } catch (err: unknown) {
    throw formatFetchError(err);
  }
}

/**
 * Sucht Tankstellen entlang einer Route zwischen zwei Orten
 */
export async function fetchStationsAlongRoute(
  start: Coordinates,
  dest: Coordinates,
  corridorRadiusKm: number = 4,
  options: FetchStationsOptions = {}
): Promise<Station[]> {
  const { forceRefresh = false, signal } = options;
  const totalDist = calculateDistanceKm(start.lat, start.lng, dest.lat, dest.lng);

  // Wegpunkte alle ~7 km für überlappende Korridor-Abdeckung (max. 10 Abfragen zur Schonung von Limits)
  const stepKm = Math.max(corridorRadiusKm * 1.75, 5);
  const numSteps = Math.min(Math.max(Math.ceil(totalDist / stepKm), 1), 9);
  const waypoints: Coordinates[] = [];

  for (let i = 0; i <= numSteps; i++) {
    const fraction = i / numSteps;
    waypoints.push({
      lat: start.lat + (dest.lat - start.lat) * fraction,
      lng: start.lng + (dest.lng - start.lng) * fraction,
    });
  }

  const results: Station[] = [];
  const seenIds = new Set<string>();
  let successCount = 0;
  let lastError: Error | null = null;

  // In kleinen 3er-Batches parallel abfragen
  const batchSize = 3;
  for (let i = 0; i < waypoints.length; i += batchSize) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const batch = waypoints.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map((pt) => fetchStations(pt, corridorRadiusKm, { forceRefresh, signal }))
    );

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        successCount++;
        for (const s of outcome.value) {
          if (!seenIds.has(s.id)) {
            seenIds.add(s.id);
            const distFromStart = calculateDistanceKm(start.lat, start.lng, s.lat, s.lng);
            results.push({
              ...s,
              dist: Math.round(distFromStart * 10) / 10,
            });
          }
        }
      } else {
        if (outcome.reason instanceof Error && outcome.reason.name === 'AbortError') {
          throw outcome.reason;
        }
        lastError =
          outcome.reason instanceof Error
            ? outcome.reason
            : new Error('Fehler bei Routenabfrage');
      }
    }
  }

  if (successCount === 0 && lastError) {
    throw lastError;
  }

  return results;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
}

export async function searchAddress(
  query: string,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    countrycodes: 'de',
    limit: '5',
    addressdetails: '1',
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'de',
    },
    signal: combineAbortSignals(signal, 8000),
  });

  if (!res.ok) {
    throw new Error(`Ortssuche fehlgeschlagen (HTTP ${res.status}). Bitte kurz warten.`);
  }

  const items = (await res.json()) as NominatimItem[];
  return items
    .map((it) => ({
      lat: Number.parseFloat(it.lat),
      lng: Number.parseFloat(it.lon),
      displayName: it.display_name,
    }))
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}
