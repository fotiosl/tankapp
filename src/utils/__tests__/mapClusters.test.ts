import { describe, it, expect } from 'vitest';
import { buildMapClusters } from '../mapClusters';
import type { Station } from '../../types';

function makeStation(id: string, lat: number, lng: number, diesel: number, isOpen = true): Station {
  return {
    id,
    name: `Station ${id}`,
    brand: 'ARAL',
    street: 'Teststraße',
    place: 'Berlin',
    lat,
    lng,
    dist: 1.0,
    diesel,
    e5: 1.8,
    e10: 1.75,
    isOpen,
  };
}

describe('buildMapClusters', () => {
  it('returns individual stations when zoom > 13 or count <= 25', () => {
    const stations = Array.from({ length: 10 }, (_, idx) =>
      makeStation(`s-${idx}`, 52.52, 13.4, 1.6 + idx * 0.01)
    );
    const items = buildMapClusters(
      stations,
      () => ({ x: 100, y: 100 }),
      'diesel',
      11,
      1.6,
      new Set()
    );
    expect(items).toHaveLength(10);
    expect(items.every((item) => item.kind === 'station')).toBe(true);
  });

  it('clusters nearby stations on wide zoom levels and preserves cheapest/favorite indicators', () => {
    const stations: Station[] = [
      // 25 stations tightly grouped in cell (0,0)
      ...Array.from({ length: 25 }, (_, idx) =>
        makeStation(`near-${idx}`, 52.52, 13.4, 1.7 - idx * 0.001, idx !== 24)
      ),
      // 1 isolated station far away in another cell
      makeStation('far-1', 52.6, 13.5, 1.85, true),
    ];

    const project = (lat: number) => (lat > 52.55 ? { x: 500, y: 500 } : { x: 20, y: 20 });
    const items = buildMapClusters(
      stations,
      project,
      'diesel',
      11,
      1.676,
      new Set(['near-3'])
    );

    const clusters = items.filter((i) => i.kind === 'cluster');
    const singles = items.filter((i) => i.kind === 'station');

    expect(clusters).toHaveLength(1);
    expect(singles).toHaveLength(1);
    expect(clusters[0]?.stations).toHaveLength(25);
    expect(clusters[0]?.hasFavorite).toBe(true);
    // near-24 is closed (1.676), near-23 is open (1.677) -> best open price in cluster is 1.677
    expect(clusters[0]?.minPrice).toBeCloseTo(1.677, 3);
  });
});
