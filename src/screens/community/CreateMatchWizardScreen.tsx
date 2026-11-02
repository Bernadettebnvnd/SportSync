'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Calendar,
  Clock,
  Share2,
  AlertCircle,
  Users,
  Search,
  Crosshair,
  Navigation,
  X,
  Sparkles,
  Shield,
  Loader2,
} from 'lucide-react';
import type * as LeafletType from 'leaflet';
import { Button } from '../../design-system/components/Button';
import { Stepper, Toggle } from '../../design-system/components/SegmentedControl';
import { APP_CONFIG } from '../../config/appConfig';

export const STANDARDIZED_SPORTS_OPTIONS = [
  { id: 'Basketball', label: 'Basketball', icon: '🏀' },
  { id: 'Badminton', label: 'Badminton', icon: '🏸' },
  { id: 'Volleyball', label: 'Volleyball', icon: '🏐' },
  { id: 'Football', label: 'Football', icon: '⚽' },
  { id: 'Pickleball', label: 'Pickleball', icon: '🏓' },
  { id: 'Tennis', label: 'Tennis', icon: '🎾' },
  { id: 'Billiards', label: 'Billiards', icon: '🎱' },
  { id: 'Darts', label: 'Darts', icon: '🎯' },
  { id: 'Other', label: 'Other', icon: '🏆' },
] as const;

export type WizardSport = (typeof STANDARDIZED_SPORTS_OPTIONS)[number]['id'];

// Naga City Pilot Area Center
export const NAGA_CITY_CENTER: [number, number] = [13.6218, 123.1948];

export interface NagaLandmark {
  id: string;
  name: string;
  shortName: string;
  coordinates: [number, number];
  sports: string[];
  barangay: string;
}

// Prominent Sports Venues & Facilities in Naga City
export const NAGA_SPORTS_VENUES: NagaLandmark[] = [
  {
    id: 'robredo_coliseum',
    name: 'Jesse M. Robredo Coliseum, Triangulo, Naga City',
    shortName: 'Robredo Coliseum',
    coordinates: [13.6225, 123.1932],
    sports: ['Basketball', 'Volleyball', 'Badminton'],
    barangay: 'Triangulo',
  },
  {
    id: 'metro_naga_complex',
    name: 'Metro Naga Sports Complex, Pacol, Naga City',
    shortName: 'Metro Naga Complex',
    coordinates: [13.6492, 123.2384],
    sports: ['Football', 'Tennis', 'Badminton', 'Basketball'],
    barangay: 'Pacol',
  },
  {
    id: 'plaza_quezon',
    name: 'Plaza Quezon Covered Court, Downtown, Naga City',
    shortName: 'Plaza Quezon Court',
    coordinates: [13.6247, 123.1856],
    sports: ['Basketball', 'Volleyball'],
    barangay: 'San Francisco',
  },
  {
    id: 'adnu_gym',
    name: 'Ateneo de Naga University Gym, Bagumbayan Sur, Naga City',
    shortName: 'AdNU Gym',
    coordinates: [13.6315, 123.1895],
    sports: ['Basketball', 'Volleyball', 'Badminton'],
    barangay: 'Bagumbayan Sur',
  },
  {
    id: 'unc_palace',
    name: 'UNC Sports Palace, J. Hernandez Ave, Naga City',
    shortName: 'UNC Sports Palace',
    coordinates: [13.6289, 123.1882],
    sports: ['Basketball', 'Badminton', 'Table Tennis'],
    barangay: 'Igualdad',
  },
  {
    id: 'magsaysay_hub',
    name: 'Magsaysay Ave Sports Center, Concepcion Pequeña, Naga City',
    shortName: 'Magsaysay Sports Hub',
    coordinates: [13.6312, 123.1989],
    sports: ['Pickleball', 'Tennis', 'Badminton'],
    barangay: 'Concepcion Pequeña',
  },
  {
    id: 'naga_civic_center',
    name: 'Naga City Civic Center & City Hall Grounds, Naga City',
    shortName: 'City Civic Center',
    coordinates: [13.6228, 123.196],
    sports: ['Basketball', 'Volleyball'],
    barangay: 'Concepcion Pequeña',
  },
  {
    id: 'deca_homes_court',
    name: 'Deca Homes Covered Court, San Felipe, Naga City',
    shortName: 'Deca Homes Court',
    coordinates: [13.619, 123.212],
    sports: ['Basketball', 'Badminton'],
    barangay: 'San Felipe',
  },
];

