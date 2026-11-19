import { describe, it, expect } from 'vitest';
import { getBrandTheme, matchesBrandOrSearch } from '../brandStyles';

describe('getBrandTheme & matchesBrandOrSearch', () => {
  it('detects major German fuel brands including OMV, ORLEN, and bft', () => {
    expect(getBrandTheme('ARAL', 'Aral Tankstelle').displayName).toBe('Aral');
    expect(getBrandTheme('Shell', 'Shell Station').displayName).toBe('Shell');
    expect(getBrandTheme('JET', 'JET Tankstelle').displayName).toBe('JET');
    expect(getBrandTheme('TotalEnergies', 'TotalEnergies Berlin').displayName).toBe(
      'TotalEnergies'
    );
    expect(getBrandTheme('HEM', 'HEM Tankstelle').displayName).toBe('HEM');
    expect(getBrandTheme('OMV', 'OMV München').displayName).toBe('OMV');
    expect(getBrandTheme('ORLEN', 'ORLEN Tankstelle').displayName).toBe('ORLEN');
    expect(getBrandTheme('bft', 'bft Station').displayName).toBe('bft');
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

  it('prevents brand chip false positives in search while allowing city and postCode search', () => {
    const chemnitzStation = {
      name: 'Freie Tankstelle Chemnitz',
      brand: 'Freie',
      street: 'Wilhelmstraße',
      place: 'Chemnitz',
      postCode: '09111',
    };
    const starnbergStation = {
      name: 'Autohof Starnberg',
      brand: 'Freie',
      street: 'Hauptstraße',
      place: 'Starnberg',
      postCode: '82319',
    };
    const hemStation = {
      name: 'HEM Berlin',
      brand: 'HEM',
      street: 'Ringstraße',
      place: 'Berlin',
      postCode: '10115',
    };

    expect(matchesBrandOrSearch(chemnitzStation, 'HEM')).toBe(false);
    expect(matchesBrandOrSearch(hemStation, 'HEM')).toBe(true);
    expect(matchesBrandOrSearch(starnbergStation, 'star')).toBe(false);

    // Free-text city and postCode searches still work
    expect(matchesBrandOrSearch(chemnitzStation, 'Chemnitz')).toBe(true);
    expect(matchesBrandOrSearch(chemnitzStation, '09111')).toBe(true);
  });
});
