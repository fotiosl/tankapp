import { useState, useEffect, useCallback, useRef } from 'react';
import type { Coordinates, Station } from '../types';
import { fetchStations, fetchStationsAlongRoute } from '../services/api';
import { isRecord, isStationLike, parseJsonSafe } from '../utils/typeGuards';

const OFFLINE_CACHE_KEY = 'tankapp_offline_stations';

interface OfflineSnapshot {
  timestamp: number;
  stations: Station[];
}

function loadOfflineSnapshot(): OfflineSnapshot | null {
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return null;
    const parsed = parseJsonSafe(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.timestamp === 'number' && Array.isArray(parsed.stations)) {
      const validStations = parsed.stations.filter(isStationLike);
      if (validStations.length > 0) {
        return {
          timestamp: parsed.timestamp,
          stations: validStations,
        };
      }
    }
  } catch {
    // Ignore corrupted cache
  }
  return null;
}

function saveOfflineSnapshot(stations: Station[]): void {
  try {
    const payload: OfflineSnapshot = {
      timestamp: Date.now(),
      stations: stations.slice(0, 80),
    };
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

interface UseStationsParams {
  coords: Coordinates;
  radiusKm: number;
  isRouteMode: boolean;
  routeDest: Coordinates | null;
  hasResolvedInitialLocation: boolean;
}

export function useStations({
  coords,
  radiusKm,
  isRouteMode,
  routeDest,
  hasResolvedInitialLocation,
}: UseStationsParams) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [routeWarning, setRouteWarning] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isShowingCachedOffline, setIsShowingCachedOffline] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(
    () => typeof navigator !== 'undefined' && !navigator.onLine
  );

  const fetchControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      fetchControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const executeFetch = useCallback(
    async (forceRefresh: boolean): Promise<void> => {
      if (!hasResolvedInitialLocation) return;

      if (isRouteMode && !routeDest) {
        fetchControllerRef.current?.abort();
        setStations([]);
        setFetchError(null);
        setRouteWarning(null);
        setIsLoadingStations(false);
        setIsShowingCachedOffline(false);
        return;
      }

      fetchControllerRef.current?.abort();
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      setIsLoadingStations(true);
      setFetchError(null);
      setRouteWarning(null);
      setIsShowingCachedOffline(false);

      try {
        let warningMsg: string | null = null;
        const data =
          isRouteMode && routeDest
            ? await fetchStationsAlongRoute(coords, routeDest, 4, {
                forceRefresh,
                signal: controller.signal,
                onWarning: (msg) => {
                  warningMsg = msg;
                },
              })
            : await fetchStations(coords, radiusKm, {
                forceRefresh,
                signal: controller.signal,
              });

        if (controller.signal.aborted || !isMountedRef.current) return;
        setStations(data);
        setRouteWarning(warningMsg);
        setLastUpdated(new Date());
        setIsShowingCachedOffline(false);

        if (!isRouteMode && data.length > 0) {
          saveOfflineSnapshot(data);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          return;
        }
        if (!isMountedRef.current) return;

        const message =
          err instanceof Error ? err.message : 'Unerwarteter Fehler beim Laden';
        setFetchError(message);

        // Offline-Fallback: zuletzt gespeicherte Tankstellen anzeigen, falls vorhanden
        if (!isRouteMode && typeof navigator !== 'undefined' && !navigator.onLine) {
          const snapshot = loadOfflineSnapshot();
          if (snapshot && snapshot.stations.length > 0) {
            setStations(snapshot.stations);
            setLastUpdated(new Date(snapshot.timestamp));
            setIsShowingCachedOffline(true);
          }
        }
      } finally {
        if (!controller.signal.aborted && isMountedRef.current) {
          setIsLoadingStations(false);
        }
      }
    },
    [hasResolvedInitialLocation, coords, radiusKm, isRouteMode, routeDest]
  );

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        void executeFetch(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      fetchControllerRef.current?.abort();
    };
  }, [executeFetch]);

  const refresh = useCallback((): Promise<void> => {
    return executeFetch(true);
  }, [executeFetch]);

  return {
    stations,
    isLoadingStations,
    fetchError,
    routeWarning,
    lastUpdated,
    isOffline,
    isShowingCachedOffline,
    refresh,
  };
}
