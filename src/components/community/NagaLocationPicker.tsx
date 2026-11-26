'use client';

import React, { useEffect, useRef, useState } from 'react';
import type * as LeafletType from 'leaflet';
import {
  AlertCircle,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Search,
  X,
} from 'lucide-react';

export interface NagaLandmark {
  id: string;
  name: string;
  shortName: string;
  barangay: string;
  coordinates: [number, number];
  sports: string[];
}

export interface LocationSuggestionItem {
  id: string;
  title: string;
  subtitle: string;
  coordinates: [number, number];
  isLandmark?: boolean;
}

export const NAGA_CITY_CENTER: [number, number] = [13.6218, 123.1948];

// Pilot bounding box for Naga City, Camarines Sur
export const NAGA_CITY_BOUNDS = {
  minLat: 13.575,
  maxLat: 13.685,
  minLng: 123.14,
  maxLng: 123.27,
} as const;

export const NAGA_LEAFLET_BOUNDS: [[number, number], [number, number]] = [
  [NAGA_CITY_BOUNDS.minLat, NAGA_CITY_BOUNDS.minLng],
  [NAGA_CITY_BOUNDS.maxLat, NAGA_CITY_BOUNDS.maxLng],
];

export function isWithinNagaCity(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= NAGA_CITY_BOUNDS.minLat &&
    lat <= NAGA_CITY_BOUNDS.maxLat &&
    lng >= NAGA_CITY_BOUNDS.minLng &&
    lng <= NAGA_CITY_BOUNDS.maxLng
  );
}

export const NAGA_SPORTS_VENUES: NagaLandmark[] = [
  {
    id: 'naga_civic_center',
    name: 'Jesse M. Robredo Coliseum, Naga City',
    shortName: 'Robredo Coliseum',
    barangay: 'Triangulo',
    coordinates: [13.6194, 123.1904],
    sports: ['Basketball', 'Volleyball', 'Badminton'],
  },
  {
    id: 'metro_naga_sports',
    name: 'Metro Naga Sports Complex, Pacol',
    shortName: 'Metro Naga Sports Complex',
    barangay: 'Pacol',
    coordinates: [13.6502, 123.2255],
    sports: ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Running'],
  },
  {
    id: 'adnu_covered_court',
    name: 'ADNU Covered Courts, Bagumbayan Sur',
    shortName: 'ADNU Courts',
    barangay: 'Bagumbayan Sur',
    coordinates: [13.6305, 123.1862],
    sports: ['Basketball', 'Volleyball', 'Badminton'],
  },
  {
    id: 'unc_sports_palace',
    name: 'UNC Sports Palace, Peñafrancia',
    shortName: 'UNC Sports Palace',
    barangay: 'Peñafrancia',
    coordinates: [13.6256, 123.1843],
    sports: ['Basketball', 'Volleyball', 'Badminton', 'Table Tennis'],
  },
  {
    id: 'concepcion_pequena_hub',
    name: 'Concepcion Pequeña Sports Hub',
    shortName: 'Concepcion Pequeña Hub',
    barangay: 'Concepcion Pequeña',
    coordinates: [13.6242, 123.2044],
    sports: ['Badminton', 'Pickleball', 'Basketball'],
  },
  {
    id: 'naga_plaza_quezon',
    name: 'Naga City Tennis & Pickleball Courts, Centro',
    shortName: 'Centro Courts',
    barangay: 'Centro',
    coordinates: [13.6238, 123.1895],
    sports: ['Tennis', 'Pickleball', 'Padel'],
  },
  {
    id: 'magsaysay_rec_hall',
    name: 'Magsaysay Ave Billiards & Darts Lounge',
    shortName: 'Magsaysay Ave Hub',
    barangay: 'Magsaysay',
    coordinates: [13.6285, 123.2015],
    sports: ['Billiards', 'Darts', 'Pickleball'],
  },
];

export function getNearestNagaLandmark(lat: number, lng: number): NagaLandmark | null {
  let nearest: NagaLandmark | null = null;
  let minDist = Infinity;
  for (const landmark of NAGA_SPORTS_VENUES) {
    const dLat = lat - landmark.coordinates[0];
    const dLng = lng - landmark.coordinates[1];
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDist) {
      minDist = dist;
      nearest = landmark;
    }
  }
  // Within ~350 meters
  if (nearest && minDist < 0.0032) {
    return nearest;
  }
  return null;
}

