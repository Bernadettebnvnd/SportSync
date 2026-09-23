'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Venue, DiscoveredFacility } from '@/types';
import { getSportDisplayName } from '@/lib/utils';
import { defaultGeocodingProvider } from '@/lib/maps/provider';
import {
  MapPin,
  Search,
  Navigation,
  Globe,
  Compass,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Star,
  ArrowRight,
  Crosshair,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type * as LeafletType from 'leaflet';

interface VenueMapProps {
  venues: Venue[];
  discoveredFacilities?: DiscoveredFacility[];
  selectedVenueId?: string;
  selectedDiscoveredId?: string;
  onSelectVenue?: (venue: Venue) => void;
  onSelectDiscovered?: (facility: DiscoveredFacility) => void;
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
}

const OSM_PH_CENTER: [number, number] = [13.02, 121.77];
const OSM_PH_ZOOM = 6;

// Helper to calculate approximate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function VenueMap({
  venues,
  discoveredFacilities = [],
  selectedVenueId,
  selectedDiscoveredId,
  onSelectVenue,
  onSelectDiscovered,
  singleVenueMode = false,
  initialCenter,
  initialZoom,
  heightClass = 'h-[440px] sm:h-[520px]',
  showSearch = true,
}: VenueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markersRef = useRef<{ [key: string]: LeafletType.Marker }>({});
  const searchMarkerRef = useRef<LeafletType.Marker | null>(null);

  // Clicked item override state (when user clicks a marker)
  const [clickedItem, setClickedItem] = useState<
    { type: 'platform'; venue: Venue } | { type: 'discovered'; facility: DiscoveredFacility } | null
  >(null);
  const [activeVenueIndex, setActiveVenueIndex] = useState(0);

  // Search state using OpenStreetMap Nominatim API
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Derive activeItem cleanly without setState in effect
  const activeItem = useMemo(() => {
    if (selectedVenueId) {
      const match = venues.find((v) => v.id === selectedVenueId);
      if (match) return { type: 'platform' as const, venue: match };
    }
    if (selectedDiscoveredId && discoveredFacilities.length > 0) {
      const match = discoveredFacilities.find((f) => f.id === selectedDiscoveredId);
      if (match) return { type: 'discovered' as const, facility: match };
    }
    if (clickedItem) return clickedItem;
    if (venues.length > 0) {
      return { type: 'platform' as const, venue: venues[activeVenueIndex] || venues[0] };
    }
    if (discoveredFacilities.length > 0) {
      return { type: 'discovered' as const, facility: discoveredFacilities[0] };
    }
    return null;
  }, [selectedVenueId, selectedDiscoveredId, clickedItem, venues, discoveredFacilities, activeVenueIndex]);

  const activeItemId = activeItem?.type === 'platform' ? activeItem.venue.id : activeItem?.facility.id;
  const activeItemType = activeItem?.type;

  // Search OpenStreetMap Nominatim via provider
  const searchNominatim = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await defaultGeocodingProvider.search(query);
      setSearchResults(
        results.map((r) => ({
          place_id: Number(r.placeId) || 0,
          lat: String(r.latitude),
          lon: String(r.longitude),
          display_name: r.displayName,
        }))
      );
      setIsSearchOpen(true);
    } catch (err) {
      console.warn('Geocoding search error:', err);
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
      setSearchNotice(null);
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

        if (searchMarkerRef.current) searchMarkerRef.current.remove();

        const searchIcon = L.divIcon({
          html: `
            <div style="
              background: #C87D43;
              color: white;
              padding: 4px 8px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 800;
              display: flex;
              align-items: center;
              gap: 4px;
              box-shadow: 0 4px 14px rgba(200, 125, 67, 0.5);
              border: 2px solid #FAF8F5;
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${result.display_name.split(',')[0]}</span>
            </div>
          `,
          className: 'custom-search-pin',
          iconSize: [120, 28],
          iconAnchor: [60, 14],
        });

        const newMarker = L.marker([lat, lon], { icon: searchIcon }).addTo(map);
        searchMarkerRef.current = newMarker;

        // Find nearest court in venues
        if (venues.length > 0) {
          let nearest = venues[0];
          let minDistance = Infinity;

          venues.forEach((v) => {
            const d = calculateDistance(lat, lon, v.latitude, v.longitude);
            if (d < minDistance) {
              minDistance = d;
              nearest = v;
            }
          });

          const idx = venues.findIndex((v) => v.id === nearest.id);
          if (idx !== -1) {
            setActiveVenueIndex(idx);
            if (onSelectVenue) onSelectVenue(nearest);
          }

          setSearchNotice(`Nearest court: ${nearest.name} (~${Math.round(minDistance)} km)`);
        }

        map.flyTo([lat, lon], 12, { duration: 1.2 });
      });
    }

    setIsSearchOpen(false);
  };

  // Fly to Philippines Overview (6/13.02/121.77)
  const flyToPhilippines = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(OSM_PH_CENTER, OSM_PH_ZOOM, { duration: 1.2 });
    }
  };

  // Locate user via GPS
  const locateUser = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation && mapInstanceRef.current) {
      setIsSearching(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsSearching(false);
          const { latitude, longitude } = pos.coords;
          if (mapInstanceRef.current) {
            import('leaflet').then((L) => {
              if (!mapInstanceRef.current) return;
              if (searchMarkerRef.current) searchMarkerRef.current.remove();

              const myIcon = L.divIcon({
                html: `
                  <div style="
                    background: #1E4A32;
                    color: #E9C46A;
                    padding: 4px 10px;
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 800;
                    box-shadow: 0 4px 14px rgba(30, 74, 50, 0.6);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    white-space: nowrap;
                  ">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>You are here</span>
                  </div>
                `,
                className: 'my-loc-pin',
                iconSize: [100, 26],
                iconAnchor: [50, 13],
              });

              searchMarkerRef.current = L.marker([latitude, longitude], { icon: myIcon }).addTo(
                mapInstanceRef.current
              );
            });

            if (venues.length > 0) {
              let nearest = venues[0];
              let minDist = Infinity;
              venues.forEach((v) => {
                const d = calculateDistance(latitude, longitude, v.latitude, v.longitude);
                if (d < minDist) {
                  minDist = d;
                  nearest = v;
                }
              });
              setSearchNotice(`Found you! Nearest court: ${nearest.name} (~${Math.round(minDist)} km)`);
              const idx = venues.findIndex((v) => v.id === nearest.id);
              if (idx !== -1) {
                setActiveVenueIndex(idx);
                if (onSelectVenue) onSelectVenue(nearest);
              }
            }

            mapInstanceRef.current.flyTo([latitude, longitude], 13, { duration: 1.2 });
          }
        },
        () => {
          setIsSearching(false);
          setSearchNotice('Location permission not granted. Use search bar above.');
          setTimeout(() => setSearchNotice(null), 4000);
        }
      );
    }
  };

  const jumpToRegion = (region: 'manila' | 'visayas' | 'mindanao' | 'luzon') => {
    if (!mapInstanceRef.current) return;
    if (region === 'manila') {
      mapInstanceRef.current.flyTo([14.5828, 121.0664], 12, { duration: 1.0 });
    } else if (region === 'visayas') {
      mapInstanceRef.current.flyTo([10.5, 123.3], 9, { duration: 1.0 });
    } else if (region === 'mindanao') {
      mapInstanceRef.current.flyTo([7.8, 125.1], 9, { duration: 1.0 });
    } else if (region === 'luzon') {
      mapInstanceRef.current.flyTo([15.4, 120.8], 9, { duration: 1.0 });
    }
  };

  // Initialize Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      const container = mapContainerRef.current;

      // Clean up previous instance if already initialized on this container (prevents Error: Map container is already initialized)
      // @ts-expect-error Leaflet attaches _leaflet_id
      if (container._leaflet_id && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      // @ts-expect-error Reset container internal ID
      if (container._leaflet_id) {
        // @ts-expect-error Reset container internal ID
        container._leaflet_id = null;
      }

      // Fix Leaflet marker icons
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const defaultCenter: [number, number] = initialCenter
        ? initialCenter
        : venues.length > 0
        ? [venues[0].latitude, venues[0].longitude]
        : OSM_PH_CENTER;

      const defaultZoom = initialZoom
        ? initialZoom
        : singleVenueMode
        ? 15
        : venues.length > 1
        ? 7
        : venues.length === 1
        ? 13
        : OSM_PH_ZOOM;

      const map = L.map(container, {
        center: defaultCenter,
        zoom: defaultZoom,
        scrollWheelZoom: true,
        zoomControl: false, // We place custom controls cleanly
      });

      // Add custom zoom control at top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // OpenStreetMap standard tile layer with subdomains
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Auto invalidate size on mount
      setTimeout(() => {
        if (isMounted && map) {
          map.invalidateSize();
        }
      }, 150);

      // Sizing observer to automatically recalculate dimensions whenever container is shown or resized
      if (typeof ResizeObserver !== 'undefined' && container) {
        resizeObserver = new ResizeObserver(() => {
          if (isMounted && map) {
            map.invalidateSize();
          }
        });
        resizeObserver.observe(container);
      }

      // Clear existing markers
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};

      // Add pins for platform venues (Green)
      venues.forEach((venue, index) => {
        const primarySport = venue.featured_sports[0] || 'badminton';
        const sportLabel = getSportDisplayName(primarySport);
        const isSelected = activeItem?.type === 'platform' && activeItem.venue.id === venue.id;

        const customHtml = `
          <div style="
            background: ${isSelected ? '#1E4A32' : '#2D724E'};
            color: white;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: 0 4px 14px rgba(30, 74, 50, ${isSelected ? '0.65' : '0.4'});
            border: 2px solid ${isSelected ? '#E9C46A' : '#FAF8F5'};
            cursor: pointer;
            white-space: nowrap;
            transform: scale(${isSelected ? '1.08' : '1'});
            transition: all 0.2s ease;
          ">
            <span style="color: #E9C46A; font-size: 13px; line-height: 1;">&bull;</span>
            <span>${venue.name.split(' ')[0]}</span>
            <span style="opacity: 0.85; font-size: 9px; font-weight: 700; background: rgba(0,0,0,0.25); padding: 1px 4px; border-radius: 4px;">${sportLabel}</span>
          </div>
        `;

        const icon = L.divIcon({
          html: customHtml,
          className: 'custom-venue-pin',
          iconSize: [110, 28],
          iconAnchor: [55, 14],
        });

        const marker = L.marker([venue.latitude, venue.longitude], { icon }).addTo(map);

        marker.on('click', () => {
          setActiveVenueIndex(index);
          setClickedItem({ type: 'platform', venue });
          if (onSelectVenue) onSelectVenue(venue);
          map.flyTo([venue.latitude, venue.longitude], 14, { duration: 0.8 });
        });

        markersRef.current[venue.id] = marker;
      });

      // Add pins for map-discovered facilities (Slate)
      discoveredFacilities.forEach((facility) => {
        const isSelected = activeItem?.type === 'discovered' && activeItem.facility.id === facility.id;
        const customHtml = `
          <div style="
            background: ${isSelected ? '#0F172A' : '#334155'};
            color: white;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 3px 10px rgba(15, 23, 42, ${isSelected ? '0.6' : '0.35'});
            border: 2px solid ${isSelected ? '#38BDF8' : '#FAF8F5'};
            cursor: pointer;
            white-space: nowrap;
            transform: scale(${isSelected ? '1.08' : '1'});
            transition: all 0.2s ease;
          ">
            <span style="color: #38BDF8; font-size: 11px; line-height: 1;">&bull;</span>
            <span>${facility.name.split(' ')[0]}</span>
            <span style="opacity: 0.85; font-size: 8px; font-weight: 700; background: rgba(0,0,0,0.3); padding: 1px 3px; border-radius: 3px;">MAP</span>
          </div>
        `;

        const icon = L.divIcon({
          html: customHtml,
          className: 'custom-discovered-pin',
          iconSize: [100, 26],
          iconAnchor: [50, 13],
        });

        const marker = L.marker([facility.latitude, facility.longitude], { icon }).addTo(map);

        marker.on('click', () => {
          setClickedItem({ type: 'discovered', facility });
          if (onSelectDiscovered) onSelectDiscovered(facility);
          map.flyTo([facility.latitude, facility.longitude], 14, { duration: 0.8 });
        });

        markersRef.current[facility.id] = marker;
      });

      // Fit bounds across all points if multiple locations and no specific center provided
      const allPoints: [number, number][] = [
        ...venues.map((v) => [v.latitude, v.longitude] as [number, number]),
        ...discoveredFacilities.map((d) => [d.latitude, d.longitude] as [number, number]),
      ];
      if (!initialCenter && allPoints.length > 1) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
      }
    });

    return () => {
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [
    venues,
    discoveredFacilities,
    initialCenter,
    initialZoom,
    singleVenueMode,
    selectedVenueId,
    selectedDiscoveredId,
    onSelectVenue,
    onSelectDiscovered,
    activeItemId,
    activeItemType,
  ]);

  // Fit all active venues & discovered courts on map
  const fitAllCourts = useCallback(() => {
    if (mapInstanceRef.current && (venues.length > 0 || discoveredFacilities.length > 0)) {
      import('leaflet').then((L) => {
        if (!mapInstanceRef.current) return;
        const all = [
          ...venues.map((v) => [v.latitude, v.longitude] as [number, number]),
          ...discoveredFacilities.map((d) => [d.latitude, d.longitude] as [number, number]),
        ];
        if (all.length === 1) {
          mapInstanceRef.current.flyTo(all[0], 15, { duration: 1.0 });
        } else if (all.length > 1) {
          const bounds = L.latLngBounds(all);
          mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      });
    }
  }, [venues, discoveredFacilities]);

  // Navigate next/prev court result
  const handleNextVenue = () => {
    if (venues.length === 0) return;
    const nextIdx = (activeVenueIndex + 1) % venues.length;
    setActiveVenueIndex(nextIdx);
    const target = venues[nextIdx];
    if (target && mapInstanceRef.current) {
      setClickedItem({ type: 'platform', venue: target });
      if (onSelectVenue) onSelectVenue(target);
      mapInstanceRef.current.flyTo([target.latitude, target.longitude], 14, { duration: 0.8 });
    }
  };

  const handlePrevVenue = () => {
    if (venues.length === 0) return;
    const prevIdx = (activeVenueIndex - 1 + venues.length) % venues.length;
    setActiveVenueIndex(prevIdx);
    const target = venues[prevIdx];
    if (target && mapInstanceRef.current) {
      setClickedItem({ type: 'platform', venue: target });
      if (onSelectVenue) onSelectVenue(target);
      mapInstanceRef.current.flyTo([target.latitude, target.longitude], 14, { duration: 0.8 });
    }
  };

  return (
    <div
      className={`relative w-full ${heightClass} rounded-3xl overflow-hidden border border-[#E8E5DF] shadow-sm bg-white`}
    >
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Top Map Bar: OpenStreetMap Search + Quick View Switchers */}
      <div className="absolute top-2.5 left-2.5 right-14 z-20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pointer-events-none">
        {/* OpenStreetMap Nominatim Search Box */}
        {showSearch && !singleVenueMode && (
          <div className="pointer-events-auto relative flex-1 max-w-xs sm:max-w-sm">
            <div className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl border border-[#E8E5DF] shadow-md px-3 py-1.5 focus-within:border-[#2D724E] transition-all">
              <Search className="w-3.5 h-3.5 text-[#65756B] shrink-0 mr-1.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search city/place in PH (via OSM)..."
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
                    setSearchNotice(null);
                    if (searchMarkerRef.current) searchMarkerRef.current.remove();
                  }}
                  className="text-[#65756B] hover:text-[#1A241E] ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white rounded-2xl border border-[#E8E5DF] shadow-lg overflow-hidden z-30 max-h-48 overflow-y-auto">
                <div className="px-3 py-1 bg-[#FAF8F5] border-b border-[#E8E5DF] text-[9px] font-bold text-[#65756B] uppercase tracking-wider flex justify-between">
                  <span>OpenStreetMap Locations</span>
                  <span className="text-[#2D724E]">PH</span>
                </div>
                {searchResults.map((res) => (
                  <button
                    key={res.place_id}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#EBF4EE] border-b border-[#E8E5DF]/40 last:border-none transition-colors flex items-start gap-1.5"
                  >
                    <MapPin className="w-3 h-3 text-[#2D724E] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#1A241E] text-[11px] truncate">
                        {res.display_name.split(',')[0]}
                      </div>
                      <div className="text-[9px] text-[#65756B] truncate">{res.display_name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick View Controls */}
        {!singleVenueMode && (
          <div className="pointer-events-auto flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 no-scrollbar self-start">
            <button
              type="button"
              onClick={locateUser}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#1E4A32] text-white border border-[#1E4A32] text-[10px] font-extrabold shadow-sm shrink-0 active:scale-95"
              title="Locate nearest court near you"
            >
              <Crosshair className="w-3 h-3 text-[#E9C46A]" />
              <span>Near Me</span>
            </button>
            <button
              type="button"
              onClick={fitAllCourts}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-[#E8E5DF] text-[10px] font-extrabold text-[#1A241E] hover:bg-[#FAF8F5] shadow-sm shrink-0"
              title="Show all courts on map"
            >
              <Compass className="w-3 h-3 text-[#2D724E]" />
              <span>All ({venues.length})</span>
            </button>
            <button
              type="button"
              onClick={() => jumpToRegion('manila')}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-[#E8E5DF] text-[10px] font-extrabold text-[#1A241E] hover:bg-[#FAF8F5] shadow-sm shrink-0"
            >
              <span>Manila</span>
            </button>
            <button
              type="button"
              onClick={() => jumpToRegion('visayas')}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-[#E8E5DF] text-[10px] font-extrabold text-[#1A241E] hover:bg-[#FAF8F5] shadow-sm shrink-0"
            >
              <span>Visayas</span>
            </button>
            <button
              type="button"
              onClick={() => jumpToRegion('mindanao')}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-[#E8E5DF] text-[10px] font-extrabold text-[#1A241E] hover:bg-[#FAF8F5] shadow-sm shrink-0"
            >
              <span>Mindanao</span>
            </button>
            <button
              type="button"
              onClick={() => jumpToRegion('luzon')}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-[#E8E5DF] text-[10px] font-extrabold text-[#1A241E] hover:bg-[#FAF8F5] shadow-sm shrink-0"
            >
              <span>Luzon</span>
            </button>
            <button
              type="button"
              onClick={flyToPhilippines}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md border border-[#E8E5DF] text-[10px] font-extrabold text-[#1A241E] hover:bg-[#FAF8F5] shadow-sm shrink-0"
              title="Zoom to OpenStreetMap Philippines view"
            >
              <Globe className="w-3 h-3 text-[#C87D43]" />
              <span>PH</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Result Distance Notice */}
      {searchNotice && (
        <div className="absolute top-14 left-2.5 z-20 bg-[#1E4A32] text-white px-3 py-1 rounded-xl shadow-md text-[11px] font-bold flex items-center gap-1.5 animate-fadeIn">
          <MapPin className="w-3 h-3 text-[#E9C46A]" />
          <span>{searchNotice}</span>
        </div>
      )}

      {/* Interactive Court Result Card Overlay (Platform Venue or Discovered Facility) */}
      {!singleVenueMode && activeItem && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E8E5DF] shadow-lg p-3 sm:p-4 max-w-xl mx-auto transition-all">
            {activeItem.type === 'platform' ? (
              <div className="flex items-center justify-between gap-3">
                {/* Venue thumbnail */}
                {activeItem.venue.images && activeItem.venue.images[0] && (
                  <img
                    src={activeItem.venue.images[0]}
                    alt={activeItem.venue.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-[#E8E5DF]"
                  />
                )}

                {/* Court Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-extrabold text-[#2D724E] bg-[#EBF4EE] px-2 py-0.5 rounded-md">
                      {getSportDisplayName(activeItem.venue.featured_sports[0] || 'badminton')}
                    </span>
                    <span className="text-[10px] font-bold text-[#1E4A32] bg-[#E9C46A]/20 px-1.5 py-0.5 rounded-md">
                      Available on Matchi
                    </span>
                    {typeof activeItem.venue.rating === 'number' && activeItem.venue.review_count > 0 ? (
                      <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#C87D43] ml-auto">
                        <Star className="w-3 h-3 fill-[#E9C46A] text-[#E9C46A]" />
                        <span>{activeItem.venue.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-[#2D724E] ml-auto">Verified</span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-black text-[#1A241E] truncate mt-1">
                    {activeItem.venue.name}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-[#65756B] truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#2D724E] shrink-0" />
                    <span>{activeItem.venue.address}</span>
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    <Link
                      href={`/venues/${activeItem.venue.id}`}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all"
                    >
                      <span>Book</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${activeItem.venue.latitude}&mlon=${activeItem.venue.longitude}#map=16/${activeItem.venue.latitude}/${activeItem.venue.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-[#E8E5DF] text-[11px] font-bold text-[#2D724E] hover:bg-[#FAF8F5]"
                    >
                      <Navigation className="w-3 h-3" />
                      <span className="hidden sm:inline">OSM</span>
                    </a>

                    {/* Carousel Stepper */}
                    {venues.length > 1 && (
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          type="button"
                          onClick={handlePrevVenue}
                          className="p-1 rounded-lg bg-[#FAF8F5] border border-[#E8E5DF] text-[#1A241E] hover:bg-[#E8E5DF]"
                          title="Previous court"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-[#65756B]">
                          {activeVenueIndex + 1}/{venues.length}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextVenue}
                          className="p-1 rounded-lg bg-[#FAF8F5] border border-[#E8E5DF] text-[#1A241E] hover:bg-[#E8E5DF]"
                          title="Next court"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-extrabold text-[#334155] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                      {getSportDisplayName(activeItem.facility.sport)}
                    </span>
                    <span className="text-[10px] font-bold text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-1.5 py-0.5 rounded-md">
                      External Location (Discovered on Map)
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-black text-[#1A241E] truncate mt-1">
                    {activeItem.facility.name}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-[#65756B] truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#64748B] shrink-0" />
                    <span>{activeItem.facility.address}</span>
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeItem.facility.latitude},${activeItem.facility.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-black shadow-sm transition-all"
                    >
                      <Navigation className="w-3 h-3 text-[#38BDF8]" />
                      <span>Directions</span>
                    </a>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${activeItem.facility.latitude}&mlon=${activeItem.facility.longitude}#map=16/${activeItem.facility.latitude}/${activeItem.facility.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-[#E8E5DF] text-[11px] font-bold text-[#64748B] hover:bg-[#FAF8F5]"
                    >
                      <Globe className="w-3 h-3" />
                      <span className="hidden sm:inline">OSM</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setClickedItem(null)}
                      className="ml-auto text-[11px] text-[#64748B] hover:text-[#1A241E] font-bold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
