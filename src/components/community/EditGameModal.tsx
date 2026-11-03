'use client';

import React, { useState, useEffect, useRef } from 'react';
import type * as LeafletType from 'leaflet';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Users,
  Search,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  Layers,
  Save,
} from 'lucide-react';
import { CommunityGame, SportType } from '@/mock/types';
import { APP_CONFIG } from '@/config/appConfig';
import { Stepper } from '@/design-system/components/SegmentedControl';
import { DateStrip, generateUpcomingDates } from '@/design-system/components/DateStrip';
import { defaultGeocodingProvider } from '@/lib/maps/provider';
import {
  STANDARDIZED_SPORTS_OPTIONS,
  WizardSport,
  NAGA_SPORTS_VENUES,
  NAGA_CITY_CENTER,
  NagaLandmark,
  LocationSuggestionItem,
  reverseGeocodeNaga,
} from '@/screens/community/CreateMatchWizardScreen';

interface EditGameModalProps {
  isOpen: boolean;
  game: CommunityGame;
  onClose: () => void;
  onSave: (updatedData: {
    title: string;
    sport: string;
    date: string;
    time: string;
    locationName: string;
    locationDetails?: string;
    skillLevel: 'Beginner' | 'Casual' | 'Intermediate' | 'Competitive';
    spotsTotal: number;
    pricePerPlayer: number;
    notes?: string;
    coordinates?: [number, number];
  }) => Promise<void> | void;
}

