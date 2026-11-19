import type {
  ApiMode,
  ApiStatusInfo,
  Coordinates,
  Station,
  StationDetailData,
} from '../types';
import {
  isRecord,
  isStationDetailData,
  isStationLike,
  readJsonUnknown,
} from '../utils/typeGuards';

export const DEMO_API_KEY = '00000000-0000-0000-0000-000000000002';
const API_KEY_STORAGE = 'tankapp_api_key';
const API_MODE_STORAGE = 'tankapp_api_mode';
const CACHE_TTL_MS = 20_000;
const DETAIL_CACHE_TTL_MS = 1000 * 60 * 30;
const GEOCODE_CACHE_TTL_MS = 1000 * 60 * 10;
const MAX_STATION_CACHE_ENTRIES = 30;
const MAX_DETAIL_CACHE_ENTRIES = 60;
const MAX_GEOCODE_CACHE_ENTRIES = 40;
const REQUEST_TIMEOUT_MS = 10_000;

interface StationCacheEntry {
  timestamp: number;
  stations: Station[];
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

const stationCache = new Map<string, StationCacheEntry>();
const detailCache = new Map<string, { timestamp: number; data: StationDetailData }>();
const geocodeCache = new Map<string, { timestamp: number; results: GeocodeResult[] }>();

let cachedProxyStatus: boolean | null = null;
const proxyStatusListeners = new Set<(status: boolean | null) => void>();

function setCachedProxyStatus(next: boolean | null): void {
  if (cachedProxyStatus === next) return;
  cachedProxyStatus = next;
  proxyStatusListeners.forEach((listener) => listener(next));
}

export function subscribeProxyStatus(listener: (status: boolean | null) => void): () => void {
  proxyStatusListeners.add(listener);
  return () => {
    proxyStatusListeners.delete(listener);
  };
}

export function clearApiCaches(): void {
  stationCache.clear();
  detailCache.clear();
  geocodeCache.clear();
  setCachedProxyStatus(null);
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
  stationCache.clear();
  detailCache.clear();
}

export function enableDemoMode(clearStoredKey: boolean = false): void {
  try {
    if (clearStoredKey) {
      localStorage.removeItem(API_KEY_STORAGE);
    }
    localStorage.setItem(API_MODE_STORAGE, 'demo');
  } catch {
    // Ignore storage errors
  }
  stationCache.clear();
  detailCache.clear();
}

export function enableStandardProxyMode(): void {
  try {
    localStorage.removeItem(API_KEY_STORAGE);
    localStorage.setItem(API_MODE_STORAGE, 'proxy');
  } catch {
    // Ignore storage errors
  }
  stationCache.clear();
  detailCache.clear();
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

function createTimedSignal(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number
): { signal: AbortSignal; cleanup: () => void } {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    if (!externalSignal) {
      return { signal: timeoutSignal, cleanup: () => {} };
    }
    if (typeof AbortSignal.any === 'function') {
      return { signal: AbortSignal.any([externalSignal, timeoutSignal]), cleanup: () => {} };
    }
  }

  const controller = new AbortController();
  const timerId = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason ?? new DOMException('Aborted', 'AbortError'));
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      onExternalAbort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timerId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export async function fetchProxyStatus(signal?: AbortSignal): Promise<boolean | null> {
  if (cachedProxyStatus !== null) {
    return cachedProxyStatus;
  }

  const { signal: combinedSignal, cleanup } = createTimedSignal(signal, 4000);
  try {
    const res = await fetch('/api/stations?mode=status', { signal: combinedSignal });
    if (res.status === 404) {
      setCachedProxyStatus(false);
      return false;
    }
    if (!res.ok) {
      return null;
    }
    const data = await readJsonUnknown(res).catch(() => null);
    if (isRecord(data) && typeof data.proxyConfigured === 'boolean') {
      const configured = Boolean(data.ok && data.proxyConfigured);
      setCachedProxyStatus(configured);
      return configured;
    }
    return null;
  } catch (err: unknown) {
    // Aborts (z.B. React StrictMode) oder temporäre Netzstörungen dürfen cachedProxyStatus nicht dauerhaft vergiften
    if (isAbortError(err)) {
      return cachedProxyStatus;
    }
    return null;
  } finally {
    cleanup();
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

export async function validateApiKey(
  key: string,
  signal?: AbortSignal
): Promise<{ valid: boolean; message?: string }> {
  const { signal: combinedSignal, cleanup } = createTimedSignal(signal, REQUEST_TIMEOUT_MS);
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
    const res = await fetch(url, { signal: combinedSignal });
    if (!res.ok) {
      return { valid: false, message: `Server antwortete mit HTTP ${res.status}` };
    }
    const data = await readJsonUnknown(res);
    if (isRecord(data) && data.ok === true) {
      return { valid: true };
    }
    const errMsg = isRecord(data) && typeof data.message === 'string' ? data.message : undefined;
    return { valid: false, message: errMsg || 'API-Key ungültig' };
  } catch (err: unknown) {
    if (isAbortError(err)) {
      throw err;
    }
    return { valid: false, message: formatFetchError(err).message };
  } finally {
    cleanup();
  }
}

function formatFetchError(err: unknown, serviceName: string = 'Tankerkönig'): Error {
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return err;
    }
    if (err.name === 'TimeoutError') {
      return new Error(
        `Zeitüberschreitung bei der Anfrage an ${serviceName}. Bitte erneut versuchen.`
      );
    }
    const msg = err.message.toLowerCase();
    if (
      err instanceof TypeError &&
      (msg.includes('fetch') || msg.includes('load failed') || msg.includes('network'))
    ) {
      if (serviceName === 'Tankerkönig') {
        return new Error(
          'Verbindung zu Tankerkönig fehlgeschlagen oder blockiert. Bei zu vielen Anfragen blockiert die Tankerkönig-Firewall IP-Adressen vorübergehend für ca. 10 Minuten – bitte kurz warten oder Netz wechseln.'
        );
      }
      return new Error(`Verbindung zu ${serviceName} fehlgeschlagen. Bitte erneut versuchen.`);
    }
    return err;
  }
  return new Error('Unbekannter Netzwerkfehler');
}

