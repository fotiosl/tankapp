export interface BrandTheme {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentColor: string;
  displayName: string;
}

export function getBrandTheme(brandName?: string, stationName?: string): BrandTheme {
  const query = `${brandName || ''} ${stationName || ''}`.toLowerCase();

  if (query.includes('aral')) {
    return {
      badgeBg: 'bg-blue-600/25',
      badgeBorder: 'border-blue-500/50',
      badgeText: 'text-blue-300',
      accentColor: '#2563eb',
      displayName: 'Aral',
    };
  }

  if (query.includes('shell')) {
    return {
      badgeBg: 'bg-amber-500/25',
      badgeBorder: 'border-amber-400/50',
      badgeText: 'text-amber-300',
      accentColor: '#f59e0b',
      displayName: 'Shell',
    };
  }

  if (query.includes('jet')) {
    return {
      badgeBg: 'bg-yellow-400/25',
      badgeBorder: 'border-yellow-400/50',
      badgeText: 'text-yellow-300',
      accentColor: '#eab308',
      displayName: 'JET',
    };
  }

  if (query.includes('total')) {
    return {
      badgeBg: 'bg-red-600/25',
      badgeBorder: 'border-red-500/50',
      badgeText: 'text-red-300',
      accentColor: '#dc2626',
      displayName: 'TotalEnergies',
    };
  }

  if (query.includes('hem')) {
    return {
      badgeBg: 'bg-emerald-600/25',
      badgeBorder: 'border-emerald-500/50',
      badgeText: 'text-emerald-300',
      accentColor: '#059669',
      displayName: 'HEM',
    };
  }

  if (query.includes('esso')) {
    return {
      badgeBg: 'bg-rose-600/25',
      badgeBorder: 'border-rose-500/50',
      badgeText: 'text-rose-300',
      accentColor: '#e11d48',
      displayName: 'Esso',
    };
  }

  if (query.includes('avia')) {
    return {
      badgeBg: 'bg-red-500/25',
      badgeBorder: 'border-red-400/50',
      badgeText: 'text-red-300',
      accentColor: '#ef4444',
      displayName: 'AVIA',
    };
  }

  if (query.includes('star')) {
    return {
      badgeBg: 'bg-red-500/25',
      badgeBorder: 'border-red-400/50',
      badgeText: 'text-red-300',
      accentColor: '#ef4444',
      displayName: 'star',
    };
  }

  if (query.includes('agip') || query.includes('eni')) {
    return {
      badgeBg: 'bg-yellow-500/25',
      badgeBorder: 'border-yellow-400/50',
      badgeText: 'text-yellow-300',
      accentColor: '#eab308',
      displayName: 'Eni / Agip',
    };
  }

  return {
    badgeBg: 'bg-slate-800/60',
    badgeBorder: 'border-slate-700/60',
    badgeText: 'text-slate-300',
    accentColor: '#64748b',
    displayName: brandName || 'Tankstelle',
  };
}
