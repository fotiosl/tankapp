import React, { useState } from 'react';
import { Navigation, MapPin, CheckCircle2, Star, TrendingDown, Share2, Clock, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { Station, FuelType, UserSettings, StationDetailData } from '../types';
import { formatPriceParts, getFuelPrice, openNavigation } from '../utils/formatters';
import { getBrandTheme } from '../utils/brandStyles';
import { calculateNetSavings } from '../utils/calculator';
import { fetchStationDetails } from '../services/api';

interface StationCardProps {
  station: Station;
  selectedFuel: FuelType;
  minPrice: number | null;
  minDist?: number;
  closestStationPrice?: number | null;
  userSettings?: UserSettings;
  isFavorite: boolean;
  onToggleFavorite: (stationId: string) => void;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  selectedFuel,
  minPrice,
  minDist = 0,
  closestStationPrice,
  userSettings,
  isFavorite,
  onToggleFavorite,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<StationDetailData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const currentPrice = getFuelPrice(station, selectedFuel);
  const priceParts = formatPriceParts(currentPrice);
  const brandTheme = getBrandTheme(station.brand, station.name);

  const isBestPrice =
    currentPrice !== null &&
    minPrice !== null &&
    Math.abs(currentPrice - minPrice) < 0.001;

  const diffToBest =
    currentPrice !== null && minPrice !== null && !isBestPrice
      ? Math.round((currentPrice - minPrice) * 100)
      : null;

  // Umweg-Ersparnis berechnen (im Vergleich zur nächstgelegenen Tankstelle)
  const savings =
    currentPrice !== null &&
    closestStationPrice !== null &&
    closestStationPrice !== undefined &&
    userSettings &&
    station.dist > minDist &&
    currentPrice < closestStationPrice
      ? calculateNetSavings(
          currentPrice,
          closestStationPrice,
          station.dist,
          minDist,
          userSettings
        )
      : null;

  // Secondary fuel prices
  const otherFuels: { type: FuelType; label: string }[] = [
    { type: 'diesel', label: 'Diesel' },
    { type: 'e10', label: 'E10' },
    { type: 'e5', label: 'E5' },
  ].filter((f) => f.type !== selectedFuel) as { type: FuelType; label: string }[];

  const handleShare = async () => {
    const fuelName = selectedFuel.toUpperCase();
    const priceStr = currentPrice ? `${currentPrice.toFixed(3).replace('.', ',')} € (${fuelName})` : '';
    const shareText = `⛽ ${station.name}\n📍 ${station.street} ${station.houseNumber || ''}, ${station.place}\n${priceStr ? `💰 Aktueller Preis: ${priceStr}\n` : ''}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Spritpreise bei ${station.name}`,
          text: shareText,
          url: mapsUrl,
        });
      } catch {
        // User canceled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}${mapsUrl}`);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const toggleDetails = async () => {
    if (!showDetails && !details) {
      setIsLoadingDetails(true);
      const data = await fetchStationDetails(station.id);
      setDetails(data);
      setIsLoadingDetails(false);
    }
    setShowDetails((prev) => !prev);
  };

  return (
    <div
      className={`bg-slate-800/90 dark:bg-slate-800/90 rounded-2xl p-4 border transition-all duration-200 shadow-md hover:border-slate-600 relative ${
        isBestPrice
          ? 'border-emerald-500/50 bg-gradient-to-b from-slate-800/90 to-emerald-950/25 shadow-emerald-950/30'
          : 'border-slate-700/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Brand, Name, Address */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Brand Badge mit echten Markenfarben */}
            <span
              className={`text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-md border ${brandTheme.badgeBg} ${brandTheme.badgeText} ${brandTheme.badgeBorder} shadow-sm`}
            >
              {brandTheme.displayName}
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

          <h3 className="text-base font-bold text-slate-100 truncate flex items-center gap-1.5">
            {station.name}
          </h3>

          <div className="flex items-center gap-1 text-xs text-slate-400 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">
              {station.street} {station.houseNumber}, {station.place}
            </span>
          </div>
        </div>

        {/* Right Side: Price Display & Favorite Button */}
        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            {/* Stern Favoriten-Button */}
            <button
              onClick={() => onToggleFavorite(station.id)}
              aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                isFavorite
                  ? 'bg-amber-500/25 border-amber-400/80 text-amber-400 shadow-sm shadow-amber-500/30 scale-105 ring-1 ring-amber-400/50'
                  : 'bg-slate-900/90 border-amber-500/35 text-amber-400/75 hover:text-amber-300 hover:bg-amber-500/15 hover:border-amber-400/70 hover:scale-105'
              }`}
            >
              <Star
                className={`w-5 h-5 transition-transform ${
                  isFavorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-amber-400/80 hover:scale-110'
                }`}
              />
            </button>

            {/* Hauptpreis */}
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
          </div>

          {diffToBest !== null && diffToBest > 0 && (
            <span className="text-[10px] text-amber-400 font-semibold">
              +{diffToBest} ct ggü. Günstigste
            </span>
          )}
        </div>
      </div>

      {/* Umweg-Ersparnis Hinweis (falls vorhanden) */}
      {savings && savings.isWorthwhile && (
        <div className="mt-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-emerald-300">
          <span className="flex items-center gap-1.5 font-semibold">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            Spart ~{savings.netSavings.toFixed(2).replace('.', ',')} € netto
          </span>
          <span className="text-[10px] text-emerald-400/80">
            bei {userSettings?.tankVolumeLiters || 50}L (abzgl. Umweg)
          </span>
        </div>
      )}

      {/* Secondary Fuel Row & Action Bar */}
      <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
        {/* Andere Kraftstoff-Preise */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {otherFuels.map((f) => {
            const p = getFuelPrice(station, f.type);
            return (
              <div
                key={f.type}
                className="text-[11px] bg-slate-900/70 border border-slate-800 rounded-lg px-2 py-0.5 flex items-center gap-1"
              >
                <span className="text-slate-400 font-medium">{f.label}:</span>
                <span className="text-slate-200 font-semibold">
                  {p ? `${p.toFixed(2)} €` : '-'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons: Details, Teilen, Distanz & Route */}
        <div className="flex items-center gap-1.5">
          {/* Details / Öffnungszeiten Toggle */}
          <button
            onClick={toggleDetails}
            className="p-1.5 bg-slate-900/70 hover:bg-slate-700/70 text-slate-300 rounded-lg border border-slate-700/60 text-xs transition cursor-pointer flex items-center gap-1"
            title="Öffnungszeiten & Wochenplan ansehen"
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            {showDetails ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </button>

          {/* Web Share Button */}
          <button
            onClick={handleShare}
            className="p-1.5 bg-slate-900/70 hover:bg-slate-700/70 text-slate-300 rounded-lg border border-slate-700/60 text-xs transition cursor-pointer flex items-center gap-1"
            title="Spritpreise teilen"
          >
            {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <span className="text-xs font-semibold text-slate-400 px-1">
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

      {/* Expandable Details (Öffnungszeiten-Wochenplan) */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-700/40 space-y-2 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Öffnungszeiten & Services
            </span>
            {details?.wholeDay && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                24/7 Geöffnet
              </span>
            )}
          </div>

          {isLoadingDetails ? (
            <div className="py-3 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Öffnungszeiten werden geladen...</span>
            </div>
          ) : details?.openingTimes && details.openingTimes.length > 0 ? (
            <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800 space-y-1.5">
              {details.openingTimes.map((ot, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">{ot.text}:</span>
                  <span className="font-semibold text-slate-200">
                    {ot.start} – {ot.end} Uhr
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              {details?.wholeDay
                ? 'Diese Tankstelle ist durchgehend 24 Stunden geöffnet.'
                : 'Kein detaillierter Wochenplan von der MTS-K gemeldet.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
