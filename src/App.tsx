import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import {
  List,
  Map as MapIcon,
  RefreshCw,
  TriangleExclamationPoint,
  SearchX,
  Compass,
  WifiOff,
  BellRing,
  Info,
  LoaderCircle,
} from 'lucide-react';
import type {
  ApiStatusInfo,
  Coordinates,
  FuelType,
  PriceAlert,
  SortMode,
  UserSettings,
} from './types';
import { fetchProxyStatus, getApiStatus, subscribeProxyStatus } from './services/api';
import { Header } from './components/Header';
import { FuelSelector } from './components/FuelSelector';
import { SearchAndFilters } from './components/SearchAndFilters';
import { StationCard } from './components/StationCard';
import { formatPrice, getFuelPrice } from './utils/formatters';
import { matchesBrandOrSearch } from './utils/brandStyles';
import { DEFAULT_USER_SETTINGS } from './utils/calculator';
import { isFuelType, isRecord, parseJsonSafe } from './utils/typeGuards';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useFavorites } from './hooks/useFavorites';
import { useTheme } from './hooks/useTheme';
import { useGeolocation } from './hooks/useGeolocation';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useStations } from './hooks/useStations';
import { usePriceAlert } from './hooks/usePriceAlert';
import { usePwaInstall } from './hooks/usePwaInstall';

