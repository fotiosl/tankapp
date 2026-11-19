import { memo, useState, useRef, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  CircleCheck,
  Star,
  TrendingDown,
  Share2,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  CircleExclamationPoint,
  BellRing,
} from 'lucide-react';
import type { Station, FuelType, UserSettings, StationDetailData } from '../types';
import {
  formatAddress,
  formatCentDiff,
  formatDistance,
  formatPrice,
  formatPriceParts,
  getFuelPrice,
  openNavigation,
} from '../utils/formatters';
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
  isRouteMode?: boolean;
  isPriceAlertHit?: boolean;
  isFavorite: boolean;
  onToggleFavorite: (stationId: string) => void;
}

const ALL_FUELS: { type: FuelType; label: string }[] = [
  { type: 'diesel', label: 'Diesel' },
  { type: 'e10', label: 'E10' },
  { type: 'e5', label: 'E5' },
];

export const StationCard = memo(function StationCard({
  station,
  selectedFuel,
  minPrice,
  minDist = 0,
  closestStationPrice,
  userSettings,
  isRouteMode = false,
  isPriceAlertHit = false,
  isFavorite,
  onToggleFavorite,
}: StationCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<StationDetailData | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'error'>('idle');

  const detailsAbortRef = useRef<AbortController | null>(null);
  const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      detailsAbortRef.current?.abort();
      if (shareTimeoutRef.current !== null) {
        clearTimeout(shareTimeoutRef.current);
      }
    };
  }, []);

  const currentPrice = getFuelPrice(station, selectedFuel);
  const priceParts = formatPriceParts(currentPrice);
  const brandTheme = getBrandTheme(station.brand, station.name);
  const addressText = formatAddress(station.street, station.houseNumber, station.place);

  const isBestPrice =
    station.isOpen &&
    currentPrice !== null &&
    minPrice !== null &&
    Math.abs(currentPrice - minPrice) < 0.0005;

  const diffLabel =
    currentPrice !== null && minPrice !== null && !isBestPrice
      ? formatCentDiff(currentPrice - minPrice)
      : null;

  // Umweg-Ersparnis nur für geöffnete Stationen im Umkreis-Modus berechnen
  const savings =
    !isRouteMode &&
    station.isOpen &&
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

  const otherFuels = ALL_FUELS.filter((f) => f.type !== selectedFuel);

  const scheduleShareReset = (delayMs: number) => {
    if (shareTimeoutRef.current !== null) {
      clearTimeout(shareTimeoutRef.current);
    }
    shareTimeoutRef.current = setTimeout(() => {
      setShareState('idle');
    }, delayMs);
  };

  const handleShare = async () => {
    const fuelName = selectedFuel.toUpperCase();
    const priceStr = currentPrice ? `${formatPrice(currentPrice, 3)} (${fuelName})` : '';
    const shareText = `⛽ ${station.name}\n📍 ${addressText}\n${
      priceStr ? `💰 Aktueller Preis: ${priceStr}\n` : ''
    }`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Spritpreise bei ${station.name}`,
          text: shareText,
          url: mapsUrl,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Bei sonstigen Share-Fehlern Fallback auf Zwischenablage versuchen
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}${mapsUrl}`);
      setShareState('copied');
      scheduleShareReset(2000);
    } catch {
      setShareState('error');
      scheduleShareReset(2500);
    }
  };

  const loadDetails = async () => {
    detailsAbortRef.current?.abort();
    const controller = new AbortController();
    detailsAbortRef.current = controller;

    setIsLoadingDetails(true);
    setDetailsError(null);
    try {
      const data = await fetchStationDetails(station.id, controller.signal);
      if (controller.signal.aborted) return;
      setDetails(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setDetailsError(
        err instanceof Error ? err.message : 'Öffnungszeiten konnten nicht geladen werden.'
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingDetails(false);
      }
    }
  };

  const toggleDetails = () => {
    const nextOpen = !showDetails;
    setShowDetails(nextOpen);
    if (nextOpen && !details && !isLoadingDetails) {
      void loadDetails();
    }
  };

  return (
    <article
      className={`bg-white dark:bg-slate-800/90 rounded-2xl p-4 border transition-all duration-200 shadow-sm hover:shadow-md dark:shadow-md hover:border-slate-300 dark:hover:border-slate-600 relative ${
        isBestPrice
          ? 'border-emerald-500/60 dark:border-emerald-500/50 bg-gradient-to-b from-white to-emerald-50/70 dark:from-slate-800/90 dark:to-emerald-950/25 dark:shadow-emerald-950/30'
          : 'border-slate-200 dark:border-slate-700/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Brand, Name, Address */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-md border ${brandTheme.badgeBg} ${brandTheme.badgeText} ${brandTheme.badgeBorder} shadow-xs`}
            >
              {brandTheme.displayName}
            </span>

            {isBestPrice && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <CircleCheck className="w-3 h-3" />
                Günstigste
              </span>
            )}

            {isPriceAlertHit && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/35">
                <BellRing className="w-3 h-3" />
                Wunschpreis
              </span>
            )}

            <span
              className={`text-[11px] font-semibold flex items-center gap-1 ${
                station.isOpen
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  station.isOpen
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : 'bg-rose-500 dark:bg-rose-400'
                }`}
              />
              {station.isOpen ? 'Geöffnet' : 'Geschlossen'}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
            {station.name}
          </h3>

          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{addressText}</span>
          </div>
        </div>

        {/* Right Side: Price Display & Favorite Button */}
        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleFavorite(station.id)}
              aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              aria-pressed={isFavorite}
              title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 ${
                isFavorite
                  ? 'bg-amber-500/20 dark:bg-amber-500/25 border-amber-500/80 dark:border-amber-400/80 text-amber-500 dark:text-amber-400 shadow-sm shadow-amber-500/25 scale-105 ring-1 ring-amber-400/50'
                  : 'bg-slate-100 dark:bg-slate-900/90 border-amber-500/35 text-amber-500/80 dark:text-amber-400/75 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-500/15 hover:border-amber-400/70 hover:scale-105'
              }`}
            >
              <Star
                className={`w-5 h-5 transition-transform ${
                  isFavorite
                    ? 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400'
                    : 'text-amber-500/80 dark:text-amber-400/80 hover:scale-110'
                }`}
              />
            </button>

            {priceParts ? (
              <div
                className={`flex items-baseline px-2.5 py-1 rounded-xl border ${
                  isBestPrice
                    ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-100 dark:bg-slate-900/80 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700/80'
                }`}
              >
                <span className="text-2xl font-black tracking-tight">{priceParts.main}</span>
                <span className="text-sm font-bold align-top ml-0.5 -translate-y-1">
                  {priceParts.tenth}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                  €
                </span>
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-slate-500 text-xs font-semibold border border-slate-200 dark:border-slate-700/50">
                k.A.
              </div>
            )}
          </div>

          {diffLabel && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              {diffLabel} ggü. Günstigste
            </span>
          )}
        </div>
      </div>

      {/* Umweg-Ersparnis Hinweis (falls vorhanden) */}
      {savings && savings.isWorthwhile && (
        <div className="mt-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <span className="flex items-center gap-1.5 font-semibold">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Spart ~{savings.netSavings.toFixed(2).replace('.', ',')} € netto
          </span>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
            bei {userSettings?.tankVolumeLiters || 50}L (abzgl. Umweg)
          </span>
        </div>
      )}

      {/* Secondary Fuel Row & Action Bar */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {otherFuels.map((f) => {
            const p = getFuelPrice(station, f.type);
            return (
              <div
                key={f.type}
                className="text-[11px] bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 flex items-center gap-1"
              >
                <span className="text-slate-500 dark:text-slate-400 font-medium">{f.label}:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">
                  {p ? formatPrice(p, 3) : '-'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={toggleDetails}
            aria-expanded={showDetails}
            aria-label="Öffnungszeiten anzeigen"
            className="p-1.5 bg-slate-100 dark:bg-slate-900/70 hover:bg-slate-200 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs transition cursor-pointer flex items-center gap-1"
            title="Öffnungszeiten & Wochenplan ansehen"
          >
            <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            {showDetails ? (
              <ChevronUp className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              void handleShare();
            }}
            aria-label="Tankstelle und Preis teilen"
            className="p-1.5 bg-slate-100 dark:bg-slate-900/70 hover:bg-slate-200 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs transition cursor-pointer flex items-center gap-1"
            title={
              shareState === 'copied'
                ? 'In Zwischenablage kopiert'
                : shareState === 'error'
                ? 'Kopieren nicht möglich'
                : 'Spritpreise teilen'
            }
          >
            {shareState === 'copied' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : shareState === 'error' ? (
              <CircleExclamationPoint className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            )}
          </button>

          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-1">
            {formatDistance(station.dist)}
            {isRouteMode && (
              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 ml-0.5">
                ab Start
              </span>
            )}
          </span>

          <button
            type="button"
            onClick={() => openNavigation(station.lat, station.lng, station.name)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            title="Navigation in Apple Maps oder Google Maps starten"
          >
            <Navigation className="w-3 h-3" />
            Route
          </button>
        </div>
      </div>

      {/* Expandable Details (Öffnungszeiten-Wochenplan & Sonderzeiten) */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/40 space-y-2 text-xs animate-fade-in">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              Öffnungszeiten &amp; Services
            </span>
            {details?.wholeDay && (
              <span className="text-[10px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                24/7 Geöffnet
              </span>
            )}
          </div>

          {isLoadingDetails ? (
            <div className="py-3 flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
              <LoaderCircle className="w-4 h-4 animate-spin text-blue-500 dark:text-blue-400" />
              <span>Öffnungszeiten werden geladen...</span>
            </div>
          ) : detailsError ? (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-2.5 flex items-center justify-between gap-2 text-[11px] text-rose-700 dark:text-rose-300">
              <span className="flex items-center gap-1.5">
                <CircleExclamationPoint className="w-3.5 h-3.5 shrink-0" />
                {detailsError}
              </span>
              <button
                type="button"
                onClick={() => {
                  void loadDetails();
                }}
                className="font-bold underline shrink-0 cursor-pointer"
              >
                Erneut laden
              </button>
            </div>
          ) : details?.openingTimes && details.openingTimes.length > 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 space-y-1.5">
              {details.openingTimes.map((ot) => (
                <div
                  key={`${ot.text}-${ot.start}-${ot.end}`}
                  className="flex justify-between items-center text-[11px]"
                >
                  <span className="text-slate-600 dark:text-slate-400">{ot.text}:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {ot.start} – {ot.end} Uhr
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              {details?.wholeDay
                ? 'Diese Tankstelle ist durchgehend 24 Stunden geöffnet.'
                : 'Kein detaillierter Wochenplan von der MTS-K gemeldet.'}
            </div>
          )}

          {details?.overrides && details.overrides.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-2.5 space-y-1 text-[11px] text-amber-900 dark:text-amber-200">
              <p className="font-semibold">Abweichende Öffnungszeiten / Feiertage:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {details.overrides.map((override) => (
                  <li key={override}>{override}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
});
