import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  formatAddress,
  formatCentDiff,
  formatPrice,
  formatPriceParts,
  getFuelPrice,
} from '../formatters';
import type { Station } from '../../types';

const baseStation: Station = {
  id: '123',
  name: 'Test Station',
  brand: 'Aral',
  street: 'Hauptstraße',
  place: 'Berlin',
  lat: 52.5,
  lng: 13.4,
  dist: 1.2,
  diesel: 1.659,
  e5: false,
  e10: null,
  isOpen: true,
};

describe('formatters', () => {
  it('formats price parts with German comma and tenth-cent superscript', () => {
    expect(formatPriceParts(1.699)).toEqual({ main: '1,69', tenth: '9' });
    expect(formatPriceParts(2)).toEqual({ main: '2,00', tenth: '0' });
    expect(formatPriceParts(null)).toBeNull();
    expect(formatPriceParts(false)).toBeNull();
    expect(formatPriceParts(0)).toBeNull();
  });

  it('formats full German price strings consistently', () => {
    expect(formatPrice(1.699, 3)).toBe('1,699 €');
    expect(formatPrice(1.699, 2)).toBe('1,70 €');
    expect(formatPrice(false)).toBe('k.A.');
  });

  it('formats cent differences including sub-cent tenth differences', () => {
    expect(formatCentDiff(0.004)).toBe('+0,4 ct');
    expect(formatCentDiff(0.02)).toBe('+2 ct');
    expect(formatCentDiff(0)).toBeNull();
  });

  it('extracts valid fuel prices', () => {
    expect(getFuelPrice(baseStation, 'diesel')).toBe(1.659);
    expect(getFuelPrice(baseStation, 'e5')).toBeNull();
    expect(getFuelPrice(baseStation, 'e10')).toBeNull();
  });

  it('formats addresses without rendering "undefined" when houseNumber is missing', () => {
    expect(formatAddress('Hauptstraße', undefined, 'Berlin')).toBe('Hauptstraße, Berlin');
    expect(formatAddress('Hauptstraße', '12a', 'Berlin')).toBe('Hauptstraße 12a, Berlin');
  });

  it('escapes HTML special characters safely', () => {
    expect(escapeHtml('<script>"test" & \'x\'</script>')).toBe(
      '&lt;script&gt;&quot;test&quot; &amp; &#39;x&#39;&lt;/script&gt;'
    );
  });
});
