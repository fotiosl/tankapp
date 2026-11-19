import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';
import type { Coordinates, FuelType, Station, ThemeMode } from '../types';
import {
  escapeHtml,
  formatAddress,
  formatDistance,
  formatPrice,
  formatPriceParts,
  getFuelPrice,
  openNavigation,
} from '../utils/formatters';
import { getBrandTheme } from '../utils/brandStyles';
import { buildMapClusters } from '../utils/mapClusters';
import { Navigation, Maximize2 } from 'lucide-react';

const EMPTY_FAVORITES: readonly string[] = [];

const TILE_URLS: Record<ThemeMode, string> = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

interface ManagedMarker {
  marker: L.Marker;
  fingerprint: string;
}

interface MapViewProps {
  stations: Station[];
  userCoords: Coordinates;
  selectedFuel: FuelType;
  minPrice: number | null;
  theme: ThemeMode;
  isRouteMode?: boolean;
  routeDestination?: Coordinates | null;
  onCenterUser: () => void;
  favoriteIds?: readonly string[];
  onToggleFavorite?: (stationId: string) => void;
}

function createStationIcon(
  station: Station,
  selectedFuel: FuelType,
  isCheapest: boolean,
  isFav: boolean
): L.DivIcon {
  const price = getFuelPrice(station, selectedFuel);
  const priceParts = formatPriceParts(price);
  const brandTheme = getBrandTheme(station.brand, station.name);

  const priceHtml = priceParts
    ? `${priceParts.main}<sup style="font-size: 9px; margin-left: 1px;">${priceParts.tenth}</sup>€`
    : 'k.A.';
  const badgeBg = isCheapest ? '#059669' : station.isOpen ? '#0f172a' : '#64748b';
  const badgeBorder = isFav ? '#f59e0b' : isCheapest ? '#34d399' : brandTheme.accentHex;
  const safeLabel = escapeHtml(
    (station.brand || station.name.split(' ')[0] || 'Tankstelle').slice(0, 10)
  );

  return L.divIcon({
    className: 'price-marker',
    html: `
      <div style="
        transform: translate(-50%, -50%);
        background: ${badgeBg};
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        font-family: -apple-system, sans-serif;
        padding: 3px 6px;
        border-radius: 8px;
        border: ${isFav ? '2px solid #f59e0b' : `1.5px solid ${badgeBorder}`};
        box-shadow: 0 4px 8px rgba(0,0,0,0.35);
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      ">
        ${isFav ? '<span style="color: #fbbf24; font-size: 12px; line-height: 1;">★</span>' : ''}
        <span style="width: 6px; height: 6px; border-radius: 9999px; background: ${brandTheme.accentHex}; flex-shrink: 0;"></span>
        <span>${safeLabel}</span>
        <span style="background: rgba(0,0,0,0.35); padding: 1px 4px; border-radius: 4px; color: ${isCheapest ? '#a7f3d0' : '#7dd3fc'}">${priceHtml}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createClusterIcon(
  count: number,
  bestPrice: number | null,
  hasCheapest: boolean,
  hasFavorite: boolean
): L.DivIcon {
  const priceParts = formatPriceParts(bestPrice);
  const priceHtml = priceParts
    ? `ab ${priceParts.main}<sup style="font-size: 9px; margin-left: 1px;">${priceParts.tenth}</sup>€`
    : `${count} Stationen`;
  const bg = hasCheapest ? '#059669' : '#1d4ed8';
  const border = hasFavorite ? '#f59e0b' : hasCheapest ? '#34d399' : '#60a5fa';

  return L.divIcon({
    className: 'cluster-marker',
    html: `
      <div style="
        transform: translate(-50%, -50%);
        background: ${bg};
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        font-family: -apple-system, sans-serif;
        padding: 4px 8px;
        border-radius: 9999px;
        border: 2px solid ${border};
        box-shadow: 0 6px 12px rgba(0,0,0,0.4);
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      ">
        <span style="background: rgba(255,255,255,0.22); padding: 1px 5px; border-radius: 9999px; font-size: 10px;">${count}×</span>
        <span>${priceHtml}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function buildStationPopupElement(
  station: Station,
  selectedFuel: FuelType,
  isCheapest: boolean,
  isFav: boolean,
  isDark: boolean,
  onToggleFavorite?: (stationId: string) => void
): HTMLDivElement {
  const price = getFuelPrice(station, selectedFuel);
  const brandTheme = getBrandTheme(station.brand, station.name);

  const popupEl = document.createElement('div');
  popupEl.style.fontFamily = '-apple-system, sans-serif';
  popupEl.style.minWidth = '205px';
  popupEl.style.padding = '2px';

  const metaRow = document.createElement('div');
  metaRow.style.display = 'flex';
  metaRow.style.alignItems = 'center';
  metaRow.style.justifyContent = 'space-between';
  metaRow.style.gap = '6px';
  metaRow.style.marginBottom = '4px';

  const brandPill = document.createElement('span');
  brandPill.textContent = brandTheme.displayName;
  brandPill.style.fontSize = '10px';
  brandPill.style.fontWeight = '800';
  brandPill.style.textTransform = 'uppercase';
  brandPill.style.padding = '1px 6px';
  brandPill.style.borderRadius = '5px';
  brandPill.style.background = `${brandTheme.accentHex}22`;
  brandPill.style.border = `1px solid ${brandTheme.accentHex}66`;
  brandPill.style.color = isDark ? '#e2e8f0' : '#0f172a';
  metaRow.appendChild(brandPill);

  const statusSpan = document.createElement('span');
  statusSpan.textContent = station.isOpen ? '● Geöffnet' : '● Geschlossen';
  statusSpan.style.fontSize = '10px';
  statusSpan.style.fontWeight = '700';
  statusSpan.style.color = station.isOpen
    ? isDark
      ? '#34d399'
      : '#047857'
    : isDark
    ? '#fb7185'
    : '#be123c';
  metaRow.appendChild(statusSpan);
  popupEl.appendChild(metaRow);

  const titleRow = document.createElement('div');
  titleRow.style.fontSize = '13px';
  titleRow.style.fontWeight = 'bold';
  titleRow.style.marginBottom = '2px';
  titleRow.style.display = 'flex';
  titleRow.style.alignItems = 'center';
  titleRow.style.justifyContent = 'space-between';
  titleRow.style.gap = '4px';

  const nameSpan = document.createElement('span');
  nameSpan.textContent = station.name;
  nameSpan.style.overflow = 'hidden';
  nameSpan.style.textOverflow = 'ellipsis';
  nameSpan.style.whiteSpace = 'nowrap';
  titleRow.appendChild(nameSpan);

  if (isFav) {
    const starSpan = document.createElement('span');
    starSpan.textContent = '★';
    starSpan.style.color = '#fbbf24';
    titleRow.appendChild(starSpan);
  }
  popupEl.appendChild(titleRow);

  const addrDiv = document.createElement('div');
  addrDiv.style.fontSize = '11px';
  addrDiv.style.opacity = '0.78';
  addrDiv.style.marginBottom = '6px';
  addrDiv.textContent = `${formatAddress(
    station.street,
    station.houseNumber,
    station.place
  )} (${formatDistance(station.dist)})`;
  popupEl.appendChild(addrDiv);

  const priceBox = document.createElement('div');
  priceBox.style.display = 'flex';
  priceBox.style.justifyContent = 'space-between';
  priceBox.style.alignItems = 'center';
  priceBox.style.marginBottom = '8px';
  priceBox.style.background = isDark
    ? 'rgba(15, 23, 42, 0.65)'
    : 'rgba(148, 163, 184, 0.16)';
  priceBox.style.padding = '5px 8px';
  priceBox.style.borderRadius = '8px';

  const fuelLabel = document.createElement('span');
  fuelLabel.style.fontSize = '11px';
  fuelLabel.style.textTransform = 'uppercase';
  fuelLabel.style.fontWeight = '600';
  fuelLabel.textContent = `${selectedFuel}:`;

  const priceVal = document.createElement('span');
  priceVal.style.fontSize = '14px';
  priceVal.style.fontWeight = 'bold';
  priceVal.style.color = isCheapest
    ? isDark
      ? '#34d399'
      : '#047857'
    : isDark
    ? '#38bdf8'
    : '#0369a1';
  priceVal.textContent = price ? formatPrice(price, 3) : 'Keine Angabe';

  priceBox.appendChild(fuelLabel);
  priceBox.appendChild(priceVal);
  popupEl.appendChild(priceBox);

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '6px';

  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.style.flex = '1';
  favBtn.style.background = isFav
    ? 'rgba(245, 158, 11, 0.22)'
    : isDark
    ? 'rgba(148, 163, 184, 0.18)'
    : 'rgba(148, 163, 184, 0.16)';
  favBtn.style.color = isDark ? '#fbbf24' : '#b45309';
  favBtn.style.border = isFav
    ? '1px solid rgba(245, 158, 11, 0.8)'
    : '1px solid rgba(245, 158, 11, 0.45)';
  favBtn.style.padding = '6px 8px';
  favBtn.style.borderRadius = '8px';
  favBtn.style.fontSize = '11px';
  favBtn.style.fontWeight = 'bold';
  favBtn.style.cursor = 'pointer';
  favBtn.textContent = isFav ? '★ Favorit' : '☆ Merken';
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(station.id);
  });

  const routeBtn = document.createElement('button');
  routeBtn.type = 'button';
  routeBtn.style.flex = '1';
  routeBtn.style.background = '#2563eb';
  routeBtn.style.color = '#ffffff';
  routeBtn.style.border = 'none';
  routeBtn.style.padding = '6px 8px';
  routeBtn.style.borderRadius = '8px';
  routeBtn.style.fontSize = '11px';
  routeBtn.style.fontWeight = 'bold';
  routeBtn.style.cursor = 'pointer';
  routeBtn.textContent = 'Route';
  routeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openNavigation(station.lat, station.lng, station.name);
  });

  btnRow.appendChild(favBtn);
  btnRow.appendChild(routeBtn);
  popupEl.appendChild(btnRow);

  return popupEl;
}

