import type { FuelType, OpeningTime, Station, StationDetailData } from '../types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFuelType(value: string): value is FuelType {
  return value === 'diesel' || value === 'e10' || value === 'e5';
}

export function isStationLike(value: unknown): value is Station {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    typeof value.dist === 'number' &&
    typeof value.isOpen === 'boolean'
  );
}

function isOpeningTime(value: unknown): value is OpeningTime {
  if (!isRecord(value)) return false;
  return (
    typeof value.text === 'string' &&
    typeof value.start === 'string' &&
    typeof value.end === 'string'
  );
}

export function isStationDetailData(value: unknown): value is StationDetailData {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.isOpen !== 'boolean' ||
    typeof value.wholeDay !== 'boolean'
  ) {
    return false;
  }
  if (
    value.openingTimes !== undefined &&
    (!Array.isArray(value.openingTimes) || !value.openingTimes.every(isOpeningTime))
  ) {
    return false;
  }
  if (
    value.overrides !== undefined &&
    (!Array.isArray(value.overrides) || !value.overrides.every((item) => typeof item === 'string'))
  ) {
    return false;
  }
  return true;
}

export function parseJsonSafe(raw: string): unknown {
  return JSON.parse(raw);
}

export async function readJsonUnknown(response: Response): Promise<unknown> {
  return response.json();
}
