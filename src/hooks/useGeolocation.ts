import { useState, useCallback, useEffect, useRef } from 'react';
import type { Coordinates } from '../types';

export const DEFAULT_COORDS: Coordinates = {
  lat: 52.5162,
  lng: 13.3777,
  name: 'Berlin Mitte (Standard)',
};

const hasGeolocationSupport =
  typeof window !== 'undefined' && 'geolocation' in navigator;

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
  const [coords, setCoords] = useState<Coordinates>(DEFAULT_COORDS);
  const [hasResolvedInitialLocation, setHasResolvedInitialLocation] = useState(
    !hasGeolocationSupport
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(hasGeolocationSupport);
  const [locationError, setLocationError] = useState<string | null>(
    hasGeolocationSupport
      ? null
      : 'Standortermittlung wird von diesem Browser nicht unterstützt.'
  );

  const activeRequestIdRef = useRef(0);

  const requestCurrentLocation = useCallback(() => {
    if (!hasGeolocationSupport) {
      setLocationError('Standortermittlung wird von diesem Browser nicht unterstützt.');
      setHasResolvedInitialLocation(true);
      setIsLoadingLocation(false);
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    setIsLoadingLocation(true);
    setLocationError(null);

    queryPosition(
      true,
      (nextCoords) => {
        setCoords(nextCoords);
        setLocationError(null);
        setIsLoadingLocation(false);
        setHasResolvedInitialLocation(true);
      },
      (msg) => {
        setLocationError(msg);
        setIsLoadingLocation(false);
        setHasResolvedInitialLocation(true);
      },
      () => activeRequestIdRef.current !== requestId
    );
  }, []);

  useEffect(() => {
    if (!hasGeolocationSupport) return;

    let cancelled = false;
    const requestId = ++activeRequestIdRef.current;
    queryPosition(
      true,
      (nextCoords) => {
        setCoords(nextCoords);
        setLocationError(null);
        setIsLoadingLocation(false);
        setHasResolvedInitialLocation(true);
      },
      (msg) => {
        setLocationError(msg);
        setIsLoadingLocation(false);
        setHasResolvedInitialLocation(true);
      },
      () => cancelled || activeRequestIdRef.current !== requestId
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    coords,
    setCoords,
    hasResolvedInitialLocation,
    isLoadingLocation,
    locationError,
    setLocationError,
    requestCurrentLocation,
  };
}
