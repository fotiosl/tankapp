import type { Station, FuelType } from '../types';

export function formatPriceParts(price: number | null | false | undefined): { main: string; tenth: string } | null {
  if (typeof price !== 'number' || price <= 0) {
    return null;
  }
  // Preise werden oft als 1.699 übermittelt
  const priceStr = price.toFixed(3);
  const parts = priceStr.split('.');
  if (parts.length < 2) return { main: priceStr, tenth: '0' };

  const integerPart = parts[0];
  const decimalPart = parts[1]; // e.g. "699"
  
  const mainPart = `${integerPart},${decimalPart.slice(0, 2)}`;
  const tenthPart = decimalPart.slice(2, 3) || '0';

  return { main: mainPart, tenth: tenthPart };
}

export function getFuelPrice(station: Station, fuel: FuelType): number | null {
  const p = station[fuel];
  if (typeof p === 'number' && p > 0) {
    return p;
  }
  return null;
}

export function openNavigation(lat: number, lng: number, name: string): void {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (isIOS) {
    // Apple Maps URL Schema
    window.location.href = `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`;
  } else {
    // Google Maps Navigation URL
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  }
}
