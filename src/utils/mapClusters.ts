import type { FuelType, Station } from '../types';
import { getFuelPrice } from './formatters';

export interface ProjectedPoint {
  x: number;
  y: number;
}

export type MapRenderItem =
  | {
      kind: 'station';
      key: string;
      station: Station;
    }
  | {
      kind: 'cluster';
      key: string;
      lat: number;
      lng: number;
      stations: Station[];
      minPrice: number | null;
      hasCheapest: boolean;
      hasFavorite: boolean;
    };

const CLUSTER_MAX_ZOOM = 13;
const CLUSTER_MIN_STATION_COUNT = 25;
const CELL_WIDTH_PX = 82;
const CELL_HEIGHT_PX = 38;

/**
 * Gruppiert nahe beieinander liegende Tankstellen auf großen Radien / kleinen Zoomstufen
 * zu kompakten Preis-Clustern ohne zusätzliche Leaflet-Plugin-Abhängigkeit.
 */
export function buildMapClusters(
  stations: readonly Station[],
  projectPoint: (lat: number, lng: number) => ProjectedPoint,
  selectedFuel: FuelType,
  zoom: number,
  globalMinPrice: number | null,
  favoriteSet: ReadonlySet<string>
): MapRenderItem[] {
  if (zoom > CLUSTER_MAX_ZOOM || stations.length <= CLUSTER_MIN_STATION_COUNT) {
    return stations.map((station) => ({
      kind: 'station',
      key: `station:${station.id}`,
      station,
    }));
  }

  const buckets = new Map<string, Station[]>();
  for (const station of stations) {
    const pt = projectPoint(station.lat, station.lng);
    const cellX = Math.floor(pt.x / CELL_WIDTH_PX);
    const cellY = Math.floor(pt.y / CELL_HEIGHT_PX);
    const cellKey = `${cellX}:${cellY}`;
    const list = buckets.get(cellKey);
    if (list) {
      list.push(station);
    } else {
      buckets.set(cellKey, [station]);
    }
  }

  const items: MapRenderItem[] = [];
  for (const [cellKey, group] of buckets) {
    if (group.length === 1) {
      const only = group[0];
      if (only) {
        items.push({ kind: 'station', key: `station:${only.id}`, station: only });
      }
      continue;
    }

    let latSum = 0;
    let lngSum = 0;
    let bestPrice: number | null = null;
    let hasCheapest = false;
    let hasFavorite = false;

    for (const s of group) {
      latSum += s.lat;
      lngSum += s.lng;
      if (favoriteSet.has(s.id)) hasFavorite = true;
      if (!s.isOpen) continue;
      const p = getFuelPrice(s, selectedFuel);
      if (p !== null) {
        if (bestPrice === null || p < bestPrice) {
          bestPrice = p;
        }
        if (globalMinPrice !== null && Math.abs(p - globalMinPrice) < 0.0005) {
          hasCheapest = true;
        }
      }
    }

    items.push({
      kind: 'cluster',
      key: `cluster:${zoom}:${cellKey}`,
      lat: latSum / group.length,
      lng: lngSum / group.length,
      stations: group,
      minPrice: bestPrice,
      hasCheapest,
      hasFavorite,
    });
  }

  return items;
}