export async function reverseGeocodeNaga(lat: number, lng: number): Promise<string> {
  const landmark = getNearestNagaLandmark(lat, lng);
  if (landmark) {
    return landmark.name;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `/api/geocode?mode=reverse&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.name === 'string' && data.name.trim()) {
        return data.name.trim();
      }
    }
  } catch {
    // Fall back to coordinate text below
  }

  return `Pinned Court (${lat.toFixed(4)}, ${lng.toFixed(4)}), Naga City`;
}

export async function searchNagaLocations(query: string): Promise<LocationSuggestionItem[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const localMatches: LocationSuggestionItem[] = NAGA_SPORTS_VENUES.filter(
    (v) =>
      v.name.toLowerCase().includes(q) ||
      v.shortName.toLowerCase().includes(q) ||
      v.barangay.toLowerCase().includes(q) ||
      v.sports.some((s) => s.toLowerCase().includes(q))
  ).map((v) => ({
    id: v.id,
    title: v.name,
    subtitle: `${v.barangay}, Naga City • ${v.sports.slice(0, 2).join(', ')}`,
    coordinates: v.coordinates,
    isLandmark: true,
  }));

  let apiMatches: LocationSuggestionItem[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`/api/geocode?mode=search&q=${encodeURIComponent(query.trim())}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      const results = Array.isArray(json?.results) ? json.results : [];
      apiMatches = results
        .filter((item: { latitude: number; longitude: number }) =>
          isWithinNagaCity(item.latitude, item.longitude)
        )
        .map(
          (item: {
            placeId: string;
            shortName: string;
            displayName: string;
            latitude: number;
            longitude: number;
          }) => ({
            id: item.placeId,
            title: item.shortName || item.displayName,
            subtitle: item.displayName,
            coordinates: [item.latitude, item.longitude] as [number, number],
            isLandmark: false,
          })
        );
    }
  } catch {
    // Keep local matches if API is unavailable
  }

  const combined = [...localMatches];
  for (const item of apiMatches) {
    if (!combined.some((c) => c.title.toLowerCase() === item.title.toLowerCase())) {
      combined.push(item);
    }
  }
  return combined.slice(0, 6);
}

export interface NagaLocationPickerProps {
  isActive: boolean;
  locationName: string;
  locationDetails: string;
  coordinates: [number, number];
  hasPin: boolean;
  selectedVenueId?: string;
  showQuickHubs?: boolean;
  onChangeLocation: (update: {
    locationName: string;
    coordinates: [number, number];
    hasPin: boolean;
    selectedVenueId?: string;
  }) => void;
  onChangeLocationDetails: (details: string) => void;
}