export function MapView({
  stations,
  userCoords,
  selectedFuel,
  minPrice,
  theme,
  isRouteMode = false,
  routeDestination = null,
  onCenterUser,
  favoriteIds = EMPTY_FAVORITES,
  onToggleFavorite,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersByKeyRef = useRef<Map<string, ManagedMarker>>(new Map());
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const initialCenterRef = useRef<[number, number]>([userCoords.lat, userCoords.lng]);
  const initialThemeRef = useRef<ThemeMode>(theme);
  const prevCoordsRef = useRef<[number, number]>([userCoords.lat, userCoords.lng]);
  const [mapZoom, setMapZoom] = useState(13);

  // Initialisiere Leaflet-Karte
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      center: initialCenterRef.current,
      zoom: 13,
      zoomControl: false,
    });

    const tileLayer = L.tileLayer(TILE_URLS[initialThemeRef.current], {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const routeLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    const handleZoomEnd = () => {
      setMapZoom(map.getZoom());
    };
    map.on('zoomend', handleZoomEnd);

    tileLayerRef.current = tileLayer;
    routeLayerRef.current = routeLayer;
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    const managedMap = markersByKeyRef.current;

    return () => {
      map.off('zoomend', handleZoomEnd);
      map.remove();
      managedMap.clear();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      routeLayerRef.current = null;
      markersLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  // Kartenkacheln an Light/Dark-Theme anpassen
  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(TILE_URLS[theme]);
  }, [theme]);

  // Aktualisiere Position des Nutzer-Markers und folge Standortänderungen
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const [prevLat, prevLng] = prevCoordsRef.current;
    const coordsChanged =
      Math.abs(prevLat - userCoords.lat) > 0.0001 ||
      Math.abs(prevLng - userCoords.lng) > 0.0001;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
            <div class="user-location-ping-ring" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #3b82f6; opacity: 0.45;"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
        .addTo(mapInstanceRef.current)
        .bindTooltip('Dein Standort', { permanent: false, direction: 'top' });
    }

    if (coordsChanged) {
      mapInstanceRef.current.setView(
        [userCoords.lat, userCoords.lng],
        mapInstanceRef.current.getZoom()
      );
      prevCoordsRef.current = [userCoords.lat, userCoords.lng];
    }
  }, [userCoords.lat, userCoords.lng]);

  // Routenlinie & Ziel-Marker im Routen-Modus darstellen
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;

    const routeLayer = routeLayerRef.current;
    routeLayer.clearLayers();

    if (!isRouteMode || !routeDestination) return;

    const startPoint: [number, number] = [userCoords.lat, userCoords.lng];
    const destPoint: [number, number] = [routeDestination.lat, routeDestination.lng];

    L.polyline([startPoint, destPoint], {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.75,
      dashArray: '8 8',
    }).addTo(routeLayer);

    const destIcon = L.divIcon({
      className: 'route-dest-marker',
      html: `
        <div style="width: 18px; height: 18px; border-radius: 50%; background-color: #10b981; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.45);"></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    L.marker(destPoint, { icon: destIcon })
      .addTo(routeLayer)
      .bindTooltip(routeDestination.name || 'Zielort', { permanent: false, direction: 'top' });

    const bounds = L.latLngBounds([startPoint, destPoint]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 13 });
  }, [isRouteMode, routeDestination, userCoords.lat, userCoords.lng]);

  // In-Place-Marker-Diffing & zoomabhängiges Clustering (kein Popup-Flackern bei Favoriten-Klick)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    const favSet = new Set(favoriteIds);
    const isDark = theme === 'dark';
    const managed = markersByKeyRef.current;

    const renderItems = buildMapClusters(
      stations,
      (lat, lng) => map.latLngToLayerPoint([lat, lng]),
      selectedFuel,
      mapZoom,
      minPrice,
      favSet
    );

    const activeKeys = new Set<string>();

    for (const item of renderItems) {
      activeKeys.add(item.key);

      if (item.kind === 'station') {
        const { station } = item;
        const isFav = favSet.has(station.id);
        const price = getFuelPrice(station, selectedFuel);
        const isCheapest =
          station.isOpen &&
          price !== null &&
          minPrice !== null &&
          Math.abs(price - minPrice) < 0.0005;

        const fingerprint = [
          selectedFuel,
          price ?? 'na',
          isCheapest ? '1' : '0',
          isFav ? '1' : '0',
          station.isOpen ? '1' : '0',
          theme,
          station.dist,
          station.lat,
          station.lng,
        ].join('|');

        const existing = managed.get(item.key);
        if (existing) {
          if (existing.fingerprint !== fingerprint) {
            existing.marker.setLatLng([station.lat, station.lng]);
            existing.marker.setIcon(
              createStationIcon(station, selectedFuel, isCheapest, isFav)
            );
            existing.marker.setPopupContent(
              buildStationPopupElement(
                station,
                selectedFuel,
                isCheapest,
                isFav,
                isDark,
                onToggleFavorite
              )
            );
            existing.fingerprint = fingerprint;
          }
          continue;
        }

        const marker = L.marker([station.lat, station.lng], {
          icon: createStationIcon(station, selectedFuel, isCheapest, isFav),
        })
          .addTo(layer)
          .bindPopup(
            buildStationPopupElement(
              station,
              selectedFuel,
              isCheapest,
              isFav,
              isDark,
              onToggleFavorite
            )
          );

        managed.set(item.key, { marker, fingerprint });
      } else {
        const fingerprint = [
          item.stations.length,
          item.minPrice ?? 'na',
          item.hasCheapest ? '1' : '0',
          item.hasFavorite ? '1' : '0',
          item.lat.toFixed(4),
          item.lng.toFixed(4),
        ].join('|');

        const existing = managed.get(item.key);
        if (existing && existing.fingerprint === fingerprint) {
          continue;
        }

        if (existing) {
          layer.removeLayer(existing.marker);
          managed.delete(item.key);
        }

        const clusterMarker = L.marker([item.lat, item.lng], {
          icon: createClusterIcon(
            item.stations.length,
            item.minPrice,
            item.hasCheapest,
            item.hasFavorite
          ),
        }).addTo(layer);

        const clusterStations = item.stations;
        clusterMarker.on('click', () => {
          const bounds = L.latLngBounds(clusterStations.map((s) => [s.lat, s.lng]));
          map.fitBounds(bounds, {
            padding: [45, 45],
            maxZoom: Math.min(map.getZoom() + 3, 15),
          });
        });

        managed.set(item.key, { marker: clusterMarker, fingerprint });
      }
    }

    // Nicht mehr vorhandene Marker sauber entfernen
    for (const [key, entry] of managed) {
      if (!activeKeys.has(key)) {
        layer.removeLayer(entry.marker);
        managed.delete(key);
      }
    }
  }, [stations, selectedFuel, minPrice, favoriteIds, onToggleFavorite, theme, mapZoom]);

  const handleCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 13);
    }
    onCenterUser();
  };

  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const points: [number, number][] = stations.map((s) => [s.lat, s.lng]);
    points.push([userCoords.lat, userCoords.lng]);
    if (isRouteMode && routeDestination) {
      points.push([routeDestination.lat, routeDestination.lng]);
    }
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
  };

  return (
    <div
      data-no-pull-refresh="true"
      className="relative isolate w-full h-[65vh] min-h-[400px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-200 dark:bg-slate-900"
    >
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Action Buttons (isoliert im eigenen Stacking Context, überlagern weder Header noch Modals) */}
      <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-2">
        {stations.length > 0 && (
          <button
            type="button"
            onClick={handleFitAll}
            className="p-2.5 bg-white/95 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center justify-center text-xs font-semibold"
            title="Alle Tankstellen im Sichtfeld anzeigen"
            aria-label="Alle Tankstellen auf der Karte einpassen"
          >
            <Maximize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>
        )}

        <button
          type="button"
          onClick={handleCenter}
          className="p-3 bg-white/95 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          title="Auf meinen Standort zentrieren"
          aria-label="Karte auf meinen Standort zentrieren"
        >
          <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Mein Standort</span>
        </button>
      </div>
    </div>
  );
}

export default MapView;
