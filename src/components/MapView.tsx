import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Coordinates, FuelType, Station } from '../types';
import {
  escapeHtml,
  formatAddress,
  formatPrice,
  formatPriceParts,
  getFuelPrice,
  openNavigation,
} from '../utils/formatters';
import { Navigation, Maximize2 } from 'lucide-react';

interface MapViewProps {
  stations: Station[];
  userCoords: Coordinates;
  selectedFuel: FuelType;
  minPrice: number | null;
  onCenterUser: () => void;
  favoriteIds?: string[];
  onToggleFavorite?: (stationId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  stations,
  userCoords,
  selectedFuel,
  minPrice,
  onCenterUser,
  favoriteIds = [],
  onToggleFavorite,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const initialCenterRef = useRef<[number, number]>([userCoords.lat, userCoords.lng]);
  const prevCoordsRef = useRef<[number, number]>([userCoords.lat, userCoords.lng]);
  const openPopupStationIdRef = useRef<string | null>(null);

  // Initialisiere Leaflet-Karte
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: initialCenterRef.current,
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

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
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #3b82f6; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
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
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], mapInstanceRef.current.getZoom());
      prevCoordsRef.current = [userCoords.lat, userCoords.lng];
    }
  }, [userCoords.lat, userCoords.lng]);

  // Stationen-Marker und Popups sicher über DOM-Knoten rendern
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const layer = markersLayerRef.current;
    layer.clearLayers();

    stations.forEach((station) => {
      const isFav = favoriteIds.includes(station.id);
      const price = getFuelPrice(station, selectedFuel);
      const priceParts = formatPriceParts(price);
      const isCheapest =
        price !== null && minPrice !== null && Math.abs(price - minPrice) < 0.0005;

      const priceHtml = priceParts
        ? `${priceParts.main}<sup style="font-size: 9px; margin-left: 1px;">${priceParts.tenth}</sup>€`
        : 'k.A.';
      const badgeBg = isCheapest ? '#10b981' : station.isOpen ? '#1e293b' : '#64748b';
      const badgeBorder = isFav ? '#f59e0b' : isCheapest ? '#34d399' : '#475569';
      const safeLabel = escapeHtml(
        (station.brand || station.name.split(' ')[0] || 'Tankstelle').slice(0, 10)
      );

      const customIcon = L.divIcon({
        className: 'price-marker',
        html: `
          <div style="
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
            gap: 3.5px;
          ">
            ${isFav ? '<span style="color: #f59e0b; font-size: 12px; line-height: 1;">★</span>' : ''}
            <span>${safeLabel}</span>
            <span style="background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 4px; color: ${isCheapest ? '#a7f3d0' : '#38bdf8'}">${priceHtml}</span>
          </div>
        `,
        iconSize: [isFav ? 96 : 88, 26],
        iconAnchor: [isFav ? 48 : 44, 13],
      });

      const popupEl = document.createElement('div');
      popupEl.style.fontFamily = '-apple-system, sans-serif';
      popupEl.style.minWidth = '195px';
      popupEl.style.padding = '2px';

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
        starSpan.style.color = '#f59e0b';
        titleRow.appendChild(starSpan);
      }
      popupEl.appendChild(titleRow);

      const addrDiv = document.createElement('div');
      addrDiv.style.fontSize = '11px';
      addrDiv.style.opacity = '0.72';
      addrDiv.style.marginBottom = '6px';
      addrDiv.textContent = `${formatAddress(
        station.street,
        station.houseNumber,
        station.place
      )} (${station.dist.toFixed(1).replace('.', ',')} km)`;
      popupEl.appendChild(addrDiv);

      const priceBox = document.createElement('div');
      priceBox.style.display = 'flex';
      priceBox.style.justifyContent = 'space-between';
      priceBox.style.alignItems = 'center';
      priceBox.style.marginBottom = '8px';
      priceBox.style.background = 'rgba(148, 163, 184, 0.16)';
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
      priceVal.style.color = isCheapest ? '#10b981' : '#0284c7';
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
      favBtn.style.background = isFav ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.16)';
      favBtn.style.color = '#d97706';
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
        openPopupStationIdRef.current = station.id;
        if (onToggleFavorite) onToggleFavorite(station.id);
      });

      const routeBtn = document.createElement('button');
      routeBtn.type = 'button';
      routeBtn.style.flex = '1';
      routeBtn.style.background = '#2563eb';
      routeBtn.style.color = 'white';
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

      const marker = L.marker([station.lat, station.lng], { icon: customIcon })
        .addTo(layer)
        .bindPopup(popupEl);

      marker.on('popupopen', () => {
        openPopupStationIdRef.current = station.id;
      });
      marker.on('popupclose', () => {
        if (openPopupStationIdRef.current === station.id) {
          openPopupStationIdRef.current = null;
        }
      });

      if (openPopupStationIdRef.current === station.id) {
        marker.openPopup();
      }
    });
  }, [stations, selectedFuel, minPrice, favoriteIds, onToggleFavorite]);

  const handleCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 13);
    }
    onCenterUser();
  };

  const handleFitAll = () => {
    if (!mapInstanceRef.current || stations.length === 0) return;
    const bounds = L.latLngBounds(stations.map((s) => [s.lat, s.lng]));
    bounds.extend([userCoords.lat, userCoords.lng]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
  };

  return (
    <div
      data-no-pull-refresh="true"
      className="relative w-full h-[65vh] min-h-[400px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-200 dark:bg-slate-900"
    >
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Action Buttons */}
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
};
