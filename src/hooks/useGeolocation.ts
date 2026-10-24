import { useState, useCallback, useEffect } from 'react';
import type { Coordinates } from '../types';

export const DEFAULT_COORDS: Coordinates = {
  lat: 52.5162,
  lng: 13.3777,
  name: 'Berlin Mitte (Standard)',
};

export function useGeolocation() {
  const [coords, setCoords] = useState<Coordinates>(DEFAULT_COORDS);
  const [hasResolvedInitialLocation, setHasResolvedInitialLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestCurrentLocation = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationError('Standortermittlung wird von diesem Browser nicht unterstützt.');
      setHasResolvedInitialLocation(true);
      setIsLoadingLocation(false);
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    const tryGetPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: 'Aktueller GPS-Standort',
          });
          setLocationError(null);
          setIsLoadingLocation(false);
          setHasResolvedInitialLocation(true);
        },
        (err) => {
          if (highAccuracy && (err.code === 2 || err.code === 3)) {
            tryGetPosition(false);
            return;
          }

          let msg = 'Standort konnte nicht ermittelt werden.';
          if (err.code === 1) {
            msg = 'Standort-Berechtigung verweigert. Bitte im Browser erlauben oder Ort manuell eingeben.';
          } else if (err.code === 2) {
            msg = 'Position derzeit nicht ermittelbar. Bitte Ortssuche oben nutzen.';
          } else if (err.code === 3) {
            msg = 'Standortabfrage dauerte zu lange. Bitte erneut versuchen.';
          }
          setLocationError(msg);
          setIsLoadingLocation(false);
          setHasResolvedInitialLocation(true);
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 5000 : 7000,
          maximumAge: 60000,
        }
      );
    };

    tryGetPosition(true);
  }, []);

  useEffect(() => {
    requestCurrentLocation();
  }, [requestCurrentLocation]);

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
