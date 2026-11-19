import type { Station } from '../types';

export interface BrandTheme {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentHex: string;
  displayName: string;
}

interface BrandRule {
  chipKeys: readonly string[];
  pattern: RegExp;
  theme: BrandTheme;
}

export const BRAND_CHIPS = [
  'Aral',
  'Shell',
  'JET',
  'Total',
  'Esso',
  'HEM',
  'AVIA',
  'star',
] as const;

const BRAND_RULES: BrandRule[] = [
  {
    chipKeys: ['aral'],
    pattern: /\baral\b/iu,
    theme: {
      badgeBg: 'bg-blue-500/15 dark:bg-blue-600/25',
      badgeBorder: 'border-blue-500/40 dark:border-blue-500/50',
      badgeText: 'text-blue-700 dark:text-blue-300',
      accentHex: '#2563eb',
      displayName: 'Aral',
    },
  },
  {
    chipKeys: ['shell'],
    pattern: /\bshell\b/iu,
    theme: {
      badgeBg: 'bg-amber-500/15 dark:bg-amber-500/25',
      badgeBorder: 'border-amber-500/40 dark:border-amber-400/50',
      badgeText: 'text-amber-700 dark:text-amber-300',
      accentHex: '#f59e0b',
      displayName: 'Shell',
    },
  },
  {
    chipKeys: ['jet'],
    pattern: /\bjet\b/iu,
    theme: {
      badgeBg: 'bg-yellow-400/20 dark:bg-yellow-400/25',
      badgeBorder: 'border-yellow-500/50 dark:border-yellow-400/50',
      badgeText: 'text-yellow-800 dark:text-yellow-300',
      accentHex: '#eab308',
      displayName: 'JET',
    },
  },
  {
    chipKeys: ['total', 'totalenergies'],
    pattern: /\btotal(?:energies)?\b/iu,
    theme: {
      badgeBg: 'bg-red-500/15 dark:bg-red-600/25',
      badgeBorder: 'border-red-500/40 dark:border-red-500/50',
      badgeText: 'text-red-700 dark:text-red-300',
      accentHex: '#dc2626',
      displayName: 'TotalEnergies',
    },
  },
  {
    chipKeys: ['hem'],
    pattern: /\bhem\b/iu,
    theme: {
      badgeBg: 'bg-emerald-500/15 dark:bg-emerald-600/25',
      badgeBorder: 'border-emerald-500/40 dark:border-emerald-500/50',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      accentHex: '#10b981',
      displayName: 'HEM',
    },
  },
  {
    chipKeys: ['esso'],
    pattern: /\besso\b/iu,
    theme: {
      badgeBg: 'bg-rose-500/15 dark:bg-rose-600/25',
      badgeBorder: 'border-rose-500/40 dark:border-rose-500/50',
      badgeText: 'text-rose-700 dark:text-rose-300',
      accentHex: '#e11d48',
      displayName: 'Esso',
    },
  },
  {
    chipKeys: ['avia'],
    pattern: /\bavia\b/iu,
    theme: {
      badgeBg: 'bg-red-500/15 dark:bg-red-500/25',
      badgeBorder: 'border-red-500/40 dark:border-red-400/50',
      badgeText: 'text-red-700 dark:text-red-300',
      accentHex: '#ef4444',
      displayName: 'AVIA',
    },
  },
  {
    chipKeys: ['star'],
    pattern: /\bstar\b/iu,
    theme: {
      badgeBg: 'bg-red-500/15 dark:bg-red-500/25',
      badgeBorder: 'border-red-500/40 dark:border-red-400/50',
      badgeText: 'text-red-700 dark:text-red-300',
      accentHex: '#dc2626',
      displayName: 'star',
    },
  },
  {
    chipKeys: ['agip', 'eni'],
    pattern: /\b(?:agip|eni)\b/iu,
    theme: {
      badgeBg: 'bg-yellow-500/15 dark:bg-yellow-500/25',
      badgeBorder: 'border-yellow-500/45 dark:border-yellow-400/50',
      badgeText: 'text-yellow-800 dark:text-yellow-300',
      accentHex: '#ca8a04',
      displayName: 'Eni / Agip',
    },
  },
  {
    chipKeys: ['omv'],
    pattern: /\bomv\b/iu,
    theme: {
      badgeBg: 'bg-sky-500/15 dark:bg-sky-600/25',
      badgeBorder: 'border-sky-500/40 dark:border-sky-500/50',
      badgeText: 'text-sky-700 dark:text-sky-300',
      accentHex: '#0284c7',
      displayName: 'OMV',
    },
  },
  {
    chipKeys: ['orlen'],
    pattern: /\borlen\b/iu,
    theme: {
      badgeBg: 'bg-red-500/15 dark:bg-red-600/25',
      badgeBorder: 'border-red-500/40 dark:border-red-500/50',
      badgeText: 'text-red-700 dark:text-red-300',
      accentHex: '#dc2626',
      displayName: 'ORLEN',
    },
  },
  {
    chipKeys: ['bft'],
    pattern: /\bbft\b/iu,
    theme: {
      badgeBg: 'bg-indigo-500/15 dark:bg-indigo-600/25',
      badgeBorder: 'border-indigo-500/40 dark:border-indigo-500/50',
      badgeText: 'text-indigo-700 dark:text-indigo-300',
      accentHex: '#4f46e5',
      displayName: 'bft',
    },
  },
  {
    chipKeys: ['q1'],
    pattern: /\bq1\b/iu,
    theme: {
      badgeBg: 'bg-orange-500/15 dark:bg-orange-600/25',
      badgeBorder: 'border-orange-500/40 dark:border-orange-500/50',
      badgeText: 'text-orange-700 dark:text-orange-300',
      accentHex: '#ea580c',
      displayName: 'Q1',
    },
  },
  {
    chipKeys: ['westfalen'],
    pattern: /\bwestfalen\b/iu,
    theme: {
      badgeBg: 'bg-sky-500/15 dark:bg-sky-600/25',
      badgeBorder: 'border-sky-500/40 dark:border-sky-500/50',
      badgeText: 'text-sky-700 dark:text-sky-300',
      accentHex: '#0369a1',
      displayName: 'Westfalen',
    },
  },
  {
    chipKeys: ['oil', 'oil!'],
    pattern: /\boil!?(?:\b|$)/iu,
    theme: {
      badgeBg: 'bg-amber-500/15 dark:bg-amber-600/25',
      badgeBorder: 'border-amber-500/40 dark:border-amber-500/50',
      badgeText: 'text-amber-700 dark:text-amber-300',
      accentHex: '#d97706',
      displayName: 'OIL!',
    },
  },
];