// Helper to compute distance between points in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
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

function getNearestNagaLandmark(lat: number, lng: number): NagaLandmark | null {
  let nearest: NagaLandmark | null = null;
  let minDistance = Infinity;

  for (const landmark of NAGA_SPORTS_VENUES) {
    const dist = calculateDistance(lat, lng, landmark.coordinates[0], landmark.coordinates[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = landmark;
    }
  }

  // Within 350m is matched directly to landmark
  if (nearest && minDistance <= 0.35) {
    return nearest;
  }
  return null;
}

async function reverseGeocodeNaga(lat: number, lng: number): Promise<string> {
  const landmark = getNearestNagaLandmark(lat, lng);
  if (landmark) {
    return landmark.name;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { signal: controller.signal, headers: { 'Accept-Language': 'en' } }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.street;
      const suburb = addr.suburb || addr.quarter || addr.neighbourhood || addr.village;
      const city = addr.city || addr.town || 'Naga City';

      if (road && suburb) return `${road}, ${suburb}, ${city}`;
      if (road) return `${road}, ${city}`;
      if (suburb) return `${suburb}, ${city}`;
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 3).map((s: string) => s.trim()).join(', ');
      }
    }
  } catch {}

  // Fallback to coordinates in Naga City
  return `Pinned Court (${lat.toFixed(4)}, ${lng.toFixed(4)}), Naga City`;
}

interface CreateMatchWizardScreenProps {
  onClose: () => void;
  onFinish?: () => void;
  onMatchCreated: (gameData: {
    sport: WizardSport;
    title: string;
    date: string;
    time?: string;
    formattedDate?: string;
    locationName: string;
    playersCount: number;
    skillLevel: 'Casual' | 'Competitive';
    pricePerPlayer: number;
    notes?: string;
    coordinates?: [number, number];
  }) => Promise<any> | void;
}

