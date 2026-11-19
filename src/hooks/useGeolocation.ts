import { useState, useCallback, useEffect, useRef } from 'react';
import type { Coordinates } from '../types';
import { isRecord, parseJsonSafe } from '../utils/typeGuards';

export const DEFAULT_COORDS: Coordinates = {
  lat: 52.5162,
  lng: 13.3777,
  name: 'Berlin Mitte (Standard)',
};

const LAST_COORDS_STORAGE_KEY = 'tankapp_last_coords';

function isGeolocationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'geolocation' in navigator &&
    typeof navigator.geolocation?.getCurrentPosition === 'function'
  );
}

function loadSavedCoords(): Coordinates | null {
  try {
    const raw = localStorage.getItem(LAST_COORDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseJsonSafe(raw);
    if (!isRecord(parsed)) return null;
    if (
      typeof parsed.lat === 'number' &&
      typeof parsed.lng === 'number' &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lng) &&
      parsed.lat >= -90 &&
      parsed.lat <= 90 &&
      parsed.lng >= -180 &&
      parsed.lng <= 180
    ) {
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        name:
          typeof parsed.name === 'string' && parsed.name.trim()
            ? parsed.name.trim()
            : undefined,
      };
    }
  } catch {
    // Ignore storage / parse errors
  }
  return null;
}

function persistCoords(coords: Coordinates): void {
  try {
    localStorage.setItem(LAST_COORDS_STORAGE_KEY, JSON.stringify(coords));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

function mapGeolocationError(code: number): string {
  if (code === 1) {
    return 'Standort-Berechtigung verweigert. Bitte im Browser erlauben oder Ort manuell eingeben.';
  }
  if (code === 2) {
    return 'Position derzeit nicht ermittelbar. Bitte Ortssuche oben nutzen.';
  }
  if (code === 3) {
    return 'Standortabfrage dauerte zu lange. Bitte erneut versuchen.';
  }
  return 'Standort konnte nicht ermittelt werden.';
}

function queryPosition(
  highAccuracy: boolean,
  onSuccess: (coords: Coordinates) => void,
  onError: (msg: string) => void,
  isCancelled: () => boolean
): void {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (isCancelled()) return;
      onSuccess({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        name: 'Aktueller GPS-Standort',
      });
    },
    (err) => {
      if (isCancelled()) return;
      if (highAccuracy && (err.code === 2 || err.code === 3)) {
        queryPosition(false, onSuccess, onError, isCancelled);
        return;
      }
      onError(mapGeolocationError(err.code));
    },
    {
      enableHighAccuracy: highAccuracy,
      timeout: highAccuracy ? 5000 : 7000,
      maximumAge: 60000,
    }
  );
}

export function useGeolocation() {
  const [initialSaved] = useState<Coordinates | null>(loadSavedCoords);
  const [supportedOnInit] = useState<boolean>(isGeolocationSupported);

  const [coords, setCoordsState] = useState<Coordinates>(() => initialSaved ?? DEFAULT_COORDS);
  const [hasResolvedInitialLocation, setHasResolvedInitialLocation] = useState(
    () => Boolean(initialSaved) || !supportedOnInit
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(
    () => supportedOnInit && !initialSaved
  );
  const [locationError, setLocationError] = useState<string | null>(() =>
    supportedOnInit ? null : 'Standortermittlung wird von diesem Browser nicht unterstützt.'
  );

  const activeRequestIdRef = useRef(0);
  const hadSavedOnMountRef = useRef(Boolean(initialSaved));

  // Manuelle Auswahl bricht ausstehende GPS-Abfragen ab, damit verspätete GPS-Antworten sie nicht überschreiben
  const selectCoords = useCallback((nextCoords: Coordinates) => {
    activeRequestIdRef.current += 1;
    setCoordsState(nextCoords);
    persistCoords(nextCoords);
    setLocationError(null);
    setIsLoadingLocation(false);
    setHasResolvedInitialLocation(true);
  }, []);

  const startLocationQuery = useCallback((showLoading: boolean, showErrors: boolean) => {
    if (!isGeolocationSupported()) {
      if (showErrors) {
        setLocationError('Standortermittlung wird von diesem Browser nicht unterstützt.');
      }
      setHasResolvedInitialLocation(true);
      setIsLoadingLocation(false);
      return () => {};
    }

    let cancelled = false;
    const requestId = ++activeRequestIdRef.current;
    if (showLoading) {
      setIsLoadingLocation(true);
    }
    if (showErrors) {
      setLocationError(null);
    }

    queryPosition(
      true,
      (nextCoords) => {
        setCoordsState(nextCoords);
        persistCoords(nextCoords);
        setLocationError(null);
        setIsLoadingLocation(false);
        setHasResolvedInitialLocation(true);
      },
      (msg) => {
        if (showErrors) {
          setLocationError(msg);
        }
        setIsLoadingLocation(false);
        setHasResolvedInitialLocation(true);
      },
      () => cancelled || activeRequestIdRef.current !== requestId
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const requestCurrentLocation = useCallback(() => {
    startLocationQuery(true, true);
  }, [startLocationQuery]);

  useEffect(() => {
    // Beim Erststart GPS abfragen; bei gespeichertem Standort still im Hintergrund aktualisieren
    const hadSavedCoords = hadSavedOnMountRef.current;
    return startLocationQuery(!hadSavedCoords, !hadSavedCoords);
  }, [startLocationQuery]);

  return {
    coords,
    setCoords: selectCoords,
    hasResolvedInitialLocation,
    isLoadingLocation,
    locationError,
    setLocationError,
    requestCurrentLocation,
  };
}