export function getBrandTheme(brandName?: string, stationName?: string): BrandTheme {
  const brand = (brandName || '').trim();
  const name = (stationName || '').trim();

  if (brand) {
    const brandMatch = BRAND_RULES.find((rule) => rule.pattern.test(brand));
    if (brandMatch) return brandMatch.theme;
  }

  if (name) {
    const nameMatch = BRAND_RULES.find((rule) => rule.pattern.test(name));
    if (nameMatch) return nameMatch.theme;
  }

  return {
    badgeBg: 'bg-slate-200/80 dark:bg-slate-800/60',
    badgeBorder: 'border-slate-300 dark:border-slate-700/60',
    badgeText: 'text-slate-700 dark:text-slate-300',
    accentHex: '#64748b',
    displayName: brand || 'Freie Tankstelle',
  };
}

/**
 * Filtert Tankstellen nach Marken-Chip (mit Wortgrenzen gegen False Positives wie "Chemnitz"/"Wilhelmstraße")
 * oder nach Freitext über Name, Marke, Straße, Ort und PLZ.
 */
export function matchesBrandOrSearch(
  station: Pick<Station, 'name' | 'brand' | 'street' | 'place' | 'postCode'>,
  rawTerm: string
): boolean {
  const term = rawTerm.trim().toLowerCase();
  if (!term) return true;

  const exactBrandRule = BRAND_RULES.find((rule) => rule.chipKeys.includes(term));
  if (exactBrandRule) {
    return (
      exactBrandRule.pattern.test(station.brand || '') ||
      exactBrandRule.pattern.test(station.name || '')
    );
  }

  return (
    (station.name?.toLowerCase().includes(term) ?? false) ||
    (station.brand?.toLowerCase().includes(term) ?? false) ||
    (station.street?.toLowerCase().includes(term) ?? false) ||
    (station.place?.toLowerCase().includes(term) ?? false) ||
    (station.postCode !== undefined && String(station.postCode).toLowerCase().includes(term))
  );
}
