import type { Station, FuelType } from '../types';

export function formatPriceParts(
  price: number | null | false | undefined
): { main: string; tenth: string } | null {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return null;
  }
  // Preise werden oft als 1.699 übermittelt
  const priceStr = price.toFixed(3);
  const parts = priceStr.split('.');
  const integerPart = parts[0] ?? '0';
  const decimalPart = parts[1] ?? '000';

  const mainPart = `${integerPart},${decimalPart.slice(0, 2)}`;
  const tenthPart = decimalPart.slice(2, 3) || '0';

  return { main: mainPart, tenth: tenthPart };
}

export function formatPrice(
  price: number | null | false | undefined,
  decimals: 2 | 3 = 3
): string {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return 'k.A.';
  }
  return `${price.toFixed(decimals).replace('.', ',')} €`;
}

export function formatCentDiff(diffEuro: number): string | null {
  if (!Number.isFinite(diffEuro) || diffEuro <= 0.0005) {
    return null;
  }
  const cents = diffEuro * 100;
  const roundedTenths = Math.round(cents * 10) / 10;
  if (roundedTenths <= 0) return null;

  const formatted = Number.isInteger(roundedTenths)
    ? String(roundedTenths)
    : roundedTenths.toFixed(1).replace('.', ',');
  return `+${formatted} ct`;
}

export function getFuelPrice(station: Station, fuel: FuelType): number | null {
  const p = station[fuel];
  if (typeof p === 'number' && Number.isFinite(p) && p > 0) {
    return p;
  }
  return null;
}

export function formatAddress(street?: string, houseNumber?: string, place?: string): string {
  const streetPart = [street?.trim(), houseNumber?.trim()].filter(Boolean).join(' ');
  return [streetPart, place?.trim()].filter(Boolean).join(', ');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function openNavigation(lat: number, lng: number, name: string): void {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    // Apple Maps URL Schema
    window.location.href = `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`;
  } else {
    // Google Maps Navigation URL
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      '_blank',
      'noopener,noreferrer'
    );
  }
}
