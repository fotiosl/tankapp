import React from 'react';
import { Navigation, MapPin, CheckCircle2 } from 'lucide-react';
import type { Station, FuelType } from '../types';
import { formatPriceParts, getBrandBadge, getFuelPrice, openNavigation } from '../utils/formatters';

interface StationCardProps {
  station: Station;
  selectedFuel: FuelType;
  minPrice: number | null;
}

export const StationCard: React.FC<StationCardProps> = ({ station, selectedFuel, minPrice }) => {
  const currentPrice = getFuelPrice(station, selectedFuel);
  const priceParts = formatPriceParts(currentPrice);
  const brandBadge = getBrandBadge(station.brand || station.name);

  const isBestPrice =
    currentPrice !== null &&
    minPrice !== null &&
    Math.abs(currentPrice - minPrice) < 0.001;

  const diffToBest =
    currentPrice !== null && minPrice !== null && !isBestPrice
      ? Math.round((currentPrice - minPrice) * 100)
      : null;

  // Secondary fuel prices
  const otherFuels: { type: FuelType; label: string }[] = [
    { type: 'diesel', label: 'Diesel' },
    { type: 'e10', label: 'E10' },
    { type: 'e5', label: 'E5' },
  ].filter((f) => f.type !== selectedFuel) as { type: FuelType; label: string }[];

  return (
    <div
      className={`bg-slate-800/90 rounded-2xl p-4 border transition-all duration-200 shadow-md hover:border-slate-600 ${
        isBestPrice
          ? 'border-emerald-500/50 bg-gradient-to-b from-slate-800/90 to-emerald-950/20 shadow-emerald-950/30'
          : 'border-slate-700/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Brand, Name, Address */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Brand Badge */}
            <span
              className={`text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-md ${brandBadge.bg} ${brandBadge.text} shadow-sm`}
            >
              {brandBadge.label}
            </span>

            {/* Best Price Badge */}
            {isBestPrice && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Günstigste
              </span>
            )}

            {/* Open / Closed status */}
            <span
              className={`text-[11px] font-semibold flex items-center gap-1 ${
                station.isOpen ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  station.isOpen ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              {station.isOpen ? 'Geöffnet' : 'Geschlossen'}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-100 truncate">{station.name}</h3>

          <div className="flex items-center gap-1 text-xs text-slate-400 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">
              {station.street} {station.houseNumber}, {station.place}
            </span>
          </div>
        </div>

        {/* Right Side: Main Price Display */}
        <div className="text-right shrink-0 flex flex-col items-end">
          {priceParts ? (
            <div
              className={`flex items-baseline px-2.5 py-1 rounded-xl border ${
                isBestPrice
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900/80 text-white border-slate-700/80'
              }`}
            >
              <span className="text-2xl font-black tracking-tight">{priceParts.main}</span>
              <span className="text-sm font-bold align-top ml-0.5 -translate-y-1">
                {priceParts.tenth}
              </span>
              <span className="text-xs font-semibold text-slate-400 ml-1">€</span>
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-xl bg-slate-900/60 text-slate-500 text-xs font-semibold border border-slate-700/50">
              k.A.
            </div>
          )}

          {diffToBest !== null && diffToBest > 0 && (
            <span className="text-[10px] text-amber-400 font-semibold mt-1">
              +{diffToBest} ct
            </span>
          )}
        </div>
      </div>

      {/* Secondary Fuel Row & Action Bar */}
      <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
        {/* Other fuel prices */}
        <div className="flex items-center gap-2">
          {otherFuels.map((f) => {
            const p = getFuelPrice(station, f.type);
            return (
              <div
                key={f.type}
                className="text-[11px] bg-slate-900/70 border border-slate-800 rounded-lg px-2 py-1 flex items-center gap-1.5"
              >
                <span className="text-slate-400 font-medium">{f.label}:</span>
                <span className="text-slate-200 font-semibold">
                  {p ? `${p.toFixed(2)} €` : '-'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Distance & Navigation Button */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">
            {station.dist < 1
              ? `${Math.round(station.dist * 1000)} m`
              : `${station.dist.toFixed(1)} km`}
          </span>

          <button
            onClick={() => openNavigation(station.lat, station.lng, station.name)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            title="Navigation in Apple Maps oder Google Maps starten"
          >
            <Navigation className="w-3 h-3" />
            Route
          </button>
        </div>
      </div>
    </div>
  );
};