export const NagaLocationPicker: React.FC<NagaLocationPickerProps> = ({
  isActive,
  locationName,
  locationDetails,
  coordinates,
  hasPin,
  selectedVenueId = '',
  showQuickHubs = true,
  onChangeLocation,
  onChangeLocationDetails,
}) => {
  const searchQuery = locationName;
  const setSearchQuery = (_val: string) => {
    void _val;
  };
  const [suggestions, setSuggestions] = useState<LocationSuggestionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markerRef = useRef<LeafletType.Marker | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValidCoordsRef = useRef<[number, number]>(
    isWithinNagaCity(coordinates[0], coordinates[1]) ? coordinates : NAGA_CITY_CENTER
  );
  const onChangeLocationRef = useRef(onChangeLocation);

  useEffect(() => {
    onChangeLocationRef.current = onChangeLocation;
  }, [onChangeLocation]);

  useEffect(() => {
    if (isWithinNagaCity(coordinates[0], coordinates[1])) {
      lastValidCoordsRef.current = coordinates;
    }
  }, [coordinates]);

  const showTimedNotice = (type: 'info' | 'error', text: string, durationMs = 4000) => {
    setNotice({ type, text });
    if (durationMs > 0) {
      setTimeout(() => {
        setNotice((prev) => (prev?.text === text ? null : prev));
      }, durationMs);
    }
  };

  const triggerPinDropAnimation = () => {
    const el = markerRef.current?.getElement();
    if (!el) return;
    const inner = el.querySelector('.sportsync-pin-visual') as HTMLElement | null;
    if (!inner) return;
    inner.classList.remove('sportsync-pin-drop');
    void inner.offsetWidth;
    inner.classList.add('sportsync-pin-drop');
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Leaflet map + ResizeObserver + visualViewport resize invalidateSize
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

    const initTimer = setTimeout(() => {
      import('leaflet').then((L) => {
        if (!isMounted || !mapContainerRef.current) return;

        if ((mapContainerRef.current as unknown as { _leaflet_id?: number })._leaflet_id && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          return;
        }
        if ((mapContainerRef.current as unknown as { _leaflet_id?: number })._leaflet_id) {
          (mapContainerRef.current as unknown as { _leaflet_id?: number | null })._leaflet_id = null;
        }

        const startCoords = lastValidCoordsRef.current;
        const map = L.map(mapContainerRef.current, {
          center: startCoords,
          zoom: 15,
          minZoom: 12,
          maxZoom: 19,
          zoomControl: false,
          maxBounds: NAGA_LEAFLET_BOUNDS,
          maxBoundsViscosity: 0.85,
        });
        mapInstanceRef.current = map;

        const createPinIcon = () =>
          L.divIcon({
            html: `
              <div class="sportsync-pin-visual" style="position: relative; width: 38px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
                <div style="
                  position: absolute;
                  top: 2px;
                  width: 32px;
                  height: 32px;
                  border-radius: 9999px;
                  background: rgba(200, 255, 46, 0.35);
                "></div>
                <div style="
                  position: relative;
                  width: 30px;
                  height: 30px;
                  border-radius: 9999px;
                  background: #0B0F0C;
                  border: 3px solid #C8FF2E;
                  box-shadow: 0 0 14px rgba(200, 255, 46, 0.8), 0 4px 6px rgba(0,0,0,0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 14px;
                ">📍</div>
                <div style="
                  width: 0;
                  height: 0;
                  border-left: 5px solid transparent;
                  border-right: 5px solid transparent;
                  border-top: 6px solid #C8FF2E;
                  margin-top: -1px;
                "></div>
              </div>
            `,
            className: 'sportsync-naga-pin',
            iconSize: [38, 44],
            iconAnchor: [19, 44],
          });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const marker = L.marker(startCoords, {
          icon: createPinIcon(),
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;

        const applyCoordinates = async (lat: number, lng: number, pan = false) => {
          if (!isWithinNagaCity(lat, lng)) {
            const fallback = lastValidCoordsRef.current;
            marker.setLatLng(fallback);
            map.panTo(fallback, { animate: true, duration: 0.35 });
            showTimedNotice('error', 'Pilot area is Naga City only', 4000);
            return;
          }

          const validCoords: [number, number] = [lat, lng];
          lastValidCoordsRef.current = validCoords;
          marker.setLatLng(validCoords);
          triggerPinDropAnimation();
          setShowDropdown(false);
          if (pan) {
            const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
            map.panTo(validCoords, { animate: !reduced, duration: 0.35 });
          }

          setIsResolving(true);
          const resolvedName = await reverseGeocodeNaga(lat, lng);
          if (!isMounted) return;
          setIsResolving(false);
          setSearchQuery(resolvedName);
          onChangeLocationRef.current({
            locationName: resolvedName,
            coordinates: validCoords,
            hasPin: true,
            selectedVenueId: '',
          });
        };

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          void applyCoordinates(pos.lat, pos.lng, false);
        });

        map.on('click', (e: LeafletType.LeafletMouseEvent) => {
          void applyCoordinates(e.latlng.lat, e.latlng.lng, true);
        });

        // Observe container size & viewport changes to keep tap coordinates exact
        if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            mapInstanceRef.current?.invalidateSize({ animate: false });
          });
          resizeObserver.observe(mapContainerRef.current);
        }

        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize({ animate: false });
        }, 220);
      });
    }, 60);

    const handleViewportResize = () => {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize({ animate: false });
      }, 200);
    };
    window.visualViewport?.addEventListener('resize', handleViewportResize);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isActive]);

  const flyToAndPin = (coords: [number, number], zoom = 16) => {
    if (!isWithinNagaCity(coords[0], coords[1])) {
      showTimedNotice('error', 'Pilot area is Naga City only', 4000);
      return false;
    }
    lastValidCoordsRef.current = coords;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (mapInstanceRef.current) {
      if (reduced) {
        mapInstanceRef.current.setView(coords, zoom, { animate: false });
      } else {
        mapInstanceRef.current.flyTo(coords, zoom, { duration: 0.7 });
      }
      if (markerRef.current) {
        markerRef.current.setLatLng(coords);
        triggerPinDropAnimation();
      }
    }
    return true;
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    onChangeLocation({
      locationName: val,
      coordinates,
      hasPin: Boolean(val.trim()) && hasPin,
      selectedVenueId: '',
    });

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setShowDropdown(true);
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchNagaLocations(val);
      setSuggestions(results);
      setIsSearching(false);
    }, 300);
  };

  const handleClearSearch = () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setIsSearching(false);
    onChangeLocation({
      locationName: '',
      coordinates: lastValidCoordsRef.current,
      hasPin: false,
      selectedVenueId: '',
    });
  };

  const handleSelectSuggestion = (item: LocationSuggestionItem) => {
    if (!flyToAndPin(item.coordinates, 16)) return;
    setSearchQuery(item.title);
    setShowDropdown(false);
    setSuggestions([]);
    onChangeLocation({
      locationName: item.title,
      coordinates: item.coordinates,
      hasPin: true,
      selectedVenueId: item.id,
    });
  };

  const handleSelectQuickVenue = (venue: NagaLandmark) => {
    if (!flyToAndPin(venue.coordinates, 16)) return;
    setSearchQuery(venue.name);
    setShowDropdown(false);
    onChangeLocation({
      locationName: venue.name,
      coordinates: venue.coordinates,
      hasPin: true,
      selectedVenueId: venue.id,
    });
  };

  const handleCenterNaga = () => {
    flyToAndPin(NAGA_CITY_CENTER, 14);
    showTimedNotice('info', 'Centered on Naga City', 2500);
  };

  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showTimedNotice('error', 'GPS unavailable on this device. Tap the map or search a venue instead.', 5000);
      return;
    }

    setIsLocating(true);
    setNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (!isWithinNagaCity(lat, lng)) {
            flyToAndPin(lastValidCoordsRef.current, 15);
            showTimedNotice(
              'error',
              'Pilot area is Naga City only. Tap the map or search a Naga venue instead.',
              5000
            );
            return;
          }

          const userCoords: [number, number] = [lat, lng];
          flyToAndPin(userCoords, 16);
          setIsResolving(true);
          const name = await reverseGeocodeNaga(lat, lng);
          setIsResolving(false);
          setSearchQuery(name);
          onChangeLocation({
            locationName: name,
            coordinates: userCoords,
            hasPin: true,
            selectedVenueId: '',
          });
          showTimedNotice('info', 'Pin set to your current location', 3000);
        } finally {
          setIsLocating(false);
          setIsResolving(false);
        }
      },
      (geoErr) => {
        setIsLocating(false);
        if (geoErr?.code === 1) {
          showTimedNotice(
            'error',
            'Location permission denied. Tap the map or search a venue in Naga instead.',
            5500
          );
        } else if (geoErr?.code === 3) {
          showTimedNotice(
            'error',
            'GPS timed out. Tap the map or search a venue in Naga instead.',
            5500
          );
        } else {
          showTimedNotice(
            'error',
            'Could not get your GPS location. Tap the map or search a venue instead.',
            5500
          );
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
          <span>Location &amp; Pitch in Naga</span>
          <span className="text-[#C8FF2E]">*</span>
        </label>
        {isResolving && (
          <span className="text-[10px] text-[#C8FF2E] flex items-center gap-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Resolving...
          </span>
        )}
      </div>

      {/* Search Bar */}
      <div ref={searchContainerRef} className="relative z-[50]">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C8FF2E] pointer-events-none">
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            placeholder="Search Naga court, hub, or street..."
            autoComplete="off"
            aria-label="Search venue or street in Naga City"
            className="w-full min-h-[44px] h-12 pl-10 pr-11 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none transition-all placeholder:text-[#6F7B71]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear location search"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-[#A5B0A6] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && (suggestions.length > 0 || isSearching) && (
          <div className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl border border-white/10 bg-[#141A15]/98 backdrop-blur-xl shadow-2xl p-1.5 space-y-1 max-h-60 overflow-y-auto no-scrollbar z-[500]">
            {isSearching && suggestions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-[#A5B0A6] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-[#C8FF2E] animate-spin" />
                <span>Searching Naga City venues...</span>
              </div>
            ) : (
              suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-xl hover:bg-[#1C241E] flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#0B0F0C] border border-white/5 flex items-center justify-center text-[#C8FF2E] shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#F4F7F0] truncate block group-hover:text-[#C8FF2E]">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#A5B0A6] block truncate">{item.subtitle}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#C8FF2E] font-semibold shrink-0">Pin</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick-Select Naga Hubs */}
      {showQuickHubs && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {NAGA_SPORTS_VENUES.map((venue) => {
            const active = selectedVenueId === venue.id || locationName === venue.name;
            return (
              <button
                key={venue.id}
                type="button"
                onClick={() => handleSelectQuickVenue(venue)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all press-scale shrink-0 ${
                  active
                    ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                    : 'bg-[#1C241E] text-[#A5B0A6] border-white/10 hover:text-white'
                }`}
              >
                {venue.shortName}
              </button>
            );
          })}
        </div>
      )}

      {/* Interactive Leaflet Map (touch-action: none so map drags don't fight page scroll) */}
      <div className="w-full h-[40dvh] min-h-[280px] max-h-[420px] rounded-2xl border border-white/15 overflow-hidden relative shadow-lg bg-[#141A15]">
        <div ref={mapContainerRef} className="w-full h-full z-0" style={{ touchAction: 'none' }} />

        {/* Map Floating Controls: Locate & Naga Recenter */}
        <div className="absolute top-2.5 right-2.5 z-[400] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            title="Find my current location"
            aria-label="Locate me using GPS"
            className="min-h-[44px] px-3 rounded-xl bg-[#0B0F0C]/92 backdrop-blur-md border border-white/15 text-[#C8FF2E] text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-[#141A15] transition-all press-scale disabled:opacity-60"
          >
            {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            <span>{isLocating ? 'Locating' : 'Locate'}</span>
          </button>

          <button
            type="button"
            onClick={handleCenterNaga}
            title="Center on Naga City"
            aria-label="Center map on Naga City"
            className="min-h-[44px] px-3 rounded-xl bg-[#0B0F0C]/92 backdrop-blur-md border border-white/15 text-[#A5B0A6] hover:text-white text-xs font-semibold flex items-center gap-1.5 shadow-md hover:bg-[#141A15] transition-all press-scale"
          >
            <Navigation className="w-3.5 h-3.5 text-[#C8FF2E]" />
            <span>Naga</span>
          </button>
        </div>
      </div>

      {/* Inline Notice (e.g. out-of-Naga snap-back or GPS permission denied) */}
      {notice && (
        <div
          role={notice.type === 'error' ? 'alert' : 'status'}
          className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border ${
            notice.type === 'error'
              ? 'bg-[#FF5C5C]/15 border-[#FF5C5C]/35 text-[#FF8F8F]'
              : 'bg-[#141A15] border-[#C8FF2E]/35 text-[#C8FF2E]'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="leading-snug">{notice.text}</span>
        </div>
      )}

      {/* Readout Bar Directly BELOW the Map (never blocks taps or OSM attribution) */}
      <div className="bg-[#141A15] border border-white/10 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
            <span className="text-xs font-bold text-[#F4F7F0] truncate">
              {locationName.trim() || 'No location pinned yet'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#6F7B71] block mt-0.5">
            {coordinates[0].toFixed(4)}°N, {coordinates[1].toFixed(4)}°E
          </span>
        </div>
        <span className="text-[11px] font-semibold text-[#C8FF2E] shrink-0 text-right">
          {hasPin ? 'Drag the pin to fine-tune' : 'Tap map to pin'}
        </span>
      </div>

      {/* Optional Location Details */}
      <div>
        <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center justify-between mb-1.5">
          <span>Location Details</span>
          <span className="text-[10px] text-[#6F7B71] font-normal">Optional</span>
        </label>
        <input
          type="text"
          value={locationDetails}
          onChange={(e) => onChangeLocationDetails(e.target.value)}
          placeholder="Court #, gate, landmark, or directions..."
          autoComplete="off"
          className="w-full min-h-[44px] h-11 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs sm:text-sm text-[#F4F7F0] placeholder:text-[#6F7B71] focus:border-[#C8FF2E] focus:outline-none transition-all"
        />
      </div>
    </div>
  );
};
