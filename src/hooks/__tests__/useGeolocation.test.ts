import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from '../useGeolocation';

describe('useGeolocation', () => {
  const originalGeolocation = navigator.geolocation;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    });
  });

  it('prevents a delayed GPS response from overwriting a manual city selection', () => {
    let savedSuccess: PositionCallback | null = null;

    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          savedSuccess = success;
        }),
      },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());

    // User manually picks Munich while GPS is still pending
    act(() => {
      result.current.setCoords({ lat: 48.1351, lng: 11.582, name: 'München' });
    });

    expect(result.current.coords.name).toBe('München');
    expect(result.current.isLoadingLocation).toBe(false);

    // Delayed GPS resolves with Hamburg -> MUST be ignored
    act(() => {
      savedSuccess?.({
        coords: {
          latitude: 53.5511,
          longitude: 9.9937,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });

    expect(result.current.coords.name).toBe('München');
    expect(result.current.coords.lat).toBe(48.1351);
  });

  it('restores last persisted coordinates immediately on reload', () => {
    localStorage.setItem(
      'tankapp_last_coords',
      JSON.stringify({ lat: 50.9375, lng: 6.9603, name: 'Köln' })
    );

    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn(),
      },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    expect(result.current.coords.name).toBe('Köln');
    expect(result.current.hasResolvedInitialLocation).toBe(true);
    expect(result.current.isLoadingLocation).toBe(false);
  });
});