const MapView = lazy(() => import('./components/MapView'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const PriceAlertModal = lazy(() => import('./components/PriceAlertModal'));
const PWAInstallGuideModal = lazy(() => import('./components/PWAInstallGuideModal'));

const parseFuelType = (raw: string): FuelType | null =>
  isFuelType(raw) ? raw : null;

const parseRawString = (raw: string): string => raw;

const parseRadius = (raw: string): number | null => {
  const val = Number(raw);
  return Number.isFinite(val) && val >= 1 && val <= 25 ? Math.round(val) : null;
};

const parseSortMode = (raw: string): SortMode | null =>
  raw === 'price' || raw === 'dist' ? raw : null;

const parseOnlyOpen = (raw: string): boolean | null =>
  raw === 'true' ? true : raw === 'false' ? false : null;

const parseUserSettings = (raw: string): UserSettings | null => {
  const parsed = parseJsonSafe(raw);
  if (!isRecord(parsed)) return null;
  const vol = typeof parsed.tankVolumeLiters === 'number' ? parsed.tankVolumeLiters : Number.NaN;
  const cons =
    typeof parsed.consumptionPer100Km === 'number' ? parsed.consumptionPer100Km : Number.NaN;
  if (!Number.isFinite(vol) || !Number.isFinite(cons)) return null;
  return {
    tankVolumeLiters: Math.max(10, Math.min(vol, 150)),
    consumptionPer100Km: Math.max(3, Math.min(cons, 25)),
  };
};

const parsePriceAlert = (raw: string): PriceAlert | null => {
  const parsed = parseJsonSafe(raw);
  if (!isRecord(parsed)) return null;
  const fuel = typeof parsed.fuelType === 'string' ? parseFuelType(parsed.fuelType) : null;
  const target = typeof parsed.targetPrice === 'number' ? parsed.targetPrice : Number.NaN;
  if (typeof parsed.enabled !== 'boolean' || !fuel || !Number.isFinite(target) || target <= 0) {
    return null;
  }
  return {
    enabled: parsed.enabled,
    fuelType: fuel,
    targetPrice: target,
  };
};

const DEFAULT_PRICE_ALERT: PriceAlert = {
  enabled: false,
  fuelType: 'diesel',
  targetPrice: 1.609,
};

export function App() {
  const { theme, toggleTheme } = useTheme();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { isStandalone, canPromptNativeInstall, triggerNativeInstall } = usePwaInstall();
  const {
    coords,
    setCoords,
    hasResolvedInitialLocation,
    isLoadingLocation,
    locationError,
    setLocationError,
    requestCurrentLocation,
  } = useGeolocation();

  // Persistierte Nutzer-Einstellungen (mit Laufzeit-Validierung)
  const [fuelType, setFuelType] = useLocalStorage<FuelType>(
    'tankapp_fuel_type',
    'diesel',
    parseFuelType
  );
  const [searchTerm, setSearchTerm] = useLocalStorage<string>(
    'tankapp_search_term',
    '',
    parseRawString
  );
  const [radiusKm, setRadiusKm] = useLocalStorage<number>(
    'tankapp_radius_km',
    5,
    parseRadius
  );
  const [sortMode, setSortMode] = useLocalStorage<SortMode>(
    'tankapp_sort_mode',
    'price',
    parseSortMode
  );
  const [onlyOpen, setOnlyOpen] = useLocalStorage<boolean>(
    'tankapp_only_open',
    true,
    parseOnlyOpen
  );
  const [userSettings, setUserSettings] = useLocalStorage<UserSettings>(
    'tankapp_user_settings',
    DEFAULT_USER_SETTINGS,
    parseUserSettings
  );
  const [priceAlert, setPriceAlert] = useLocalStorage<PriceAlert>(
    'tankapp_price_alert',
    DEFAULT_PRICE_ALERT,
    parsePriceAlert
  );

  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Routen-Modus
  const [isRouteMode, setIsRouteMode] = useState(false);
  const [routeDest, setRouteDest] = useState<Coordinates | null>(null);

  // API-Status reaktiv mit Proxy-Cache synchronisieren
  const [apiStatus, setApiStatus] = useState<ApiStatusInfo>(() => getApiStatus());

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeProxyStatus((configured) => {
      setApiStatus(getApiStatus(configured));
    });

    const controller = new AbortController();
    void fetchProxyStatus(controller.signal).then((configured) => {
      if (!controller.signal.aborted) {
        setApiStatus(getApiStatus(configured));
      }
    });

    return () => {
      unsubscribe();
      controller.abort();
    };
  }, []);

  const {
    stations,
    isLoadingStations,
    fetchError,
    routeWarning,
    lastUpdated,
    isOffline,
    isShowingCachedOffline,
    refresh: refreshStations,
  } = useStations({
    coords,
    radiusKm,
    isRouteMode,
    routeDest,
    hasResolvedInitialLocation,
  });

  const handleApiModeChanged = useCallback(() => {
    setApiStatus(getApiStatus());
    void refreshStations();
  }, [refreshStations]);

  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleClosePriceAlert = useCallback(() => setIsPriceAlertOpen(false), []);
  const handleCloseInstallGuide = useCallback(() => setIsInstallGuideOpen(false), []);

  // Pull-to-Refresh wartet jetzt echt auf den laufenden Fetch
  const {
    pullDistance,
    isRefreshing: isPullRefreshing,
    isTriggered,
  } = usePullToRefresh({
    onRefresh: refreshStations,
    disabled: viewMode === 'map' || isSettingsOpen || isInstallGuideOpen || isPriceAlertOpen,
  });

  // Wunschpreis-Prüfung (In-App-Banner + SW/Browser-Benachrichtigung)
  const alertHit = usePriceAlert(stations, priceAlert);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  // Gefilterte und sortierte Tankstellen
  const filteredStations = useMemo(() => {
    return stations
      .filter((station) => {
        if (onlyFavorites && !favoriteSet.has(station.id)) {
          return false;
        }
        if (searchTerm && !matchesBrandOrSearch(station, searchTerm)) {
          return false;
        }
        if (onlyOpen && !station.isOpen) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priceA = getFuelPrice(a, fuelType);
        const priceB = getFuelPrice(b, fuelType);

        if (sortMode === 'price') {
          if (a.isOpen !== b.isOpen) {
            return a.isOpen ? -1 : 1;
          }
          if (priceA !== null && priceB !== null) {
            if (Math.abs(priceA - priceB) > 0.0001) {
              return priceA - priceB;
            }
            return a.dist - b.dist;
          }
          if (priceA !== null) return -1;
          if (priceB !== null) return 1;
          return a.dist - b.dist;
        }

        return a.dist - b.dist;
      });
  }, [stations, searchTerm, onlyOpen, onlyFavorites, favoriteSet, sortMode, fuelType]);

  // Minimaler Preis ausschließlich unter geöffneten Stationen bestimmen
  const minPrice = useMemo(() => {
    let min: number | null = null;
    for (const s of filteredStations) {
      if (!s.isOpen) continue;
      const p = getFuelPrice(s, fuelType);
      if (p !== null && (min === null || p < min)) {
        min = p;
      }
    }
    return min;
  }, [filteredStations, fuelType]);

  // Nächstgelegene geöffnete Station für Umweg-Berechnung (O(N))
  const closestStation = useMemo(() => {
    let closest: (typeof stations)[number] | null = null;
    for (const s of stations) {
      if (!s.isOpen || getFuelPrice(s, fuelType) === null) continue;
      if (!closest || s.dist < closest.dist) {
        closest = s;
      }
    }
    return closest;
  }, [stations, fuelType]);

  const closestStationPrice = useMemo(
    () => (closestStation ? getFuelPrice(closestStation, fuelType) : null),
    [closestStation, fuelType]
  );

  const minDist = closestStation ? closestStation.dist : 0;

  return (
    <div
      className={`min-h-screen ${
        theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
      } flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors`}
    >
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        onOpenPriceAlert={() => setIsPriceAlertOpen(true)}
        isAlertActive={priceAlert.enabled}
        isDemoMode={apiStatus.isDemo}
        showInstallButton={!isStandalone}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-3 space-y-3.5 pb-24">
        {/* Pull to Refresh Indicator */}
        {pullDistance > 0 && (
          <div
            className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold py-1.5 transition-all"
            style={{ opacity: Math.min(pullDistance / 50, 1) }}
          >
            <RefreshCw
              className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${
                isTriggered || isPullRefreshing
                  ? 'animate-spin text-emerald-500 dark:text-emerald-400'
                  : ''
              }`}
            />
            <span>
              {isPullRefreshing
                ? 'Preise werden aktualisiert...'
                : isTriggered
                ? 'Loslassen zum Aktualisieren'
                : 'Nach unten ziehen...'}
            </span>
          </div>
        )}

        {/* Offline-Hinweis */}
        {(isOffline || isShowingCachedOffline) && (
          <output className="bg-slate-200/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isShowingCachedOffline && lastUpdated
                ? `Offline – zeige zuletzt gespeicherte Preise vom ${lastUpdated.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })} Uhr.`
                : 'Keine Internetverbindung – Preise können erst wieder online aktualisiert werden.'}
            </span>
          </output>
        )}

        <FuelSelector selectedFuel={fuelType} onSelectFuel={setFuelType} />

        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          onlyOpen={onlyOpen}
          onOnlyOpenChange={setOnlyOpen}
          currentCoords={coords}
          onSelectCoords={setCoords}
          onRefreshLocation={requestCurrentLocation}
          isLoadingLocation={isLoadingLocation}
          onlyFavorites={onlyFavorites}
          onOnlyFavoritesChange={setOnlyFavorites}
          favoriteCount={favoriteIds.length}
          isRouteMode={isRouteMode}
          onToggleRouteMode={(val) => {
            setIsRouteMode(val);
            if (!val) setRouteDest(null);
          }}
          routeDestination={routeDest}
          onSelectRouteDestination={setRouteDest}
          isLoadingRoute={isLoadingStations && isRouteMode}
        />

        {/* In-App Wunschpreis-Treffer Banner */}
        {alertHit && (
          <output className="bg-emerald-50 dark:bg-emerald-950/45 border border-emerald-300 dark:border-emerald-700/70 rounded-xl p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 animate-fade-in">
            <span className="flex items-center gap-2 font-semibold">
              <BellRing className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Wunschpreis erreicht ({priceAlert.fuelType.toUpperCase()} ≤{' '}
                {formatPrice(priceAlert.targetPrice, 3)}):{' '}
                <strong>{formatPrice(alertHit.price, 3)}</strong> bei {alertHit.stationName}
                {alertHit.count > 1 ? ` (+${alertHit.count - 1} weitere)` : ''}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsPriceAlertOpen(true)}
              className="text-[11px] font-bold underline text-emerald-700 dark:text-emerald-300 shrink-0 cursor-pointer"
            >
              Anpassen
            </button>
          </output>
        )}

        {/* Fehler-Meldung bei GPS */}
        {locationError && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              {locationError}
            </span>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              className="text-[10px] text-amber-700 dark:text-amber-400 font-bold underline cursor-pointer shrink-0"
            >
              Ausblenden
            </button>
          </div>
        )}

        {/* Routen-Hinweis (Lücken bei Langstrecke / Teilfehler) */}
        {routeWarning && isRouteMode && (
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-2.5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>{routeWarning}</span>
          </div>
        )}

        {/* Statuszeile & Ansichts-Umschaltung */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {filteredStations.length}{' '}
              {filteredStations.length === 1 ? 'Tankstelle' : 'Tankstellen'}{' '}
              {onlyFavorites ? 'in Favoriten' : isRouteMode ? 'auf Route' : 'gefunden'}
            </span>
            {lastUpdated && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                • {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 flex gap-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('map')}
              aria-pressed={viewMode === 'map'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Karte</span>
            </button>
          </div>
        </div>

        {/* API-Fehler Hinweis */}
        {fetchError && !isShowingCachedOffline && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-xs text-rose-900 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
              <TriangleExclamationPoint className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Fehler beim Laden der Preise
            </div>
            <p className="leading-relaxed">{fetchError}</p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  void refreshStations();
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        )}

        {/* Content View: Liste oder Karte */}
        {viewMode === 'map' ? (
          <Suspense
            fallback={
              <div className="w-full h-[65vh] min-h-[400px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <LoaderCircle className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Karte wird geladen...</span>
              </div>
            }
          >
            <MapView
              stations={filteredStations}
              userCoords={coords}
              selectedFuel={fuelType}
              minPrice={minPrice}
              theme={theme}
              isRouteMode={isRouteMode}
              routeDestination={routeDest}
              onCenterUser={requestCurrentLocation}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
            />
          </Suspense>
        ) : (
          <div className="space-y-3">
            {isLoadingStations && stations.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 animate-pulse space-y-3"
                  >
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                    <div className="h-8 bg-slate-100 dark:bg-slate-700/60 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : filteredStations.length > 0 ? (
              filteredStations.map((station) => {
                const alertFuelPrice =
                  priceAlert.enabled && station.isOpen
                    ? getFuelPrice(station, priceAlert.fuelType)
                    : null;
                const isAlertHitCard =
                  alertFuelPrice !== null && alertFuelPrice <= priceAlert.targetPrice;

                return (
                  <StationCard
                    key={station.id}
                    station={station}
                    selectedFuel={fuelType}
                    minPrice={minPrice}
                    minDist={minDist}
                    closestStationPrice={closestStationPrice}
                    userSettings={userSettings}
                    isRouteMode={isRouteMode}
                    isPriceAlertHit={isAlertHitCard}
                    isFavorite={favoriteSet.has(station.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                );
              })
            ) : (
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-sm dark:shadow-none">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
                  <SearchX className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-200 text-base">
                  {onlyFavorites ? 'Keine Favoriten gefunden' : 'Keine Tankstellen gefunden'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {onlyFavorites
                    ? 'Tippe auf den Stern bei beliebigen Tankstellen, um sie zu deinen Favoriten hinzuzufügen.'
                    : isRouteMode && !routeDest
                    ? 'Bitte oben einen Zielort suchen und auswählen, um Tankstellen entlang der Route zu laden.'
                    : isRouteMode
                    ? 'Auf der eingegebenen Fahrstrecke wurden mit den aktuellen Filtern keine Tankstellen gefunden.'
                    : `Im Umkreis von ${radiusKm} km wurden mit den aktuellen Filtern keine Tankstellen gefunden.`}
                </p>
                {!(isRouteMode && !routeDest) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setOnlyOpen(false);
                      setOnlyFavorites(false);
                      if (!isRouteMode && radiusKm < 15) {
                        setRadiusKm(15);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {onlyFavorites
                      ? 'Alle Tankstellen anzeigen'
                      : isRouteMode
                      ? 'Filter zurücksetzen'
                      : 'Filter zurücksetzen & Radius vergrößern'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Gesetzlich vorgeschriebene Datenquellen-Hinweise (CC BY 4.0 & ODbL) */}
        <footer className="pt-4 pb-2 text-center text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed space-y-1">
          <p>
            Kraftstoffpreise via{' '}
            <a
              href="https://creativecommons.tankerkoenig.de/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-800 dark:hover:text-slate-200"
            >
              Tankerkönig
            </a>{' '}
            / MTS-K (Bundeskartellamt) unter{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-800 dark:hover:text-slate-200"
            >
              CC BY 4.0
            </a>{' '}
            (aufbereitet &amp; gefiltert).
          </p>
          <p>
            Ortssuche &amp; Kartendaten &copy;{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-800 dark:hover:text-slate-200"
            >
              OpenStreetMap
            </a>{' '}
            Mitwirkende.
          </p>
        </footer>
      </main>

      {/* Floating Refresh Action Button at bottom */}
      <div className="fixed bottom-4 left-0 right-0 z-30 pointer-events-none flex justify-center px-4 pb-safe">
        <button
          type="button"
          onClick={() => {
            void refreshStations();
          }}
          disabled={isLoadingStations || (isRouteMode && !routeDest)}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3 bg-blue-600/95 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-full shadow-2xl shadow-blue-600/40 backdrop-blur-md border border-blue-400/30 transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingStations ? 'animate-spin' : ''}`} />
          <span>{isLoadingStations ? 'Lade Preise...' : 'Preise aktualisieren'}</span>
        </button>
      </div>

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={handleCloseSettings}
            onModeChanged={handleApiModeChanged}
            apiStatus={apiStatus}
          />
        </Suspense>
      )}

      {isPriceAlertOpen && (
        <Suspense fallback={null}>
          <PriceAlertModal
            isOpen={isPriceAlertOpen}
            onClose={handleClosePriceAlert}
            priceAlert={priceAlert}
            onSavePriceAlert={setPriceAlert}
            userSettings={userSettings}
            onSaveUserSettings={setUserSettings}
            currentFuelType={fuelType}
          />
        </Suspense>
      )}

      {isInstallGuideOpen && (
        <Suspense fallback={null}>
          <PWAInstallGuideModal
            isOpen={isInstallGuideOpen}
            onClose={handleCloseInstallGuide}
            canPromptNativeInstall={canPromptNativeInstall}
            onTriggerNativeInstall={triggerNativeInstall}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
