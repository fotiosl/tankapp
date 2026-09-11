import type { Coordinates, Station, TankerkoenigResponse } from '../types';

export const DEMO_API_KEY = '00000000-0000-0000-0000-000000000002';
const API_KEY_STORAGE = 'tankapp_api_key';

export function getStoredApiKey(): string {
  const customKey = localStorage.getItem(API_KEY_STORAGE)?.trim();
  if (customKey) return customKey;
  
  // Im Entwicklungsmodus lokal nutzen; im Production-Build niemals in den Client kompilieren
  if (import.meta.env.DEV) {
    const envKey = import.meta.env.VITE_TANKERKOENIG_API_KEY?.trim();
    if (envKey) return envKey;
  }

  return DEMO_API_KEY;
}

export function hasEnvApiKey(): boolean {
  return true; // Auf Vercel ist der Key serverseitig sicher hinterlegt
}

export function saveApiKey(key: string): void {
  const cleanKey = key.trim();
  if (!cleanKey) {
    localStorage.removeItem(API_KEY_STORAGE);
  } else {
    localStorage.setItem(API_KEY_STORAGE, cleanKey);
  }
}

export function isUsingDemoKey(key?: string): boolean {
  const current = key ?? getStoredApiKey();
  return current === DEMO_API_KEY;
}

export async function validateApiKey(key: string): Promise<{ valid: boolean; message?: string }> {
  try {
    const url = `https://creativecommons.tankerkoenig.de/json/list.php?lat=52.521&lng=13.438&rad=1.5&sort=dist&type=all&apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    if (!res.ok) {
      return { valid: false, message: `Server antwortete mit HTTP ${res.status}` };
    }
    const data: TankerkoenigResponse = await res.json();
    if (data.ok) {
      return { valid: true };
    }
    return { valid: false, message: data.message || 'API-Key ungültig' };
  } catch (err: unknown) {
    return { valid: false, message: err instanceof Error ? err.message : 'Netzwerkfehler' };
  }
}

interface StationCacheEntry {
  timestamp: number;
  lat: number;
  lng: number;
  rad: number;
  stations: Station[];
}

let stationCache: StationCacheEntry | null = null;

export async function fetchStations(
  coords: Coordinates,
  radKm: number = 5
): Promise<Station[]> {
  const clampedRadius = Math.min(Math.max(radKm, 1), 25);
  const now = Date.now();

  // 1. Client-seitiger Cache (verhindert Mehrfachabfragen bei schnellem Tab-/Filterwechsel)
  if (
    stationCache &&
    now - stationCache.timestamp < 20000 &&
    Math.abs(stationCache.lat - coords.lat) < 0.003 &&
    Math.abs(stationCache.lng - coords.lng) < 0.003 &&
    stationCache.rad === clampedRadius
  ) {
    return stationCache.stations;
  }

  // 2. Primär: Vercel Serverless Function (/api/stations) nutzen
  // Vorteil: Keine IP-Sperren, geschützter Key, Edge-Caching
  try {
    const proxyUrl = `/api/stations?lat=${coords.lat}&lng=${coords.lng}&rad=${clampedRadius}`;
    const proxyRes = await fetch(proxyUrl);
    if (proxyRes.ok) {
      const data: TankerkoenigResponse = await proxyRes.json();
      if (data.ok && Array.isArray(data.stations)) {
        stationCache = {
          timestamp: now,
          lat: coords.lat,
          lng: coords.lng,
          rad: clampedRadius,
          stations: data.stations,
        };
        return data.stations;
      }
    }
  } catch {
    // Falls Serverless Function lokal nicht erreichbar ist, Fallback auf Direktaufruf
  }

  // 3. Fallback: Direkter Aufruf der Tankerkönig API
  const apiKey = getStoredApiKey();
  const directUrl = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${coords.lat}&lng=${coords.lng}&rad=${clampedRadius}&sort=dist&type=all&apikey=${apiKey}`;

  try {
    const response = await fetch(directUrl);
    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('Rate-Limit erreicht: Bitte kurz warten und erneut versuchen (Fehler 503).');
      }
      throw new Error(`Fehler bei der Tankstellen-Abfrage: HTTP ${response.status}`);
    }

    const data: TankerkoenigResponse = await response.json();

    if (!data.ok) {
      throw new Error(data.message || 'Tankerkönig API meldete einen Fehler.');
    }

    const stations = data.stations || [];
    stationCache = {
      timestamp: now,
      lat: coords.lat,
      lng: coords.lng,
      rad: clampedRadius,
      stations,
    };

    return stations;
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new Error(
        'Verbindung zu Tankerkönig blockiert (Timeout). Die Tankerkönig-Firewall blockiert IP-Adressen bei zu vielen Anfragen vorübergehend für ca. 10 Minuten. Bitte kurz warten oder am Handy das WLAN ausschalten (Mobilfunk nutzen)!'
      );
    }
    throw err;
  }
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim())}&format=json&countrycodes=de&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'de',
      }
    });
    if (!res.ok) return [];
    const items = await res.json();
    return items.map((it: any) => ({
      lat: parseFloat(it.lat),
      lng: parseFloat(it.lon),
      displayName: it.display_name,
    }));
  } catch {
    return [];
  }
}
