import { describe, it, expect } from 'vitest';
import { getBrandTheme } from '../brandStyles';

describe('getBrandTheme', () => {
  it('detects major German fuel brands', () => {
    expect(getBrandTheme('ARAL', 'Aral Tankstelle').displayName).toBe('Aral');
    expect(getBrandTheme('Shell', 'Shell Station').displayName).toBe('Shell');
    expect(getBrandTheme('JET', 'JET Tankstelle').displayName).toBe('JET');
    expect(getBrandTheme('TotalEnergies', 'TotalEnergies Berlin').displayName).toBe(
      'TotalEnergies'
    );
    expect(getBrandTheme('HEM', 'HEM Tankstelle').displayName).toBe('HEM');
  });

  it('avoids false positives on city or street substrings like Chemnitz or Wilhelmstraße', () => {
    expect(getBrandTheme('', 'Freie Tankstelle Chemnitz').displayName).toBe(
      'Freie Tankstelle'
    );
    expect(getBrandTheme('bft', 'bft Tankstelle Wilhelmstraße').displayName).toBe('bft');
    expect(getBrandTheme('Freie', 'Autohof Neustarstadt').displayName).toBe('Freie');
  });

  it('detects brand from station name when word boundaries match', () => {
    expect(getBrandTheme('', 'star Tankstelle Berlin').displayName).toBe('star');
    expect(getBrandTheme('', 'HEM Express München').displayName).toBe('HEM');
  });
});