export const CreateMatchWizardScreen: React.FC<CreateMatchWizardScreenProps> = ({
  onClose,
  onFinish,
  onMatchCreated,
}) => {
  const [step, setStep] = useState(1); // 1 to 4, then 5 = Success

  // Date & Time helpers for valid scheduling
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tomorrowObj = new Date(now);
  tomorrowObj.setDate(now.getDate() + 1);
  const tomorrowISO = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const defaultTodayHour = Math.min(22, Math.max(currentHour + 2, 19));
  const defaultTodayTime = `${String(defaultTodayHour).padStart(2, '0')}:00`;
  const isTooLateToday = currentHour >= 21;

  // Form states
  const [sport, setSport] = useState<WizardSport>('Basketball');
  const [title, setTitle] = useState('5v5 Sunset Pickup Game');
  const [scheduleMode, setScheduleMode] = useState<'today' | 'tomorrow' | 'custom'>(isTooLateToday ? 'tomorrow' : 'today');
  const [date, setDate] = useState(() => isTooLateToday ? `Tomorrow (18:00)` : `Today (${defaultTodayTime})`);
  const [customDate, setCustomDate] = useState(() => isTooLateToday ? tomorrowISO : todayISO);
  const [customTime, setCustomTime] = useState(() => isTooLateToday ? '18:00' : defaultTodayTime);

  // Location states in Naga City
  const [locationName, setLocationName] = useState('Jesse M. Robredo Coliseum, Triangulo, Naga City');
  const [coordinates, setCoordinates] = useState<[number, number]>(NAGA_SPORTS_VENUES[0].coordinates);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(NAGA_SPORTS_VENUES[0].id);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locateNotice, setLocateNotice] = useState<string | null>(null);

  // Roster states
  const [playersCount, setPlayersCount] = useState(10);
  const [skillLevel, setSkillLevel] = useState<'Casual' | 'Competitive'>('Casual');
  const [splitCost, setSplitCost] = useState(true);
  const [pricePerPlayer, setPricePerPlayer] = useState(150);
  const [bringBootsNote, setBringBootsNote] = useState(true);
  const [visibility, setVisibility] = useState<'Public' | 'Friends' | 'Invite'>('Public');

  // Async submission & validation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leaflet map references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markerRef = useRef<LeafletType.Marker | null>(null);

  // Step 2: Initialize & manage interactive Leaflet map centered on Naga
  useEffect(() => {
    if (step !== 2 || typeof window === 'undefined') return;

    let isMounted = true;

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

      // Custom electric lime pin icon
      const createPinIcon = () =>
        L.divIcon({
          html: `
            <div style="position: relative; width: 38px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
              <div style="
                position: absolute;
                top: 2px;
                width: 32px;
                height: 32px;
                border-radius: 9999px;
                background: rgba(200, 255, 46, 0.4);
                animation: pulse 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
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
          className: 'sportsync-naga-pin',
          iconSize: [38, 44],
          iconAnchor: [19, 44],
        });

      // Tile Layer: OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      // Add draggable pin
      const marker = L.marker(coordinates, {
        icon: createPinIcon(),
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      // When dragging pin on map:
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const newCoords: [number, number] = [pos.lat, pos.lng];
        setCoordinates(newCoords);
        setSelectedVenueId('');
        setIsResolvingLocation(true);
        const name = await reverseGeocodeNaga(pos.lat, pos.lng);
        setLocationName(name);
        setIsResolvingLocation(false);
        setError(null);
      });

      // When clicking or tapping anywhere on the Naga map to pinpoint:
      map.on('click', async (e: LeafletType.LeafletMouseEvent) => {
        const newCoords: [number, number] = [e.latlng.lat, e.latlng.lng];
        marker.setLatLng(e.latlng);
        setCoordinates(newCoords);
        setSelectedVenueId('');
        map.panTo(e.latlng, { animate: true, duration: 0.4 });
        setIsResolvingLocation(true);
        const name = await reverseGeocodeNaga(e.latlng.lat, e.latlng.lng);
        setLocationName(name);
        setIsResolvingLocation(false);
        setError(null);
      });

      // Invalidate size to guarantee responsive sizing in phone containers
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [step]);

  // Handle selection of a known Naga City sports venue chip
  const handleSelectNagaVenue = (venue: NagaLandmark) => {
    setCoordinates(venue.coordinates);
    setLocationName(venue.name);
    setSelectedVenueId(venue.id);
    setError(null);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(venue.coordinates, 16, { duration: 0.8 });
      if (markerRef.current) {
        markerRef.current.setLatLng(venue.coordinates);
      }
    }
  };

  // Center on Naga City center button
  const handleCenterNaga = () => {
    setCoordinates(NAGA_CITY_CENTER);
    setSelectedVenueId('');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(NAGA_CITY_CENTER, 14, { duration: 0.8 });
      if (markerRef.current) {
        markerRef.current.setLatLng(NAGA_CITY_CENTER);
      }
    }
  };

  // Geolocation trigger
  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocateNotice('GPS not available on this device.');
      setTimeout(() => setLocateNotice(null), 3000);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const userCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCoordinates(userCoords);
        setSelectedVenueId('');

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(userCoords, 16, { duration: 0.8 });
          if (markerRef.current) {
            markerRef.current.setLatLng(userCoords);
          }
        }

        setIsResolvingLocation(true);
        const name = await reverseGeocodeNaga(userCoords[0], userCoords[1]);
        setLocationName(name);
        setIsResolvingLocation(false);
        setLocateNotice('Pinpoint set to current GPS location');
        setTimeout(() => setLocateNotice(null), 3000);
      },
      () => {
        setIsLocating(false);
        handleCenterNaga();
        setLocateNotice('Centered on Naga City (Pilot Testing Area)');
        setTimeout(() => setLocateNotice(null), 3000);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Handle custom date/time change
  const handleCustomScheduleChange = (dStr: string, tStr: string) => {
    const validDate = dStr < todayISO ? todayISO : dStr;
    setCustomDate(validDate);
    setCustomTime(tStr);
    setDate(`${validDate} (${tStr})`);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C8FF2E', '#3DDC84', '#FFFFFF', '#0F2A22'],
      });
    } catch {}
  };

  const validateStep = (currentStep: number): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!title.trim() || title.trim().length < 3) {
        setError('Please enter a match title with at least 3 characters.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!locationName.trim()) {
        setError('Please specify or pinpoint a pitch or court venue in Naga.');
        return false;
      }
      if (scheduleMode === 'today' && isTooLateToday) {
        setError('It is too late to schedule a game for today. Please choose tomorrow or a custom date.');
        return false;
      }
      if (scheduleMode === 'custom') {
        if (!customDate || customDate < todayISO) {
          setError('Please select a valid upcoming date.');
          return false;
        }
        if (customDate === todayISO) {
          const [th, tm] = customTime.split(':').map(Number);
          if (th < currentHour || (th === currentHour && tm <= currentMin)) {
            setError("Please select a future kickoff time for today's match.");
            return false;
          }
        }
      }
    }
    if (currentStep === 3) {
      if (playersCount < 2 || playersCount > 24) {
        setError('Player capacity must be between 2 and 24.');
        return false;
      }
      if (splitCost && pricePerPlayer < 0) {
        setError('Price per player cannot be negative.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;

    if (step < 4) {
      setStep(step + 1);
    } else if (step === 4) {
      handlePublish();
    }
  };

  const handlePublish = async () => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const matchTime = scheduleMode === 'today'
        ? defaultTodayTime
        : scheduleMode === 'tomorrow'
        ? '18:00'
        : customTime;

      const formattedSchedule = scheduleMode === 'today'
        ? `Today (${defaultTodayTime})`
        : scheduleMode === 'tomorrow'
        ? `Tomorrow (18:00)`
        : `${customDate} (${customTime})`;

      await onMatchCreated({
        sport,
        title: title.trim(),
        date: formattedSchedule,
        time: matchTime,
        formattedDate: formattedSchedule,
        locationName: locationName.trim(),
        playersCount,
        skillLevel,
        pricePerPlayer: splitCost ? pricePerPlayer : 0,
        notes: bringBootsNote ? 'Bring proper athletic gear and hydration' : undefined,
        coordinates,
      });

      setStep(5);
      triggerConfetti();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to publish match. Please check your connection and retry.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full min-h-[580px] flex flex-col justify-between bg-[#0B0F0C] text-[#F4F7F0] select-none relative">
      {/* Top Fixed Header & Step Progress Bar */}
      <div className="px-4 pt-4 pb-2 sm:px-5 shrink-0 bg-[#0B0F0C] z-10 border-b border-white/5">
        <div className="flex items-center justify-between mb-2.5">
          <button
            type="button"
            onClick={step > 1 && step < 5 ? () => { setError(null); setStep(step - 1); } : onClose}
            className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
            title={step > 1 ? 'Go back a step' : 'Cancel and close'}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#C8FF2E] block">
              {step < 5 ? `Step ${step} of 4` : 'Match Published'}
            </span>
            <span className="text-[10px] text-[#A5B0A6]">
              {step === 1 && 'Sport & Title'}
              {step === 2 && 'Location & Time'}
              {step === 3 && 'Roster & Fee'}
              {step === 4 && 'Review Details'}
              {step === 5 && 'Live on Discovery'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-[#FFA394] flex items-center justify-center transition-colors press-scale"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-Step Progress Bar */}
        {step < 5 && (
          <div className="w-full h-1.5 rounded-full bg-white/10 flex gap-1.5 overflow-hidden">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-full rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-[#C8FF2E]' : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main Scrollable Step Content Container */}
      <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4 space-y-4 no-scrollbar">
        {/* Error Banner */}
        {error && (
          <div className="p-3 rounded-2xl bg-[#E0533C]/15 border border-[#E0533C]/40 text-[#FFA394] text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E0533C]" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* =========================================================================
            STEP 1: SPORT & TITLE
           ========================================================================= */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                What sport &amp; game title?
              </h2>
              <p className="text-xs text-[#A5B0A6] mt-0.5">
                Select your sport category and give your match a recognizable title.
              </p>
            </div>

            {/* Standardized Sports Grid (Mobile Aligned) */}
            <div>
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
                Select Sport Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STANDARDIZED_SPORTS_OPTIONS.map((sp) => {
                  const isSelected = sport === sp.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        setSport(sp.id);
                        setError(null);
                      }}
                      className={`h-20 sm:h-22 p-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all press-scale ${
                        isSelected
                          ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_14px_rgba(200,255,46,0.25)]'
                          : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span className="text-2xl leading-none">{sp.icon}</span>
                      <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight line-clamp-1">
                        {sp.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Match Title Input & Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                  Match Title <span className="text-[#C8FF2E]">*</span>
                </label>
                <span className="text-[10px] text-[#65756B]">Min 3 chars</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 5v5 Sunset Pickup Game"
                className="w-full h-12 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] placeholder-[#65756B] focus:border-[#C8FF2E] focus:outline-none transition-all"
              />

              {/* Title Suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  '5v5 Open Pickup',
                  'Weekend Scrimmage',
                  'Casual Friendly Rally',
                  'Competitive 3v3 Run',
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setTitle(`${sport}: ${sug}`);
                      setError(null);
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-[#141A15] border border-white/10 text-[#A5B0A6] hover:text-[#C8FF2E] hover:border-[#C8FF2E]/40 transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: SCHEDULE & INTERACTIVE NAGA CITY LOCATION PINPOINTER
           ========================================================================= */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-[#C8FF2E]/20 text-[#C8FF2E] text-[10px] font-bold uppercase tracking-wider">
                  Pilot Testing Area
                </span>
                <span className="text-xs text-[#A5B0A6]">Naga City, Cam. Sur</span>
              </div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                When &amp; where to play?
              </h2>
              <p className="text-xs text-[#A5B0A6]">
                Tap anywhere on the Naga map to pinpoint the exact pitch or court.
              </p>
            </div>

            {/* Schedule Selector */}
            <div>
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
                Kickoff Date &amp; Time
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isTooLateToday}
                  onClick={() => {
                    setScheduleMode('today');
                    setDate(`Today (${defaultTodayTime})`);
                  }}
                  className={`h-11 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all press-scale ${
                    isTooLateToday
                      ? 'bg-[#141A15] border-white/5 text-[#6F7B71] opacity-40 cursor-not-allowed'
                      : scheduleMode === 'today'
                      ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-sm'
                      : 'bg-[#1C241E] border-white/10 text-[#A5B0A6]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Today {defaultTodayTime}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleMode('tomorrow');
                    setDate('Tomorrow (18:00)');
                  }}
                  className={`h-11 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-scale ${
                    scheduleMode === 'tomorrow'
                      ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-sm'
                      : 'bg-[#1C241E] border-white/10 text-[#A5B0A6]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Tomorrow 18:00</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleMode('custom');
                    setDate(`${customDate} (${customTime})`);
                  }}
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

              {/* Custom Date & Time Picker */}
              {scheduleMode === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2 p-2.5 rounded-2xl bg-[#141A15] border border-white/10">
                  <div>
                    <label className="text-[10px] text-[#A5B0A6] block mb-1">Pick Date</label>
                    <input
                      type="date"
                      min={todayISO}
                      value={customDate}
                      onChange={(e) => handleCustomScheduleChange(e.target.value, customTime)}
                      className="w-full h-10 px-2.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#A5B0A6] block mb-1">Pick Time</label>
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => handleCustomScheduleChange(customDate, e.target.value)}
                      className="w-full h-10 px-2.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Naga Location Pinpointing & Venue Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center gap-1.5">
                  <span>Pinpoint Location (Naga City)</span>
                  <span className="text-[#C8FF2E]">*</span>
                </label>
                {isResolvingLocation && (
                  <span className="text-[10px] text-[#C8FF2E] flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Resolving...
                  </span>
                )}
              </div>

              {/* Location Input with MapPin Icon */}
              <div className="relative mb-2">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C8FF2E]">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => {
                    setLocationName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Jesse M. Robredo Coliseum, Naga City"
                  className="w-full h-12 pl-10 pr-9 rounded-2xl bg-[#1C241E] border border-white/10 text-xs sm:text-sm text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none transition-all truncate"
                />
                {locationName && (
                  <button
                    type="button"
                    onClick={() => setLocationName('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#65756B] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Naga City Prominent Venues Quick Chips */}
              <div className="mb-2">
                <span className="text-[10px] font-semibold text-[#A5B0A6] block mb-1">
                  Quick Select Naga Facilities &amp; Hubs:
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {NAGA_SPORTS_VENUES.map((venue) => {
                    const isSelected = selectedVenueId === venue.id;
                    return (
                      <button
                        key={venue.id}
                        type="button"
                        onClick={() => handleSelectNagaVenue(venue)}
                        className={`text-[11px] px-3 py-1.5 rounded-full border shrink-0 transition-all press-scale flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold shadow-sm'
                            : 'bg-[#141A15] text-[#A5B0A6] border-white/10 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <MapPin className={`w-3 h-3 ${isSelected ? 'text-[#0B0F0C]' : 'text-[#C8FF2E]'}`} />
                        <span>{venue.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Naga Leaflet Pinpoint Map Container */}
              <div className="w-full h-56 sm:h-64 rounded-2xl border border-white/15 overflow-hidden relative shadow-lg bg-[#141A15]">
                {/* Real interactive Leaflet Map canvas */}
                <div ref={mapContainerRef} className="w-full h-full z-0" />

                {/* Map Floating Control Overlay: Locate Me & Center Naga */}
                <div className="absolute top-2.5 right-2.5 z-[400] flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    title="Find my current location"
                    className="h-8 px-2.5 rounded-xl bg-[#0B0F0C]/90 backdrop-blur-md border border-white/15 text-[#C8FF2E] text-[11px] font-bold flex items-center gap-1 shadow-md hover:bg-[#141A15] transition-all press-scale disabled:opacity-50"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5" />
                    )}
                    <span>Locate</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCenterNaga}
                    title="Center on Naga City Center"
                    className="h-8 px-2.5 rounded-xl bg-[#0B0F0C]/90 backdrop-blur-md border border-white/15 text-[#A5B0A6] hover:text-white text-[11px] font-semibold flex items-center gap-1 shadow-md hover:bg-[#141A15] transition-all press-scale"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#C8FF2E]" />
                    <span>Naga</span>
                  </button>
                </div>

                {/* Bottom Map Info Pill: Coordinates & Tap Instruction */}
                <div className="absolute bottom-2 left-2 right-2 z-[400] pointer-events-none">
                  <div className="bg-[#0B0F0C]/90 backdrop-blur-md border border-[#C8FF2E]/30 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px] text-[#F4F7F0] shadow-md">
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="w-2 h-2 rounded-full bg-[#C8FF2E] animate-ping" />
                      <span className="font-mono text-[10px] text-[#A5B0A6] truncate">
                        {coordinates[0].toFixed(4)}°N, {coordinates[1].toFixed(4)}°E
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#C8FF2E] shrink-0 ml-1">
                      Tap map to pin
                    </span>
                  </div>
                </div>

                {/* Temporary Notice Banner */}
                {locateNotice && (
                  <div className="absolute top-2.5 left-2.5 right-24 z-[450] bg-[#0B0F0C]/95 border border-[#C8FF2E] text-[#C8FF2E] text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-lg animate-in fade-in">
                    {locateNotice}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 3: ROSTER, CAPACITY & COST SPLIT
           ========================================================================= */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                Roster capacity &amp; fee
              </h2>
              <p className="text-xs text-[#A5B0A6] mt-0.5">
                Set max attendee spots and optional court fee cost-split.
              </p>
            </div>

            {/* Total Spots Stepper Card (Mobile Aligned) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between gap-3">
              <div>
                <span className="font-display font-bold text-sm text-[#F4F7F0] block">
                  Total Spots
                </span>
                <span className="text-xs text-[#A5B0A6]">Min 2, Max 24 players</span>
              </div>
              <Stepper
                value={playersCount}
                onChange={setPlayersCount}
                min={2}
                max={24}
                unit="spots"
              />
            </div>

            {/* Skill Level Selection */}
            <div>
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
                Target Skill Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSkillLevel('Casual')}
                  className={`p-3 rounded-2xl border text-left transition-all press-scale ${
                    skillLevel === 'Casual'
                      ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E]'
                      : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                  }`}
                >
                  <span className="font-display font-bold text-xs block">Casual Run</span>
                  <span className="text-[10px] opacity-80">All levels, fun &amp; welcoming</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSkillLevel('Competitive')}
                  className={`p-3 rounded-2xl border text-left transition-all press-scale ${
                    skillLevel === 'Competitive'
                      ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E]'
                      : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                  }`}
                >
                  <span className="font-display font-bold text-xs block">Competitive</span>
                  <span className="text-[10px] opacity-80">Fast-paced, regular players</span>
                </button>
              </div>
            </div>

            {/* Cost Split Toggle & Stepper Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
              <Toggle
                checked={splitCost}
                onChange={setSplitCost}
                label="Split Court Fee"
                sublabel="Share venue rental fee per attendee"
                className="w-full"
              />
              {splitCost && (
                <div className="pt-2.5 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#A5B0A6] block font-semibold">Fee per attendee:</span>
                    <span className="text-[10px] text-[#6F7B71]">Philippine Pesos (₱)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#C8FF2E]">{APP_CONFIG.currency}</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={pricePerPlayer}
                      onChange={(e) => setPricePerPlayer(Math.max(0, Number(e.target.value) || 0))}
                      className="w-24 h-10 px-3 rounded-xl bg-[#1C241E] border border-white/10 text-sm font-mono font-bold text-[#F4F7F0] text-right focus:border-[#C8FF2E] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Checklist Reminder */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#141A15] border border-white/5">
              <Toggle
                checked={bringBootsNote}
                onChange={setBringBootsNote}
                label="Checklist: Athletic Gear &amp; Water"
                sublabel="Remind attendees to bring athletic footwear and hydration"
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 4: REVIEW & PUBLISH
           ========================================================================= */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                Review &amp; publish
              </h2>
              <p className="text-xs text-[#A5B0A6] mt-0.5">
                Review your match details before publishing to the Naga discovery feed.
              </p>
            </div>

            {/* Review Card */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#141A15] border border-[#C8FF2E]/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-bold text-[10px] uppercase">
                  {sport}
                </span>
                <span className="text-xs font-bold text-[#3DDC84]">
                  {playersCount} Spots • {skillLevel}
                </span>
              </div>

              <h3 className="font-display font-bold text-base sm:text-lg text-[#F4F7F0] leading-snug">
                {title}
              </h3>

              <div className="text-xs text-[#A5B0A6] space-y-1.5 pt-1 border-t border-white/5">
                <p className="flex items-center gap-1.5">
                  <span className="text-[#C8FF2E]">📍</span>
                  <span className="text-[#F4F7F0] font-medium truncate">{locationName}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-[#C8FF2E]">⏰</span>
                  <span>{date}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-[#C8FF2E]">💵</span>
                  <span>
                    {splitCost
                      ? `${APP_CONFIG.currency}${pricePerPlayer} / player split`
                      : 'Free open pickup game'}
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-[#C8FF2E]">🎯</span>
                  <span className="text-[11px] font-mono text-[#6F7B71]">
                    Coords: {coordinates[0].toFixed(4)}°N, {coordinates[1].toFixed(4)}°E (Naga City)
                  </span>
                </p>
              </div>
            </div>

            {/* Visibility Pills */}
            <div>
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
                Visibility
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Public', 'Friends', 'Invite'] as const).map((v) => {
                  const label = v === 'Friends' ? 'Friends Only' : v === 'Invite' ? 'Invite Only' : 'Public Feed';
                  const isSelected = visibility === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVisibility(v)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold border text-center transition-all press-scale ${
                        isSelected
                          ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                          : 'bg-[#1C241E] text-[#A5B0A6] border-white/5'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 5: SUCCESS CELEBRATION
           ========================================================================= */}
        {step === 5 && (
          <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center mx-auto shadow-[0_0_36px_rgba(200,255,46,0.4)]">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            <div>
              <span className="text-xs font-bold text-[#3DDC84] uppercase tracking-widest block mb-1">
                Match Live on Feed
              </span>
              <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
                Game Created!
              </h2>
              <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto mt-1">
                Your match has been pinned in Naga City and published to player discovery.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/10 max-w-xs mx-auto text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A5B0A6]">Match:</span>
                <span className="text-[#C8FF2E] font-bold truncate max-w-[150px]">{title}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A5B0A6]">Location:</span>
                <span className="text-white truncate max-w-[150px]">{locationName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A5B0A6]">Spots:</span>
                <span className="text-white font-mono">{playersCount} capacity</span>
              </div>
              <Button
                variant="social"
                size="sm"
                leftIcon={<Share2 className="w-4 h-4" />}
                className="w-full text-xs font-bold mt-2"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(
                      `Join my ${sport} pickup game: ${title} at ${locationName}! (SportSync Naga City)`
                    );
                  }
                }}
              >
                Share Match Invite
              </Button>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={onFinish || onClose}
                className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)]"
              >
                Open Match Room &amp; Roster
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          STICKY BOTTOM CTA BUTTON FOR STEPS 1-4 (MOBILE ALIGNED)
         ========================================================================= */}
      {step < 5 && (
        <div className="sticky bottom-0 z-20 w-full px-4 py-3 sm:px-5 bg-gradient-to-t from-[#0B0F0C] via-[#0B0F0C]/95 to-transparent border-t border-white/5">
          <Button
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            onClick={handleNext}
            rightIcon={step < 4 ? <ArrowRight className="w-5 h-5" /> : undefined}
            className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)] min-h-[48px]"
          >
            {isSubmitting
              ? 'Saving & Publishing...'
              : step === 4
              ? 'Publish Match to Naga Feed'
              : 'Next Step'}
          </Button>
        </div>
      )}
    </div>
  );
};
