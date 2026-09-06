'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Venue } from '@/types';
import { getSportDisplayName, formatCurrency } from '@/lib/utils';
import {
  MapPin,
  ExternalLink,
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
  selectedVenueId,
  onSelectVenue,
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

  // Active highlighted venue for map results card
  const [activeVenueIndex, setActiveVenueIndex] = useState(0);

  // Search state using OpenStreetMap Nominatim API
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Active venue resolved
  const currentVenue =
    venues.find((v) => v.id === selectedVenueId) || venues[activeVenueIndex] || venues[0];

  // Search OpenStreetMap Nominatim
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
              <span>📍</span>
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
                    border: 2px solid #E9C46A;
                    white-space: nowrap;
                  ">
                    📍 You are here
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

  // Fit all active venues on map
  const fitAllCourts = useCallback(() => {
    if (mapInstanceRef.current && venues.length > 0) {
      import('leaflet').then((L) => {
        if (!mapInstanceRef.current) return;
        if (venues.length === 1) {
          mapInstanceRef.current.flyTo([venues[0].latitude, venues[0].longitude], 15, {
            duration: 1.0,
          });
        } else {
          const bounds = L.latLngBounds(venues.map((v) => [v.latitude, v.longitude]));
          mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      });
    }
  }, [venues]);

  // Initialize Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix Leaflet marker icons
      // @ts-expect-error leaflet icon prototype
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
          : OSM_PH_CENTER;

        const defaultZoom = initialZoom
          ? initialZoom
          : singleVenueMode
          ? 15
          : venues.length > 1
          ? 7
          : 12;

        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          scrollWheelZoom: true,
          zoomControl: false, // We place custom controls cleanly
        });

        // Add custom zoom control at top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // OpenStreetMap standard tile layer
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Auto invalidate size on resize
        setTimeout(() => {
          map.invalidateSize();
        }, 150);
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};

      // Add pins for each venue
      venues.forEach((venue, index) => {
        const primarySport = venue.featured_sports[0] || 'badminton';
        const sportLabel = getSportDisplayName(primarySport);
        const isSelected = venue.id === (selectedVenueId || currentVenue?.id);

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
          if (onSelectVenue) onSelectVenue(venue);
          map.flyTo([venue.latitude, venue.longitude], 14, { duration: 0.8 });
        });

        markersRef.current[venue.id] = marker;
      });

      // Fit bounds if multiple venues and no specific center provided
      if (!initialCenter && venues.length > 1) {
        const bounds = L.latLngBounds(venues.map((v) => [v.latitude, v.longitude]));
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [venues, initialCenter, initialZoom, singleVenueMode, selectedVenueId, onSelectVenue, currentVenue?.id]);

  // Navigate next/prev court result
  const handleNextVenue = () => {
    if (venues.length === 0) return;
    const nextIdx = (activeVenueIndex + 1) % venues.length;
    setActiveVenueIndex(nextIdx);
    const target = venues[nextIdx];
    if (target && mapInstanceRef.current) {
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

      {/* Interactive Court Result Card Overlay (Google Maps / Airbnb style) */}
      {!singleVenueMode && currentVenue && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#E8E5DF] shadow-lg p-3 sm:p-4 max-w-xl mx-auto transition-all">
            <div className="flex items-center justify-between gap-3">
              {/* Venue thumbnail */}
              {currentVenue.images && currentVenue.images[0] && (
                <img
                  src={currentVenue.images[0]}
                  alt={currentVenue.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-[#E8E5DF]"
                />
              )}

              {/* Court Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold text-[#2D724E] bg-[#EBF4EE] px-2 py-0.5 rounded-md">
                    {getSportDisplayName(currentVenue.featured_sports[0] || 'badminton')}
                  </span>
                  <span className="text-[10px] font-bold text-[#A35C2B] bg-[#FBF0E6] px-1.5 py-0.5 rounded-md">
                    Doubles &amp; Singles
                  </span>
                  <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#C87D43] ml-auto">
                    <Star className="w-3 h-3 fill-[#E9C46A] text-[#E9C46A]" />
                    <span>{currentVenue.rating}</span>
                  </div>
                </div>

                <h4 className="text-xs sm:text-sm font-black text-[#1A241E] truncate mt-1">
                  {currentVenue.name}
                </h4>
                <p className="text-[10px] sm:text-[11px] text-[#65756B] truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#2D724E] shrink-0" />
                  <span>{currentVenue.address}</span>
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2">
                  <Link
                    href={`/venues/${currentVenue.id}`}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all"
                  >
                    <span>Book Court</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${currentVenue.latitude}&mlon=${currentVenue.longitude}#map=16/${currentVenue.latitude}/${currentVenue.longitude}`}
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
          </div>
        </div>
      )}
    </div>
  );
}
