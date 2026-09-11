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

export function getBrandBadge(brandName: string): { bg: string; text: string; label: string } {
  const clean = (brandName || '').toUpperCase().trim();
  
  if (clean.includes('ARAL')) {
    return { bg: 'bg-blue-600', text: 'text-white', label: 'ARAL' };
  }
  if (clean.includes('SHELL')) {
    return { bg: 'bg-yellow-500', text: 'text-red-950 font-bold', label: 'SHELL' };
  }
  if (clean.includes('ESSO')) {
    return { bg: 'bg-red-600', text: 'text-white', label: 'ESSO' };
  }
  if (clean.includes('TOTAL')) {
    return { bg: 'bg-rose-700', text: 'text-white', label: 'TOTAL' };
  }
  if (clean.includes('JET')) {
    return { bg: 'bg-amber-400', text: 'text-slate-950 font-bold', label: 'JET' };
  }
  if (clean.includes('HEM')) {
    return { bg: 'bg-emerald-600', text: 'text-white', label: 'HEM' };
  }
  if (clean.includes('AVIA')) {
    return { bg: 'bg-red-700', text: 'text-white', label: 'AVIA' };
  }
  if (clean.includes('STAR')) {
    return { bg: 'bg-red-600', text: 'text-white', label: 'STAR' };
  }
  if (clean.includes('AGIP') || clean.includes('ENI')) {
    return { bg: 'bg-yellow-400', text: 'text-black', label: 'ENI' };
  }
  if (clean.includes('OMV')) {
    return { bg: 'bg-blue-700', text: 'text-emerald-300', label: 'OMV' };
  }

  return { bg: 'bg-slate-700', text: 'text-slate-200', label: brandName || 'Tankstelle' };
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