function setBoundedMapEntry<K, V>(map: Map<K, V>, key: K, value: V, maxEntries: number): void {
  if (map.has(key)) {
    map.delete(key);
  } else if (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) {
      map.delete(oldestKey);
    }
  }
  map.set(key, value);
}

function getStationCacheKey(coords: Coordinates, radKm: number, mode: ApiMode): string {
  return `${mode}:${coords.lat.toFixed(3)}:${coords.lng.toFixed(3)}:${radKm}`;
}

export interface FetchStationsOptions {
  forceRefresh?: boolean;
  signal?: AbortSignal;
  onWarning?: (message: string) => void;
}

export async function fetchStations(
  coords: Coordinates,
  radKm: number = 5,
  options: FetchStationsOptions = {}
): Promise<Station[]> {
  const { forceRefresh = false, signal } = options;
  const clampedRadius = Math.round(Math.min(Math.max(radKm, 1), 25));
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
    const { signal: proxySignal, cleanup } = createTimedSignal(signal, REQUEST_TIMEOUT_MS);

    try {
      const proxyParams = new URLSearchParams({
        lat: coords.lat.toFixed(3),
        lng: coords.lng.toFixed(3),
        rad: String(clampedRadius),
      });
      const proxyRes = await fetch(`/api/stations?${proxyParams.toString()}`, {
        signal: proxySignal,
        cache: forceRefresh ? 'no-cache' : 'default',
      });

      if (proxyRes.status === 404) {
        setCachedProxyStatus(false);
        shouldFallbackToDirect = true;
      } else {
        const rawData = await readJsonUnknown(proxyRes).catch(() => null);
        const data = isRecord(rawData) ? rawData : null;
        const apiMessage = typeof data?.message === 'string' ? data.message : undefined;

        if (data?.proxyConfigured === false) {
          setCachedProxyStatus(false);
          shouldFallbackToDirect = true;
        } else if (!proxyRes.ok) {
          if (proxyRes.status === 429) {
            throw new Error(
              apiMessage || 'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.'
            );
          }
          if (proxyRes.status === 503) {
            throw new Error(
              'Rate-Limit erreicht: Bitte kurz warten und erneut versuchen (Fehler 503).'
            );
          }
          throw new Error(apiMessage || `Fehler bei der Proxy-Abfrage: HTTP ${proxyRes.status}`);
        } else if (data && data.ok === true && Array.isArray(data.stations)) {
          const validStations = data.stations.filter(isStationLike);
          setCachedProxyStatus(true);
          setBoundedMapEntry(
            stationCache,
            cacheKey,
            { timestamp: now, stations: validStations },
            MAX_STATION_CACHE_ENTRIES
          );
          return validStations;
        } else {
          throw new Error(apiMessage || 'Tankerkönig API meldete einen Fehler.');
        }
      }
    } catch (err: unknown) {
      if (isAbortError(err)) {
        throw err;
      }
      // Niemals stillschweigend auf Demo-Preise zurückfallen, wenn der Proxy erreichbar war oder ein echter Fehler auftrat
      if (!shouldFallbackToDirect) {
        throw formatFetchError(err);
      }
    } finally {
      cleanup();
    }

    if (!shouldFallbackToDirect) {
      return [];
    }
  }

  // 3. Direkter Aufruf der Tankerkönig API (Custom-Key, expliziter Demo-Modus oder lokaler Fallback ohne Proxy)
  const apiKey = getStoredApiKey();
  const directParams = new URLSearchParams({
    lat: coords.lat.toFixed(3),
    lng: coords.lng.toFixed(3),
    rad: String(clampedRadius),
    sort: 'dist',
    type: 'all',
    apikey: apiKey,
  });
  const directUrl = `https://creativecommons.tankerkoenig.de/json/list.php?${directParams.toString()}`;
  const { signal: directSignal, cleanup } = createTimedSignal(signal, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(directUrl, {
      signal: directSignal,
      cache: forceRefresh ? 'no-cache' : 'default',
    });
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('Rate-Limit erreicht: Bitte kurz warten und erneut versuchen (Fehler 503).');
      }
      throw new Error(`Fehler bei der Tankstellen-Abfrage: HTTP ${response.status}`);
    }

    const rawData = await readJsonUnknown(response);
    const data = isRecord(rawData) ? rawData : null;
    const apiMessage = typeof data?.message === 'string' ? data.message : undefined;

    if (!data || data.ok !== true) {
      throw new Error(apiMessage || 'Tankerkönig API meldete einen Fehler.');
    }

    const stations = Array.isArray(data.stations) ? data.stations.filter(isStationLike) : [];
    setBoundedMapEntry(
      stationCache,
      cacheKey,
      { timestamp: now, stations },
      MAX_STATION_CACHE_ENTRIES
    );

    return stations;
  } catch (err: unknown) {
    throw formatFetchError(err);
  } finally {
    cleanup();
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
  if (cached && now - cached.timestamp < DETAIL_CACHE_TTL_MS) {
    return cached.data;
  }

  if (mode === 'proxy') {
    let shouldFallbackToDirect = false;
    const { signal: proxySignal, cleanup } = createTimedSignal(signal, REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`/api/stations?id=${encodeURIComponent(stationId)}`, {
        signal: proxySignal,
      });
      if (res.status === 404) {
        setCachedProxyStatus(false);
        shouldFallbackToDirect = true;
      } else {
        const rawData = await readJsonUnknown(res).catch(() => null);
        const data = isRecord(rawData) ? rawData : null;
        const apiMessage = typeof data?.message === 'string' ? data.message : undefined;

        if (data?.proxyConfigured === false) {
          setCachedProxyStatus(false);
          shouldFallbackToDirect = true;
        } else if (!res.ok) {
          throw new Error(apiMessage || `HTTP ${res.status}`);
        } else if (data?.ok === true && isStationDetailData(data.station)) {
          setCachedProxyStatus(true);
          setBoundedMapEntry(
            detailCache,
            cacheKey,
            { timestamp: now, data: data.station },
            MAX_DETAIL_CACHE_ENTRIES
          );
          return data.station;
        } else {
          throw new Error(apiMessage || 'Details konnten nicht geladen werden.');
        }
      }
    } catch (err: unknown) {
      if (isAbortError(err)) throw err;
      if (!shouldFallbackToDirect) {
        throw formatFetchError(err);
      }
    } finally {
      cleanup();
    }

    if (!shouldFallbackToDirect) return null;
  }

  const apiKey = getStoredApiKey();
  const directParams = new URLSearchParams({
    id: stationId,
    apikey: apiKey,
  });
  const directUrl = `https://creativecommons.tankerkoenig.de/json/detail.php?${directParams.toString()}`;
  const { signal: directSignal, cleanup } = createTimedSignal(signal, REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(directUrl, { signal: directSignal });
    if (!res.ok) {
      throw new Error(`Fehler beim Laden der Details: HTTP ${res.status}`);
    }
    const rawData = await readJsonUnknown(res);
    const data = isRecord(rawData) ? rawData : null;
    const apiMessage = typeof data?.message === 'string' ? data.message : undefined;

    if (!data || data.ok !== true) {
      throw new Error(apiMessage || 'Details konnten nicht geladen werden.');
    }
    if (isStationDetailData(data.station)) {
      setBoundedMapEntry(
        detailCache,
        cacheKey,
        { timestamp: now, data: data.station },
        MAX_DETAIL_CACHE_ENTRIES
      );
      return data.station;
    }
    return null;
  } catch (err: unknown) {
    throw formatFetchError(err);
  } finally {
    cleanup();
  }
}

