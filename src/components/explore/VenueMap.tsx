'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Venue } from '@/types';
import { getSportDisplayName } from '@/lib/utils';
import {
  MapPin,
  ExternalLink,
  Search,
  Navigation,
  Globe,
  Compass,
  X,
  Loader2,
} from 'lucide-react';
import type * as LeafletType from 'leaflet';

interface VenueMapProps {
  venues: Venue[];
  selectedVenueId?: string;
  onSelectVenue?: (venue: Venue) => void;
  singleVenueMode?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
  heightClass?: string;
  showSearch?: boolean;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}

// OpenStreetMap Philippines reference view from user request
const OSM_PH_CENTER: [number, number] = [13.02, 121.77];
const OSM_PH_ZOOM = 6;
const METRO_MANILA_CENTER: [number, number] = [14.5828, 121.0664];
const METRO_MANILA_ZOOM = 12;

export function VenueMap({
  venues,
  selectedVenueId,
  onSelectVenue,
  singleVenueMode = false,
  initialCenter,
  initialZoom,
  heightClass = 'h-[400px] sm:h-[480px]',
  showSearch = true,
}: VenueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markersRef = useRef<{ [key: string]: LeafletType.Marker }>({});
  const searchMarkerRef = useRef<LeafletType.Marker | null>(null);

  // Search state using OpenStreetMap Nominatim API
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeView, setActiveView] = useState<'hubs' | 'philippines'>('hubs');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Function to search OpenStreetMap Nominatim
  const searchNominatim = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query.trim()
        )}&countrycodes=ph&limit=5`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      if (!response.ok) throw new Error('OSM Nominatim error');
      const data: NominatimResult[] = await response.json();
      setSearchResults(data);
      setIsSearchOpen(true);
    } catch (err) {
      console.warn('OpenStreetMap Nominatim search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      searchNominatim(val);
    }, 400);
  };

  const handleSelectSearchResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (mapInstanceRef.current && !isNaN(lat) && !isNaN(lon)) {
      import('leaflet').then((L) => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        // Remove previous search marker
        if (searchMarkerRef.current) {
          searchMarkerRef.current.remove();
        }

        // Add pin for search result
        const searchIcon = L.divIcon({
          html: `
            <div style="
              background: #C87D43;
              color: white;
              padding: 5px 10px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 800;
              display: flex;
              align-items: center;
              gap: 4px;
              box-shadow: 0 4px 14px rgba(200, 125, 67, 0.5);
              border: 2px solid #FAF8F5;
              cursor: pointer;
            ">
              <span>📍</span>
              <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${result.display_name.split(',')[0]}</span>
            </div>
          `,
          className: 'custom-search-pin',
          iconSize: [120, 30],
          iconAnchor: [60, 15],
        });

        const newMarker = L.marker([lat, lon], { icon: searchIcon }).addTo(map);
        newMarker
          .bindPopup(
            `
            <div style="font-family: inherit; padding: 4px;">
              <strong style="font-size: 12px; color: #1A241E;">${result.display_name.split(',')[0]}</strong>
              <p style="font-size: 10px; color: #65756B; margin: 4px 0 6px;">${result.display_name}</p>
              <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}" target="_blank" rel="noopener noreferrer" style="
                color: #2D724E;
                font-size: 10px;
                font-weight: 700;
                text-decoration: underline;
              ">View on OpenStreetMap &nearr;</a>
            </div>
          `
          )
          .openPopup();

        searchMarkerRef.current = newMarker;
        map.flyTo([lat, lon], 14, { duration: 1.2 });
      });
    }

    setIsSearchOpen(false);
  };

  // Fly to Philippines Overview (OSM link: 6/13.02/121.77)
  const flyToPhilippines = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(OSM_PH_CENTER, OSM_PH_ZOOM, { duration: 1.5 });
      setActiveView('philippines');
    }
  };

  // Reset to Metro Manila Sports Hubs
  const flyToHubs = () => {
    if (mapInstanceRef.current) {
      const center = initialCenter || (venues.length > 0 ? [venues[0].latitude, venues[0].longitude] : METRO_MANILA_CENTER);
      const zoom = initialZoom || (singleVenueMode ? 15 : METRO_MANILA_ZOOM);
      mapInstanceRef.current.flyTo(center as [number, number], zoom, { duration: 1.2 });
      setActiveView('hubs');
    }
  };

  // Initialize Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix default Leaflet icon paths
      // @ts-expect-error leaflet icon prototype fix
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        const defaultCenter: [number, number] = initialCenter
          ? initialCenter
          : venues.length > 0
          ? [venues[0].latitude, venues[0].longitude]
          : METRO_MANILA_CENTER;

        const defaultZoom = initialZoom
          ? initialZoom
          : singleVenueMode
          ? 15
          : METRO_MANILA_ZOOM;

        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          scrollWheelZoom: true,
          zoomControl: true,
        });

        // OpenStreetMap standard tile layer
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Invalidate size on container resize
        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      }

      const map = mapInstanceRef.current;

      // Clear previous venue markers
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};

      // Add venue markers with clean Tarzan-inspired styling (no emojis)
      venues.forEach((venue) => {
        const primarySport = venue.featured_sports[0] || 'badminton';
        const sportLabel = getSportDisplayName(primarySport);

        const customHtml = `
          <div style="
            background: #2D724E;
            color: white;
            padding: 5px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 4px 14px rgba(30, 74, 50, 0.45);
            border: 2px solid #FAF8F5;
            cursor: pointer;
            white-space: nowrap;
            transition: transform 0.2s ease;
          ">
            <span style="color: #E9C46A; font-size: 14px; line-height: 1;">&bull;</span>
            <span>${venue.name.split(' ')[0]}</span>
            <span style="opacity: 0.85; font-size: 9px; font-weight: 700; background: rgba(0,0,0,0.25); padding: 1px 5px; border-radius: 4px;">${sportLabel}</span>
          </div>
        `;

        const icon = L.divIcon({
          html: customHtml,
          className: 'custom-venue-pin',
          iconSize: [110, 32],
          iconAnchor: [55, 16],
        });

        const marker = L.marker([venue.latitude, venue.longitude], { icon }).addTo(map);

        // OpenStreetMap direct link & directions
        const osmUrl = `https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}#map=16/${venue.latitude}/${venue.longitude}`;
        const osmDirectionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${venue.latitude}%2C${venue.longitude}`;

        const popupContent = document.createElement('div');
        popupContent.className = 'p-2 max-w-[260px] font-sans';
        popupContent.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 800; color: #2D724E; background: #EBF4EE; padding: 2px 6px; border-radius: 6px;">
              ${sportLabel} &bull; Doubles &amp; Singles
            </span>
            <span style="color: #C87D43; font-weight: 800; font-size: 11px;">★ ${venue.rating}</span>
          </div>
          <h4 style="font-weight: 800; font-size: 13px; line-height: 1.3; margin-bottom: 3px; color: #1A241E;">${venue.name}</h4>
          <p style="font-size: 10.5px; color: #65756B; margin-bottom: 8px; line-height: 1.3;">${venue.address}</p>
          
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <a href="/venues/${venue.id}" style="
              display: block;
              background: #2D724E;
              color: white;
              padding: 7px 10px;
              border-radius: 8px;
              font-size: 11px;
              font-weight: 800;
              text-align: center;
              text-decoration: none;
            ">Book Court &amp; Join Queue &rarr;</a>

            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding-top: 4px; border-top: 1px solid #E8E5DF;">
              <a href="${osmUrl}" target="_blank" rel="noopener noreferrer" style="
                font-size: 10px;
                color: #2D724E;
                font-weight: 700;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 2px;
              ">OpenStreetMap &nearr;</a>
              <a href="${osmDirectionsUrl}" target="_blank" rel="noopener noreferrer" style="
                font-size: 10px;
                color: #C87D43;
                font-weight: 700;
                text-decoration: none;
              ">Directions &rarr;</a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onSelectVenue) onSelectVenue(venue);
        });

        markersRef.current[venue.id] = marker;

        // If single venue mode, automatically open popup
        if (singleVenueMode && venues.length === 1) {
          setTimeout(() => {
            marker.openPopup();
          }, 300);
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [venues, onSelectVenue, initialCenter, initialZoom, singleVenueMode]);

  // Handle selectedVenueId changes from parent
  useEffect(() => {
    if (selectedVenueId && mapInstanceRef.current && markersRef.current[selectedVenueId]) {
      const venue = venues.find((v) => v.id === selectedVenueId);
      if (venue) {
        mapInstanceRef.current.flyTo([venue.latitude, venue.longitude], 15, { duration: 1.2 });
        markersRef.current[selectedVenueId].openPopup();
      }
    }
  }, [selectedVenueId, venues]);

  return (
    <div
      className={`relative w-full ${heightClass} rounded-3xl overflow-hidden border border-[#E8E5DF] shadow-sm bg-white`}
    >
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Top Left: OpenStreetMap Nominatim Place Search (if enabled) */}
      {showSearch && !singleVenueMode && (
        <div className="absolute top-3 left-3 z-20 max-w-[260px] sm:max-w-[320px] w-full">
          <div className="relative">
            <div className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl border border-[#E8E5DF] shadow-md px-3 py-1.5 focus-within:border-[#2D724E] transition-all">
              <Search className="w-3.5 h-3.5 text-[#65756B] shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search places in PH (via OSM)..."
                className="w-full bg-transparent text-xs text-[#1A241E] placeholder:text-[#65756B] focus:outline-none"
              />
              {isSearching && <Loader2 className="w-3.5 h-3.5 text-[#2D724E] animate-spin shrink-0 ml-1" />}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchOpen(false);
                    if (searchMarkerRef.current) searchMarkerRef.current.remove();
                  }}
                  className="text-[#65756B] hover:text-[#1A241E] ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Nominatim Search Dropdown Results */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white rounded-2xl border border-[#E8E5DF] shadow-lg overflow-hidden z-30 max-h-56 overflow-y-auto">
                <div className="px-3 py-1.5 bg-[#FAF8F5] border-b border-[#E8E5DF] text-[10px] font-bold text-[#65756B] uppercase tracking-wider flex items-center justify-between">
                  <span>OpenStreetMap Locations</span>
                  <span className="text-[9px] text-[#2D724E]">PH Nominatim</span>
                </div>
                {searchResults.map((res) => (
                  <button
                    key={res.place_id}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#EBF4EE] border-b border-[#E8E5DF]/50 last:border-none transition-colors flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#2D724E] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#1A241E] truncate">
                        {res.display_name.split(',')[0]}
                      </div>
                      <div className="text-[10px] text-[#65756B] truncate">
                        {res.display_name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Right: OpenStreetMap Quick Presets & OSM External Link */}
      <div className="absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-1.5">
        {/* OpenStreetMap Philippines 6/13.02/121.77 Preset */}
        <button
          type="button"
          onClick={flyToPhilippines}
          title="Zoom to OpenStreetMap Philippines View (6/13.02/121.77)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm backdrop-blur-md transition-all ${
            activeView === 'philippines'
              ? 'bg-[#1E4A32] text-white border-[#1E4A32]'
              : 'bg-white/95 text-[#1A241E] border-[#E8E5DF] hover:bg-[#FAF8F5]'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-[#E9C46A]" />
          <span className="hidden sm:inline">Philippines</span> (OSM)
        </button>

        {/* Hubs / Manila Reset */}
        <button
          type="button"
          onClick={flyToHubs}
          title="Reset to Sports Hubs"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm backdrop-blur-md transition-all ${
            activeView === 'hubs'
              ? 'bg-[#2D724E] text-white border-[#2D724E]'
              : 'bg-white/95 text-[#1A241E] border-[#E8E5DF] hover:bg-[#FAF8F5]'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-[#E9C46A]" />
          <span>Hubs</span>
        </button>

        {/* Direct OpenStreetMap Link */}
        <a
          href="https://www.openstreetmap.org/#map=6/13.02/121.77"
          target="_blank"
          rel="noopener noreferrer"
          title="Open in OpenStreetMap.org"
          className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#E8E5DF] shadow-sm text-[11px] font-extrabold text-[#2D724E] hover:text-[#1E4A32] hover:bg-[#FAF8F5] transition-colors"
        >
          <Navigation className="w-3 h-3 text-[#2D724E]" />
          <span className="hidden md:inline">OpenStreetMap</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Bottom Left Badge: Venue Count & OpenStreetMap Engine Notice */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl border border-[#E8E5DF] shadow-sm text-[10px] font-bold text-[#1A241E] flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-[#2D724E] animate-pulse" />
        <span>
          {singleVenueMode
            ? 'Court Location on OpenStreetMap'
            : `${venues.length} Active Sports Hubs on OpenStreetMap`}
        </span>
      </div>
    </div>
  );
}
