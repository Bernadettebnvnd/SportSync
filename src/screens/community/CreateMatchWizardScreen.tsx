'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Copy,
  Lock,
  Link as LinkIcon,
} from 'lucide-react';
import { FRIENDS } from '../../mock/mockData';
import { UserAvatar } from '../../illustrations/Avatars';
import { AvatarId, CommunityGame } from '../../mock/types';
import type * as LeafletType from 'leaflet';
import { Button } from '../../design-system/components/Button';
import { Stepper, Toggle } from '../../design-system/components/SegmentedControl';
import { DateStrip, generateUpcomingDates } from '../../design-system/components/DateStrip';
import { APP_CONFIG } from '../../config/appConfig';
import { defaultGeocodingProvider } from '../../lib/maps/provider';
import { copyToClipboard, shareMatch } from '../../lib/shareUtils';

export interface LocationSuggestionItem {
  id: string;
  title: string;
  subtitle: string;
  coordinates: [number, number];
  isLandmark?: boolean;
}

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

export async function reverseGeocodeNaga(lat: number, lng: number): Promise<string> {
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
    locationDetails?: string;
    playersCount: number;
    skillLevel: 'Casual' | 'Competitive';
    pricePerPlayer: number;
    notes?: string;
    coordinates?: [number, number];
    visibility?: 'Public' | 'Friends' | 'Invite';
    inviteCode?: string;
    invitedPlayers?: Array<{ id: string; name: string; avatarId?: AvatarId }>;
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
  const [title, setTitle] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'today' | 'tomorrow' | 'custom'>(isTooLateToday ? 'tomorrow' : 'today');
  const [date, setDate] = useState(() => isTooLateToday ? `Tomorrow (18:00)` : `Today (${defaultTodayTime})`);
  const [customDate, setCustomDate] = useState(() => isTooLateToday ? tomorrowISO : todayISO);
  const [customTime, setCustomTime] = useState(() => isTooLateToday ? '18:00' : defaultTodayTime);

  // Location states in Naga City
  const [locationName, setLocationName] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>(NAGA_SPORTS_VENUES[0].coordinates);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [locationSearchQuery, setLocationSearchQuery] = useState(
    ''
  );
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestionItem[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
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
  const [inviteCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedPublicShare, setCopiedPublicShare] = useState(false);

  const toggleInvitedFriend = (friendId: string) => {
    setInvitedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const persistDraftInvitation = useCallback(async () => {
    if (visibility !== 'Invite' || !inviteCode || typeof window === 'undefined') return;
    const matchTime = scheduleMode === 'today'
      ? defaultTodayTime
      : scheduleMode === 'tomorrow'
      ? '18:00'
      : customTime;
    const dateLabel = scheduleMode === 'today'
      ? 'Today'
      : scheduleMode === 'tomorrow'
      ? 'Tomorrow'
      : customDate;
    const draftGame: CommunityGame = {
      id: 'game_' + inviteCode,
      sport: (sport as any) || 'Basketball',
      title: title.trim() || (sport + ' Match'),
      format: (playersCount <= 4 ? '2v2 Doubles' : '5v5') as any,
      skillLevel: skillLevel || 'Casual',
      date: dateLabel,
      time: matchTime,
      locationName: locationName.trim() || 'Naga City Venue',
      locationDetails: locationDetails.trim() || undefined,
      distance: 'Naga City • 0.5 km away',
      hostName: 'Organizer',
      hostAvatar: 'alex',
      spotsTotal: playersCount,
      spotsJoined: 1,
      pricePerPlayer: splitCost ? pricePerPlayer : 0,
      notes: bringBootsNote ? 'Bring proper athletic gear and hydration' : 'Organized via SportSync Matchmaking',
      coordinates,
      isPublic: false,
      visibility: 'Invite',
      inviteCode,
      members: [{ name: 'Organizer', avatar: 'alex' }],
    };
    try {
      await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: draftGame }),
      });
    } catch {}
  }, [visibility, inviteCode, scheduleMode, defaultTodayTime, customTime, customDate, sport, title, playersCount, skillLevel, locationName, locationDetails, splitCost, pricePerPlayer, bringBootsNote, coordinates]);

  useEffect(() => {
    if (visibility === 'Invite' && (step === 4 || step === 5)) {
      persistDraftInvitation();
    }
  }, [visibility, step, persistDraftInvitation]);

  const handleCopyInviteLink = async () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/?invite=${inviteCode}`
      : `https://sportsync.ph/?invite=${inviteCode}`;
    await persistDraftInvitation();
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    }
  };

  const handleSharePublicMatch = async () => {
    await shareMatch(
      {
        id: inviteCode,
        title,
        sport,
        locationName,
        inviteCode,
      },
      () => {
        setCopiedPublicShare(true);
        setTimeout(() => setCopiedPublicShare(false), 2500);
      }
    );
  };

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
        setShowLocationDropdown(false);
        setIsResolvingLocation(true);
        const name = await reverseGeocodeNaga(pos.lat, pos.lng);
        setLocationName(name);
        setLocationSearchQuery(name);
        setIsResolvingLocation(false);
        setError(null);
      });

      // When clicking or tapping anywhere on the Naga map to pinpoint:
      map.on('click', async (e: LeafletType.LeafletMouseEvent) => {
        const newCoords: [number, number] = [e.latlng.lat, e.latlng.lng];
        marker.setLatLng(e.latlng);
        setCoordinates(newCoords);
        setSelectedVenueId('');
        setShowLocationDropdown(false);
        map.panTo(e.latlng, { animate: true, duration: 0.4 });
        setIsResolvingLocation(true);
        const name = await reverseGeocodeNaga(e.latlng.lat, e.latlng.lng);
        setLocationName(name);
        setLocationSearchQuery(name);
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
    setLocationSearchQuery(venue.name);
    setSelectedVenueId(venue.id);
    setShowLocationDropdown(false);
    setError(null);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(venue.coordinates, 16, { duration: 0.8 });
      if (markerRef.current) {
        markerRef.current.setLatLng(venue.coordinates);
      }
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle location search as player types with Map API integration
  const handleLocationInputChange = (val: string) => {
    setLocationSearchQuery(val);
    setLocationName(val);
    if (error) setError(null);

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

      // 1. Local matching for Naga sports facilities & landmarks
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

      // 2. Query Map API provider (Nominatim / Geocoding API)
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

      // 3. Deduplicate
      const combined = [...localMatches];
      for (const item of apiMatches) {
        const alreadyExists = combined.some(
          (c) =>
            calculateDistance(c.coordinates[0], c.coordinates[1], item.coordinates[0], item.coordinates[1]) < 0.2 ||
            c.title.toLowerCase() === item.title.toLowerCase()
        );
        if (!alreadyExists) {
          combined.push(item);
        }
      }

      setLocationSuggestions(combined.slice(0, 6));
      setIsSearchingLocation(false);
    }, 280);
  };

  // Select location suggestion and accurately fly & pin map
  const handleSelectSuggestedLocation = (item: LocationSuggestionItem) => {
    setLocationName(item.title);
    setLocationSearchQuery(item.title);
    setCoordinates(item.coordinates);
    setSelectedVenueId(item.id);
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
    setError(null);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(item.coordinates, 16, { duration: 0.8 });
      if (markerRef.current) {
        markerRef.current.setLatLng(item.coordinates);
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

  const handleCustomScheduleChange = (dStr: string, tStr: string) => {
    const validDate = dStr < todayISO ? todayISO : dStr;
    setCustomDate(validDate);
    setCustomTime(tStr);
    setDate(`${validDate} (${tStr})`);
  };

  const adjustCustomDateByDays = (deltaDays: number) => {
    const parts = (customDate || todayISO).split('-').map(Number);
    const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
    d.setDate(d.getDate() + deltaDays);
    const nextISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    handleCustomScheduleChange(nextISO < todayISO ? todayISO : nextISO, customTime);
  };

  const adjustCustomTimeByMinutes = (deltaMins: number) => {
    const [rawH, rawM] = (customTime || '18:00').split(':').map(Number);
    const h = Number.isFinite(rawH) ? rawH : 18;
    const m = Number.isFinite(rawM) ? rawM : 0;
    const clamped = Math.max(0, Math.min(23 * 60 + 45, h * 60 + m + deltaMins));
    const nextTime = `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
    handleCustomScheduleChange(customDate, nextTime);
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

      const dateLabel = scheduleMode === 'today'
        ? 'Today'
        : scheduleMode === 'tomorrow'
        ? 'Tomorrow'
        : customDate;

      const formattedSchedule = `${dateLabel} • ${matchTime}`;

      await onMatchCreated({
        sport,
        title: title.trim(),
        date: dateLabel,
        time: matchTime,
        formattedDate: formattedSchedule,
        locationName: locationName.trim(),
        locationDetails: locationDetails.trim() || undefined,
        playersCount,
        skillLevel,
        pricePerPlayer: splitCost ? pricePerPlayer : 0,
        notes: bringBootsNote ? 'Bring proper athletic gear and hydration' : 'Organized via SportSync Matchmaking',
        coordinates,
        visibility,
        inviteCode: visibility === 'Invite' ? inviteCode : undefined,
        invitedPlayers:
          visibility === 'Invite'
            ? FRIENDS.filter((f) => invitedFriendIds.includes(f.id)).map((f) => ({
                id: f.id,
                name: f.name,
                avatarId: f.avatarId,
              }))
            : undefined,
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
                placeholder="e.g. 5v5 Sunset Pickup Game" autoComplete="off"
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

              {scheduleMode === 'custom' && (
                <div className="mt-2 p-3 rounded-2xl bg-[#141A15] border border-white/10 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6]">Select Date</span>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Previous day"
                          disabled={customDate <= todayISO}
                          onClick={() => adjustCustomDateByDays(-1)}
                          className="h-7 px-2.5 rounded-lg bg-[#1C241E] border border-white/10 text-xs font-bold text-[#F4F7F0] disabled:opacity-30"
                        >
                          -1d
                        </button>
                        <span className="text-xs font-mono font-bold text-[#C8FF2E] px-1">{customDate}</span>
                        <button
                          type="button"
                          aria-label="Next day"
                          onClick={() => adjustCustomDateByDays(1)}
                          className="h-7 px-2.5 rounded-lg bg-[#1C241E] border border-white/10 text-xs font-bold text-[#F4F7F0] hover:border-[#C8FF2E]"
                        >
                          +1d
                        </button>
                        <button
                          type="button"
                          aria-label="Next week"
                          onClick={() => adjustCustomDateByDays(7)}
                          className="h-7 px-2 rounded-lg bg-[#1C241E] border border-white/10 text-[11px] font-bold text-[#A5B0A6] hover:text-[#C8FF2E]"
                        >
                          +7d
                        </button>
                      </div>
                    </div>
                    <DateStrip
                      dates={generateUpcomingDates(14)}
                      selectedId={customDate}
                      onSelect={(iso) => handleCustomScheduleChange(iso, customTime)}
                      showCalendarPicker={false}
                    />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6]">Select Kickoff Time</span>
                      <div className="inline-flex items-center bg-[#1C241E] border border-white/10 rounded-xl p-0.5 gap-1.5">
                        <button
                          type="button"
                          aria-label="Earlier kickoff time"
                          disabled={customTime <= '00:00'}
                          onClick={() => adjustCustomTimeByMinutes(-15)}
                          className="w-7 h-7 rounded-lg bg-[#263028] text-xs font-bold text-[#F4F7F0] disabled:opacity-30"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-[#C8FF2E] px-1.5 tabular-nums">{customTime}</span>
                        <button
                          type="button"
                          aria-label="Later kickoff time"
                          disabled={customTime >= '23:45'}
                          onClick={() => adjustCustomTimeByMinutes(15)}
                          className="w-7 h-7 rounded-lg bg-[#C8FF2E] text-xs font-bold text-[#0B0F0C] disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['07:00', '09:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00'].map((slot) => {
                        const activeSlot = customTime === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            aria-pressed={activeSlot}
                            onClick={() => handleCustomScheduleChange(customDate, slot)}
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

              {/* Location Input with MapPin Icon & Map API Dropdown */}
              <div ref={searchContainerRef} className="relative mb-2 z-[450]">
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
                    placeholder="Search venue or address (e.g. Robredo Coliseum, Pacol, Naga City)..." autoComplete="off"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#65756B] hover:text-white transition-colors cursor-pointer"
                      title="Clear location search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown from Map API & Landmarks */}
                {showLocationDropdown && (locationSuggestions.length > 0 || isSearchingLocation) && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl border border-white/10 bg-[#141A15]/98 backdrop-blur-xl shadow-2xl p-1.5 space-y-1 max-h-60 overflow-y-auto no-scrollbar z-[500]">
                    {isSearchingLocation && locationSuggestions.length === 0 && (
                      <div className="p-3 text-xs text-[#A5B0A6] flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 text-[#C8FF2E] animate-spin" />
                        <span>Searching Map API...</span>
                      </div>
                    )}
                    {locationSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSuggestedLocation(item)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-[#1C241E] flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#0B0F0C] border border-white/5 flex items-center justify-center text-[#C8FF2E] shrink-0 group-hover:border-[#C8FF2E]/40 group-hover:scale-105 transition-all">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#F4F7F0] truncate group-hover:text-[#C8FF2E]">
                                {item.title}
                              </span>
                              {item.isLandmark && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#C8FF2E]/15 text-[#C8FF2E] border border-[#C8FF2E]/30 font-bold shrink-0">
                                  Venue
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#A5B0A6] block truncate">
                              {item.subtitle}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#C8FF2E] font-semibold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          Pin to map &rarr;
                        </span>
                      </button>
                    ))}
                  </div>
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

              <div className="mt-3">
                <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider flex items-center justify-between mb-1.5">
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
                <div className="pt-2.5 border-t border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-[#A5B0A6] block font-semibold">Fee per attendee:</span>
                      <span className="text-[10px] text-[#6F7B71]">Philippine Pesos (₱)</span>
                    </div>
                    <Stepper
                      value={pricePerPlayer}
                      onChange={setPricePerPlayer}
                      min={0}
                      max={5000}
                      step={10}
                      prefix={APP_CONFIG.currency}
                      ariaLabel="fee per attendee"
                    />
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[50, 100, 150, 200, 250, 350].map((preset) => {
                      const isPresetSelected = pricePerPlayer === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          aria-pressed={isPresetSelected}
                          onClick={() => setPricePerPlayer(preset)}
                          className={`py-1.5 rounded-xl text-[11px] font-mono font-semibold border transition-all press-scale ${
                            isPresetSelected
                              ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold shadow-sm'
                              : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {APP_CONFIG.currency}{preset}
                        </button>
                      );
                    })}
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
                  <span className="text-[#F4F7F0] font-medium truncate">{locationName}{locationDetails ? ` • ${locationDetails}` : ''}</span>
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
                <p className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
                  <span className="text-xs text-[#F4F7F0] font-medium">
                    {visibility === 'Invite'
                      ? 'Invite Only (Hidden from public feed)'
                      : visibility === 'Friends'
                      ? 'Friends Only'
                      : 'Public Feed'}
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

            {visibility === 'Invite' && (
              <div className="p-4 rounded-2xl bg-[#141A15] border border-[#C8FF2E]/30 space-y-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 flex items-center justify-center shrink-0 text-[#C8FF2E] mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-xs text-[#F4F7F0] block">
                      Invite-Only Access
                    </span>
                    <p className="text-[11px] text-[#A5B0A6] leading-relaxed mt-0.5">
                      Only players with your private invite link or invited friends can view and join this match. It will not be shown on the public discovery feed.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                    Shareable Invitation Link
                  </span>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0B0F0C] border border-white/10">
                    <LinkIcon className="w-4 h-4 text-[#C8FF2E] shrink-0 ml-1" />
                    <span className="text-xs font-mono text-[#F4F7F0] truncate flex-1 select-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/?invite=${inviteCode}` : `https://sportsync.ph/?invite=${inviteCode}`}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all press-scale flex items-center gap-1.5 shrink-0 ${copiedInvite ? 'bg-[#3DDC84] text-[#0B0F0C]' : 'bg-[#C8FF2E] text-[#0B0F0C] hover:bg-[#d4ff52]'}`}
                    >
                      {copiedInvite ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                      Invite Friends Directly
                    </span>
                    {invitedFriendIds.length > 0 && (
                      <span className="text-[10px] font-bold text-[#C8FF2E] font-mono">
                        {invitedFriendIds.length} selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {FRIENDS.slice(0, 5).map((f) => {
                      const isInvited = invitedFriendIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleInvitedFriend(f.id)}
                          className={`p-2 rounded-2xl border flex flex-col items-center shrink-0 transition-all press-scale ${isInvited ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]' : 'bg-[#0B0F0C] border-white/5 text-[#A5B0A6]'}`}
                        >
                          <div className="relative">
                            <UserAvatar id={f.avatarId} name={f.name} size={32} />
                            {isInvited && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center">
                                <Check className="w-2 h-2 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] mt-1 truncate max-w-[54px] font-medium">
                            {f.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
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
                <span className="text-white truncate max-w-[150px]">{locationName}{locationDetails ? ` (${locationDetails})` : ''}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A5B0A6]">Spots:</span>
                <span className="text-white font-mono">{playersCount} capacity</span>
              </div>
              {visibility === 'Invite' ? (
                <Button
                  variant="social"
                  size="sm"
                  leftIcon={copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  className="w-full text-xs font-bold mt-2"
                  onClick={handleCopyInviteLink}
                >
                  {copiedInvite ? 'Invite Link Copied!' : 'Copy Private Invite Link'}
                </Button>
              ) : (
                <Button
                  variant="social"
                  size="sm"
                  leftIcon={copiedPublicShare ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Share2 className="w-4 h-4" />}
                  className="w-full text-xs font-bold mt-2"
                  onClick={handleSharePublicMatch}
                >
                  {copiedPublicShare ? 'Match Link Copied!' : 'Share Match Invite'}
                </Button>
              )}
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
              ? visibility === 'Invite'
                ? 'Publish Invite-Only Match'
                : 'Publish Match to Naga Feed'
              : 'Next Step'}
          </Button>
        </div>
      )}
    </div>
  );
};
