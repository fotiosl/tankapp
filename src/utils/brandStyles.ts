export interface BrandTheme {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  displayName: string;
}

interface BrandRule {
  brandPattern: RegExp;
  namePattern: RegExp;
  theme: BrandTheme;
}

const BRAND_RULES: BrandRule[] = [
  {
    brandPattern: /\baral\b/i,
    namePattern: /\baral\b/i,
    theme: {
      badgeBg: 'bg-blue-500/15 dark:bg-blue-600/25',
      badgeBorder: 'border-blue-500/40 dark:border-blue-500/50',
      badgeText: 'text-blue-700 dark:text-blue-300',
      displayName: 'Aral',
    },
  },
  {
    brandPattern: /\bshell\b/i,
    namePattern: /\bshell\b/i,
    theme: {
      badgeBg: 'bg-amber-500/15 dark:bg-amber-500/25',
      badgeBorder: 'border-amber-500/40 dark:border-amber-400/50',
      badgeText: 'text-amber-700 dark:text-amber-300',
      displayName: 'Shell',
    },
  },
  {
    brandPattern: /\bjet\b/i,
    namePattern: /\bjet\b/i,
    theme: {
      badgeBg: 'bg-yellow-400/20 dark:bg-yellow-400/25',
      badgeBorder: 'border-yellow-500/50 dark:border-yellow-400/50',
      badgeText: 'text-yellow-800 dark:text-yellow-300',
      displayName: 'JET',
    },
  },
  {
    brandPattern: /\btotal(?:energies)?\b/i,
    namePattern: /\btotal(?:energies)?\b/i,
    theme: {
      badgeBg: 'bg-red-500/15 dark:bg-red-600/25',
      badgeBorder: 'border-red-500/40 dark:border-red-500/50',
      badgeText: 'text-red-700 dark:text-red-300',
      displayName: 'TotalEnergies',
    },
  },
  {
    brandPattern: /\bhem\b/i,
    namePattern: /\bhem\b/i,
    theme: {
      badgeBg: 'bg-emerald-500/15 dark:bg-emerald-600/25',
      badgeBorder: 'border-emerald-500/40 dark:border-emerald-500/50',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      displayName: 'HEM',
    },
  },
  {
    brandPattern: /\besso\b/i,
    namePattern: /\besso\b/i,
    theme: {
      badgeBg: 'bg-rose-500/15 dark:bg-rose-600/25',
      badgeBorder: 'border-rose-500/40 dark:border-rose-500/50',
      badgeText: 'text-rose-700 dark:text-rose-300',
      displayName: 'Esso',
    },
  },
  {
    brandPattern: /\bavia\b/i,
    namePattern: /\bavia\b/i,
    theme: {
      badgeBg: 'bg-red-500/15 dark:bg-red-500/25',
      badgeBorder: 'border-red-500/40 dark:border-red-400/50',
      badgeText: 'text-red-700 dark:text-red-300',
      displayName: 'AVIA',
    },
  },
  {
    brandPattern: /\bstar\b/i,
    namePattern: /\bstar\b/i,
    theme: {
      badgeBg: 'bg-red-500/15 dark:bg-red-500/25',
      badgeBorder: 'border-red-500/40 dark:border-red-400/50',
      badgeText: 'text-red-700 dark:text-red-300',
      displayName: 'star',
    },
  },
  {
    brandPattern: /\b(?:agip|eni)\b/i,
    namePattern: /\b(?:agip|eni)\b/i,
    theme: {
      badgeBg: 'bg-yellow-500/15 dark:bg-yellow-500/25',
      badgeBorder: 'border-yellow-500/45 dark:border-yellow-400/50',
      badgeText: 'text-yellow-800 dark:text-yellow-300',
      displayName: 'Eni / Agip',
    },
  },
];

export function getBrandTheme(brandName?: string, stationName?: string): BrandTheme {
  const brand = (brandName || '').trim();
  const name = (stationName || '').trim();

  if (brand) {
    const brandMatch = BRAND_RULES.find((rule) => rule.brandPattern.test(brand));
    if (brandMatch) return brandMatch.theme;
  }

  if (name) {
    const nameMatch = BRAND_RULES.find((rule) => rule.namePattern.test(name));
    if (nameMatch) return nameMatch.theme;
  }

  return {
    badgeBg: 'bg-slate-200/80 dark:bg-slate-800/60',
    badgeBorder: 'border-slate-300 dark:border-slate-700/60',
    badgeText: 'text-slate-700 dark:text-slate-300',
    displayName: brand || 'Freie Tankstelle',
  };
}