/**
 * Sucht Tankstellen entlang einer Luftlinien-Route zwischen zwei Orten
 */
export async function fetchStationsAlongRoute(
  start: Coordinates,
  dest: Coordinates,
  corridorRadiusKm: number = 4,
  options: FetchStationsOptions = {}
): Promise<Station[]> {
  const { forceRefresh = false, signal, onWarning } = options;
  const totalDist = calculateDistanceKm(start.lat, start.lng, dest.lat, dest.lng);

  const waypoints: Coordinates[] = [];
  if (totalDist < 0.5) {
    waypoints.push({ lat: start.lat, lng: start.lng });
  } else {
    // Max. 8 Wegpunkte (schont Tankerkönig-Limits)
    const stepKm = Math.max(corridorRadiusKm * 1.75, 5);
    const numSteps = Math.min(Math.max(Math.ceil(totalDist / stepKm), 1), 7);
    for (let i = 0; i <= numSteps; i++) {
      const fraction = i / numSteps;
      waypoints.push({
        lat: start.lat + (dest.lat - start.lat) * fraction,
        lng: start.lng + (dest.lng - start.lng) * fraction,
      });
    }
  }

  const results: Station[] = [];
  const seenIds = new Set<string>();
  let successCount = 0;
  let failureCount = 0;
  let lastError: Error | null = null;

  // Schonende 2er-Batches gegen Rate-Limits
  const batchSize = 2;
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
        if (isAbortError(outcome.reason)) {
          throw outcome.reason;
        }
        failureCount++;
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

  if (onWarning) {
    if (failureCount > 0) {
      onWarning(
        `Hinweis: ${failureCount} von ${waypoints.length} Routen-Abschnitten konnten nicht geladen werden – Ergebnisse sind möglicherweise unvollständig.`
      );
    } else if (totalDist > 60) {
      onWarning(
        `Lange Strecke (~${Math.round(totalDist)} km Luftlinie): Es werden ${waypoints.length} Stichpunkte mit je ${corridorRadiusKm} km Radius abgefragt – dazwischen können Lücken bestehen.`
      );
    }
  }

  return results;
}