export const EditGameModal: React.FC<EditGameModalProps> = ({
  isOpen,
  game,
  onClose,
  onSave,
}) => {
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tomorrowObj = new Date(now);
  tomorrowObj.setDate(now.getDate() + 1);
  const tomorrowISO = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;

  // Form states initialized with existing game values
  const [title, setTitle] = useState(game.title);
  const [sport, setSport] = useState<string>(game.sport);

  // Schedule parsing
  const initialScheduleMode = () => {
    if (game.date.toLowerCase().includes('today')) return 'today';
    if (game.date.toLowerCase().includes('tomorrow')) return 'tomorrow';
    return 'custom';
  };
  const [scheduleMode, setScheduleMode] = useState<'today' | 'tomorrow' | 'custom'>(initialScheduleMode);
  const [date, setDate] = useState(game.date);
  const [time, setTime] = useState(game.time || '18:00');
  const [customDate, setCustomDate] = useState(() => (/^\d{4}-\d{2}-\d{2}$/.test(game.date) ? game.date : todayISO));

  const adjustEditDateByDays = (deltaDays: number) => {
    const parts = (customDate || todayISO).split('-').map(Number);
    const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
    d.setDate(d.getDate() + deltaDays);
    const nextISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setCustomDate(nextISO < todayISO ? todayISO : nextISO);
  };

  const adjustEditTimeByMinutes = (deltaMins: number) => {
    const [rawH, rawM] = (time || '18:00').split(':').map(Number);
    const h = Number.isFinite(rawH) ? rawH : 18;
    const m = Number.isFinite(rawM) ? rawM : 0;
    const clamped = Math.max(0, Math.min(23 * 60 + 45, h * 60 + m + deltaMins));
    setTime(`${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`);
  };

  // Location states
  const [locationName, setLocationName] = useState(game.locationName);
  const [locationDetails, setLocationDetails] = useState(game.locationDetails || '');
  const [locationSearchQuery, setLocationSearchQuery] = useState(game.locationName);
  const [coordinates, setCoordinates] = useState<[number, number]>(() => {
    if (game.coordinates && Array.isArray(game.coordinates) && game.coordinates.length === 2) {
      return game.coordinates;
    }
    // Check if location matches a known Naga venue
    const match = NAGA_SPORTS_VENUES.find((v) =>
      game.locationName.toLowerCase().includes(v.shortName.toLowerCase()) ||
      game.locationName.toLowerCase().includes(v.barangay.toLowerCase())
    );
    return match ? match.coordinates : NAGA_CITY_CENTER;
  });

  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestionItem[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Roster, Skill, & Price states
  const [skillLevel, setSkillLevel] = useState<'Beginner' | 'Casual' | 'Intermediate' | 'Competitive'>(
    game.skillLevel || 'Casual'
  );
  const [spotsTotal, setSpotsTotal] = useState<number>(game.spotsTotal || 10);
  const [pricePerPlayer, setPricePerPlayer] = useState<number>(game.pricePerPlayer || 0);
  const [notes, setNotes] = useState<string>(game.notes || '');

  // Validation & Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  // Leaflet map references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markerRef = useRef<LeafletType.Marker | null>(null);

  // Re-initialize state whenever game changes or modal opens
  useEffect(() => {
    if (isOpen && game) {
      setTitle(game.title);
      setSport(game.sport);
      setDate(game.date);
      setTime(game.time || '18:00');
      if (/^\d{4}-\d{2}-\d{2}$/.test(game.date)) {
        setCustomDate(game.date);
      }
      setLocationName(game.locationName);
      setLocationDetails(game.locationDetails || '');
      setLocationSearchQuery(game.locationName);
      setSkillLevel(game.skillLevel || 'Casual');
      setSpotsTotal(game.spotsTotal || 10);
      setPricePerPlayer(game.pricePerPlayer || 0);
      setNotes(game.notes || '');
      setValidationError(null);

      if (game.coordinates && Array.isArray(game.coordinates) && game.coordinates.length === 2) {
        setCoordinates(game.coordinates);
      } else {
        const match = NAGA_SPORTS_VENUES.find((v) =>
          game.locationName.toLowerCase().includes(v.shortName.toLowerCase()) ||
          game.locationName.toLowerCase().includes(v.barangay.toLowerCase())
        );
        setCoordinates(match ? match.coordinates : NAGA_CITY_CENTER);
      }
    }
  }, [isOpen, game]);

  // Leaflet map initialization
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    let isMounted = true;

    // Small delay to ensure modal DOM is visible and measured
    const timer = setTimeout(() => {
      import('leaflet').then((L) => {
        if (!isMounted || !mapContainerRef.current) return;

        // Clean up previous instance if any
        if ((mapContainerRef.current as any)._leaflet_id && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          return;
        }

        if ((mapContainerRef.current as any)._leaflet_id) {
          (mapContainerRef.current as any)._leaflet_id = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: coordinates,
          zoom: 15,
          zoomControl: false,
        });
        mapInstanceRef.current = map;

        const createPinIcon = () =>
          L.divIcon({
            html: `
              <div style="position: relative; width: 36px; height: 42px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
                <div style="
                  position: absolute;
                  top: 2px;
                  width: 30px;
                  height: 30px;
                  border-radius: 9999px;
                  background: rgba(200, 255, 46, 0.4);
                  animation: pulse 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                "></div>
                <div style="
                  position: relative;
                  width: 28px;
                  height: 28px;
                  border-radius: 9999px;
                  background: #0B0F0C;
                  border: 3px solid #C8FF2E;
                  box-shadow: 0 0 14px rgba(200, 255, 46, 0.8), 0 4px 6px rgba(0,0,0,0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 13px;
                ">
                  📍
                </div>
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
            className: 'sportsync-edit-pin',
            iconSize: [36, 42],
            iconAnchor: [18, 42],
          });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const marker = L.marker(coordinates, {
          icon: createPinIcon(),
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          const newCoords: [number, number] = [pos.lat, pos.lng];
          setCoordinates(newCoords);
          setShowLocationDropdown(false);
          setIsResolvingLocation(true);
          const resolvedName = await reverseGeocodeNaga(pos.lat, pos.lng);
          setLocationName(resolvedName);
          setLocationSearchQuery(resolvedName);
          setIsResolvingLocation(false);
          setValidationError(null);
        });

        map.on('click', async (e: LeafletType.LeafletMouseEvent) => {
          const newCoords: [number, number] = [e.latlng.lat, e.latlng.lng];
          marker.setLatLng(e.latlng);
          setCoordinates(newCoords);
          setShowLocationDropdown(false);
          map.panTo(e.latlng, { animate: true, duration: 0.4 });
          setIsResolvingLocation(true);
          const resolvedName = await reverseGeocodeNaga(e.latlng.lat, e.latlng.lng);
          setLocationName(resolvedName);
          setLocationSearchQuery(resolvedName);
          setIsResolvingLocation(false);
          setValidationError(null);
        });

        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);
      });
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle location search with debouncing
  const handleLocationInputChange = (val: string) => {
    setLocationSearchQuery(val);
    setLocationName(val);
    if (validationError) setValidationError(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val || val.trim().length < 2) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      setIsSearchingLocation(false);
      return;
    }

    setShowLocationDropdown(true);
    setIsSearchingLocation(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const q = val.trim().toLowerCase();

      const localMatches: LocationSuggestionItem[] = NAGA_SPORTS_VENUES
        .filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.shortName.toLowerCase().includes(q) ||
            v.barangay.toLowerCase().includes(q) ||
            v.sports.some((s) => s.toLowerCase().includes(q))
        )
        .map((v) => ({
          id: v.id,
          title: v.name,
          subtitle: `${v.barangay}, Naga City • ${v.sports.slice(0, 2).join(', ')}`,
          coordinates: v.coordinates,
          isLandmark: true,
        }));

      let apiMatches: LocationSuggestionItem[] = [];
      try {
        const geoResults = await defaultGeocodingProvider.search(val);
        apiMatches = geoResults.map((item) => ({
          id: item.placeId,
          title: item.shortName || item.displayName,
          subtitle: item.displayName,
          coordinates: [item.latitude, item.longitude] as [number, number],
          isLandmark: false,
        }));
      } catch (err) {
        console.warn('Map API location search failed:', err);
      }

      const combined = [...localMatches];
      for (const item of apiMatches) {
        const alreadyExists = combined.some(
          (c) => c.title.toLowerCase() === item.title.toLowerCase()
        );
        if (!alreadyExists) {
          combined.push(item);
        }
      }

      setLocationSuggestions(combined.slice(0, 6));
      setIsSearchingLocation(false);
    }, 280);
  };

  const handleSelectSuggestedLocation = (item: LocationSuggestionItem) => {
    setLocationName(item.title);
    setLocationSearchQuery(item.title);
    setCoordinates(item.coordinates);
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
    setValidationError(null);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(item.coordinates, 16, { duration: 0.8 });
      if (markerRef.current) {
        markerRef.current.setLatLng(item.coordinates);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || title.trim().length < 3) {
      setValidationError('Please enter a match title with at least 3 characters.');
      return;
    }

    if (!locationName.trim()) {
      setValidationError('Please specify a match location.');
      return;
    }

    if (spotsTotal < (game.spotsJoined || 1)) {
      setValidationError(
        `Total slots cannot be less than the ${game.spotsJoined} players already registered.`
      );
      return;
    }

    setValidationError(null);
    setIsSaving(true);

    try {
      let finalDate = date;
      if (scheduleMode === 'today') {
        finalDate = `Today (${time})`;
      } else if (scheduleMode === 'tomorrow') {
        finalDate = `Tomorrow (${time})`;
      } else if (scheduleMode === 'custom') {
        finalDate = `${customDate} (${time})`;
      }

      await onSave({
        title: title.trim(),
        sport,
        date: finalDate,
        time,
        locationName: locationName.trim(),
        locationDetails: locationDetails.trim() || undefined,
        skillLevel,
        spotsTotal,
        pricePerPlayer,
        notes: notes.trim(),
        coordinates,
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to save game edits:', err);
      setValidationError(err?.message || 'Failed to update game details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[550] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-game-modal-title"
        className="relative w-full max-w-xl rounded-3xl bg-[#0B0F0C] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] select-none animate-in zoom-in-95 duration-200 text-[#F4F7F0]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/10 bg-[#0B0F0C] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C8FF2E] shadow-[0_0_8px_#C8FF2E]" />
              <span className="font-display font-bold text-xs uppercase tracking-wider text-[#C8FF2E]">
                Host Game Management
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1C241E] text-[#A5B0A6] border border-white/5">
                Edit Match Details
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-8 h-8 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
              aria-label="Close edit game modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 id="edit-game-modal-title" className="font-display font-black text-lg sm:text-xl text-[#F4F7F0] mt-1">
            Edit Hosted Game
          </h2>
          <p className="text-xs text-[#A5B0A6]">
            Update match schedule, venue location, slots, or notes for all players.
          </p>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 rounded-2xl bg-[#FF5C5C]/15 border border-[#FF5C5C]/40 text-[#FF8F8F] text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#FF5C5C]" />
              <span className="leading-tight">{validationError}</span>
            </div>
          )}

          {/* Section 1: Sport Category */}
          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
              Sport Category <span className="text-[#C8FF2E]">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {STANDARDIZED_SPORTS_OPTIONS.map((sp) => {
                const isSelected = sport.toLowerCase() === sp.id.toLowerCase();
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => setSport(sp.id)}
                    className={`h-16 p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all press-scale ${
                      isSelected
                        ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_12px_rgba(200,255,46,0.25)]'
                        : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="text-xl leading-none">{sp.icon}</span>
                    <span className="text-[10px] font-semibold text-center leading-tight line-clamp-1">
                      {sp.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Match Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                Match Title <span className="text-[#C8FF2E]">*</span>
              </label>
              <span className="text-[10px] text-[#65756B]">{title.length}/60 chars</span>
            </div>
            <input
              type="text"
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5v5 Sunset Pickup Game"
              className="w-full h-12 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] placeholder-[#65756B] focus:border-[#C8FF2E] focus:outline-none transition-all"
            />
          </div>

          {/* Section 3: Date & Kickoff Time */}
          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
              Kickoff Date &amp; Time <span className="text-[#C8FF2E]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setScheduleMode('today')}
                className={`h-11 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all press-scale ${
                  scheduleMode === 'today'
                    ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-sm'
                    : 'bg-[#1C241E] border-white/10 text-[#A5B0A6]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Today</span>
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('tomorrow')}
                className={`h-11 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-scale ${
                  scheduleMode === 'tomorrow'
                    ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-sm'
                    : 'bg-[#1C241E] border-white/10 text-[#A5B0A6]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Tomorrow</span>
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('custom')}
                className={`h-11 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all press-scale ${
                  scheduleMode === 'custom'
                    ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-sm'
                    : 'bg-[#1C241E] border-white/10 text-[#A5B0A6]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Custom</span>
              </button>
            </div>

            <div className="space-y-3 p-3 rounded-2xl bg-[#141A15] border border-white/10">
              {scheduleMode === 'custom' && (
                <div className="space-y-1.5 pb-2.5 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6]">Pick Date</span>
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Previous day"
                        disabled={customDate <= todayISO}
                        onClick={() => adjustEditDateByDays(-1)}
                        className="h-7 px-2.5 rounded-lg bg-[#1C241E] border border-white/10 text-xs font-bold text-[#F4F7F0] disabled:opacity-30"
                      >
                        -1d
                      </button>
                      <span className="text-xs font-mono font-bold text-[#C8FF2E] px-1">{customDate}</span>
                      <button
                        type="button"
                        aria-label="Next day"
                        onClick={() => adjustEditDateByDays(1)}
                        className="h-7 px-2.5 rounded-lg bg-[#1C241E] border border-white/10 text-xs font-bold text-[#F4F7F0] hover:border-[#C8FF2E]"
                      >
                        +1d
                      </button>
                    </div>
                  </div>
                  <DateStrip
                    dates={generateUpcomingDates(14)}
                    selectedId={customDate}
                    onSelect={(iso) => setCustomDate(iso)}
                    showCalendarPicker={false}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6]">Kickoff Time</span>
                  <div className="inline-flex items-center bg-[#1C241E] border border-white/10 rounded-xl p-0.5 gap-1.5">
                    <button
                      type="button"
                      aria-label="Earlier kickoff time"
                      disabled={time <= '00:00'}
                      onClick={() => adjustEditTimeByMinutes(-15)}
                      className="w-7 h-7 rounded-lg bg-[#263028] text-xs font-bold text-[#F4F7F0] disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs font-bold text-[#C8FF2E] px-1.5 tabular-nums">{time}</span>
                    <button
                      type="button"
                      aria-label="Later kickoff time"
                      disabled={time >= '23:45'}
                      onClick={() => adjustEditTimeByMinutes(15)}
                      className="w-7 h-7 rounded-lg bg-[#C8FF2E] text-xs font-bold text-[#0B0F0C] disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {['07:00', '09:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00'].map((slot) => {
                    const activeSlot = time === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={activeSlot}
                        onClick={() => setTime(slot)}
                        className={`py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all press-scale ${
                          activeSlot
                            ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                            : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Location Search & Map Pinpointer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                <span>Location &amp; Pitch Venue</span>
                <span className="text-[#C8FF2E]">*</span>
              </label>
              {isResolvingLocation && (
                <span className="text-[10px] text-[#C8FF2E] flex items-center gap-1 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Resolving...
                </span>
              )}
            </div>

            {/* Location Input with Search Icon */}
            <div ref={searchContainerRef} className="relative mb-2 z-[50]">
              <div className="relative flex items-center">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C8FF2E] pointer-events-none">
                  {isSearchingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </div>
                <input
                  type="text"
                  value={locationSearchQuery}
                  onChange={(e) => handleLocationInputChange(e.target.value)}
                  onFocus={() => {
                    if (locationSuggestions.length > 0) setShowLocationDropdown(true);
                  }}
                  placeholder="Search venue or address (e.g. Robredo Coliseum, Pacol)..."
                  className="w-full h-12 pl-10 pr-9 rounded-2xl bg-[#1C241E] border border-white/10 text-xs sm:text-sm text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none transition-all truncate"
                />
                {locationSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocationSearchQuery('');
                      setLocationName('');
                      setLocationSuggestions([]);
                      setShowLocationDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#65756B] hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown from Map API */}
              {showLocationDropdown && (locationSuggestions.length > 0 || isSearchingLocation) && (
                <div className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl border border-white/10 bg-[#141A15]/98 backdrop-blur-xl shadow-2xl p-1.5 space-y-1 max-h-56 overflow-y-auto no-scrollbar z-[500]">
                  {locationSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestedLocation(item)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-[#1C241E] flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#0B0F0C] border border-white/5 flex items-center justify-center text-[#C8FF2E] shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#F4F7F0] truncate block group-hover:text-[#C8FF2E]">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-[#A5B0A6] block truncate">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#C8FF2E] font-semibold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        Pin &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Leaflet Map for Pinpointing */}
            <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-white/10 bg-[#141A15]">
              <div ref={mapContainerRef} className="w-full h-full" />
              <div className="absolute bottom-2 left-2 right-2 z-[400] px-2.5 py-1.5 rounded-xl bg-[#0B0F0C]/85 backdrop-blur-md border border-white/10 text-[10px] text-[#A5B0A6] flex items-center justify-between">
                <span className="truncate pr-2">📍 {locationName}</span>
                <span className="text-[#C8FF2E] font-bold shrink-0">Drag pin to reposition</span>
              </div>
            </div>

            <div className="mt-2.5">
              <label className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center justify-between mb-1">
                <span>Location Details</span>
                <span className="text-[10px] text-[#A5B0A6] font-normal">Optional</span>
              </label>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="Unit, building, landmark, or specific directions..."
                autoComplete="off"
                className="w-full h-11 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs sm:text-sm text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Section 5: Available Slots & Skill Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Available Slots */}
            <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 space-y-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                  Total Roster Slots
                </label>
                <span className="text-[10px] text-[#6F7B71]">
                  {game.spotsJoined} joined
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Stepper
                  value={spotsTotal}
                  onChange={setSpotsTotal}
                  min={Math.max(2, game.spotsJoined || 1)}
                  max={30}
                  step={1}
                  unit="spots"
                  ariaLabel="total roster slots"
                  className="w-full justify-between"
                />
              </div>
            </div>

            {/* Price Per Player */}
            <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                  Cost Share ({APP_CONFIG.currency})
                </label>
                <span className="text-[10px] text-[#6F7B71]">
                  {pricePerPlayer === 0 ? 'Free game' : 'Per player'}
                </span>
              </div>
              <Stepper
                value={pricePerPlayer}
                onChange={setPricePerPlayer}
                min={0}
                max={5000}
                step={10}
                prefix={APP_CONFIG.currency}
                ariaLabel="cost share per player"
                className="w-full justify-between"
              />
              <div className="grid grid-cols-5 gap-1">
                {[0, 100, 150, 200, 300].map((preset) => {
                  const activeFee = pricePerPlayer === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={activeFee}
                      onClick={() => setPricePerPlayer(preset)}
                      className={`py-1 rounded-lg text-[10px] font-mono font-semibold border transition-all ${
                        activeFee
                          ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                          : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-white'
                      }`}
                    >
                      {preset === 0 ? 'Free' : `${APP_CONFIG.currency}${preset}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 6: Skill Level */}
          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
              Target Skill Tier
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Beginner', 'Casual', 'Intermediate', 'Competitive'] as const).map((lvl) => {
                const isSelected = skillLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSkillLevel(lvl)}
                    className={`h-11 rounded-xl text-xs font-bold transition-all border press-scale ${
                      isSelected
                        ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-sm'
                        : 'bg-[#141A15] border-white/5 text-[#A5B0A6] hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 7: Host Notes */}
          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
              Host Notes &amp; Entry Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bring your boots. Court lights are booked from 7pm. Meet by Court 2 entrance."
              className="w-full p-3 rounded-2xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:border-[#C8FF2E] focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0B0F0C] shrink-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-12 px-5 rounded-2xl bg-[#141A15] hover:bg-[#1C241E] text-xs font-bold text-[#A5B0A6] hover:text-white border border-white/10 transition-all press-scale disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-12 px-7 rounded-2xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-xs font-display font-bold text-[#0B0F0C] shadow-[0_0_20px_rgba(200,255,46,0.3)] transition-all press-scale flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
