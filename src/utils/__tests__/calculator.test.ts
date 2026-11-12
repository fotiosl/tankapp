import { describe, it, expect } from 'vitest';
import { calculateNetSavings } from '../calculator';

describe('calculateNetSavings', () => {
  it('computes net savings minus round-trip detour cost', () => {
    const result = calculateNetSavings(1.60, 1.75, 5, 1, {
      tankVolumeLiters: 50,
      consumptionPer100Km: 7.0,
    });

    // Gross: (1.75 - 1.60) * 50 = 7.50 €
    // Detour: (5 - 1) * 2 = 8 km -> 8 * 7 / 100 = 0.56 L -> 0.56 * 1.60 = 0.896 €
    // Net: 7.50 - 0.896 = 6.604 €
    expect(result.grossSavings).toBeCloseTo(7.5, 4);
    expect(result.detourCost).toBeCloseTo(0.896, 4);
    expect(result.netSavings).toBeCloseTo(6.604, 4);
    expect(result.isWorthwhile).toBe(true);
  });

  it('marks negligible savings (<= 0.30 €) as not worthwhile', () => {
    const result = calculateNetSavings(1.695, 1.70, 5, 1, {
      tankVolumeLiters: 50,
      consumptionPer100Km: 7.0,
    });
    expect(result.netSavings).toBe(0);
    expect(result.isWorthwhile).toBe(false);
  });

  it('handles invalid prices safely', () => {
    const result = calculateNetSavings(0, 1.7, 3, 1);
    expect(result).toEqual({
      grossSavings: 0,
      detourCost: 0,
      netSavings: 0,
      isWorthwhile: false,
    });
  });
});