function parseGeocodeResultItem(value: unknown): GeocodeResult | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) &&
    typeof value.displayName === 'string' &&
    value.displayName
  ) {
    return { lat: value.lat, lng: value.lng, displayName: value.displayName };
  }
  return null;
}

function parseNominatimItem(value: unknown): GeocodeResult | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.lat !== 'string' ||
    typeof value.lon !== 'string' ||
    typeof value.display_name !== 'string'
  ) {
    return null;
  }
  const lat = Number.parseFloat(value.lat);
  const lng = Number.parseFloat(value.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, displayName: value.display_name };
}

export async function searchAddress(
  query: string,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = trimmed.toLowerCase();
  const now = Date.now();
  const cached = geocodeCache.get(cacheKey);
  if (cached && now - cached.timestamp < GEOCODE_CACHE_TTL_MS) {
    return cached.results;
  }

  // 1. Primär: Server-Proxy (/api/geocode) mit konformem User-Agent & Edge-Caching
  let shouldFallbackToDirect = false;
  const { signal: proxySignal, cleanup: cleanupProxy } = createTimedSignal(signal, 8000);
  try {
    const proxyRes = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
      signal: proxySignal,
    });
    if (proxyRes.status === 404) {
      shouldFallbackToDirect = true;
    } else {
      const rawData = await readJsonUnknown(proxyRes).catch(() => null);
      const data = isRecord(rawData) ? rawData : null;
      const apiMessage = typeof data?.message === 'string' ? data.message : undefined;

      if (!proxyRes.ok) {
        throw new Error(
          apiMessage || `Ortssuche fehlgeschlagen (HTTP ${proxyRes.status}). Bitte kurz warten.`
        );
      }

      if (data?.ok === true && Array.isArray(data.results)) {
        const results = data.results
          .map(parseGeocodeResultItem)
          .filter((item): item is GeocodeResult => item !== null);
        setBoundedMapEntry(
          geocodeCache,
          cacheKey,
          { timestamp: now, results },
          MAX_GEOCODE_CACHE_ENTRIES
        );
        return results;
      }

      throw new Error(apiMessage || 'Ortssuche fehlgeschlagen.');
    }
  } catch (err: unknown) {
    if (isAbortError(err)) throw err;
    if (!shouldFallbackToDirect) {
      throw formatFetchError(err, 'der Ortssuche');
    }
  } finally {
    cleanupProxy();
  }

  // 2. Lokaler Fallback (z.B. `vite dev` ohne Vercel Functions)
  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    countrycodes: 'de',
    limit: '5',
    addressdetails: '1',
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const { signal: directSignal, cleanup: cleanupDirect } = createTimedSignal(signal, 8000);

  try {
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'de',
      },
      signal: directSignal,
    });

    if (!res.ok) {
      throw new Error(`Ortssuche fehlgeschlagen (HTTP ${res.status}). Bitte kurz warten.`);
    }

    const rawItems = await readJsonUnknown(res);
    const results = Array.isArray(rawItems)
      ? rawItems
          .map(parseNominatimItem)
          .filter((item): item is GeocodeResult => item !== null)
      : [];

    setBoundedMapEntry(
      geocodeCache,
      cacheKey,
      { timestamp: now, results },
      MAX_GEOCODE_CACHE_ENTRIES
    );
    return results;
  } catch (err: unknown) {
    throw formatFetchError(err, 'der Ortssuche');
  } finally {
    cleanupDirect();
  }
}
