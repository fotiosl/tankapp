import type { UserSettings } from '../types';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  tankVolumeLiters: 50,
  consumptionPer100Km: 7.0,
};

export interface SavingsResult {
  grossSavings: number;
  detourCost: number;
  netSavings: number;
  isWorthwhile: boolean;
}

/**
 * Berechnet die Netto-Ersparnis beim Tanken unter Einberechnung des Umwegs.
 */
export function calculateNetSavings(
  stationPrice: number,
  referencePrice: number,
  stationDist: number,
  minDist: number,
  settings: UserSettings = DEFAULT_USER_SETTINGS
): SavingsResult {
  // Brutto-Ersparnis beim Volltanken
  const grossSavings = Math.max(0, (referencePrice - stationPrice) * settings.tankVolumeLiters);

  // Zusätzliche Kilometer für Hin- und Rückweg im Vergleich zur nächstgelegenen Station
  const detourKm = Math.max(0, (stationDist - minDist) * 2);

  // Spritverbrauch für den Umweg
  const fuelUsed = (detourKm * settings.consumptionPer100Km) / 100;
  const detourCost = fuelUsed * stationPrice;

  // Netto-Ersparnis
  const netSavings = grossSavings - detourCost;

  return {
    grossSavings,
    detourCost,
    netSavings: Math.max(0, netSavings),
    isWorthwhile: netSavings > 0.30, // Lohnt sich ab 30 Cent echter Ersparnis
  };
}
