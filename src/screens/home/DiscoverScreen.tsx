'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  ChevronRight,
  Sparkles,
  MapPin,
  ArrowRight,
  Search,
  ShieldCheck,
  Compass,
  Calendar,
  Users,
  Plus,
} from 'lucide-react';
import { UserAvatar, toAvatarId } from '../../illustrations/Avatars';
import { VenueCard } from '../../design-system/components/VenueCard';
import { MatchCard } from '../../design-system/components/MatchCard';
import { Venue, CommunityGame } from '../../mock/types';
import { APP_CONFIG } from '../../config/appConfig';
import { SportIcon } from '../../illustrations/SportIcons';
import { STANDARDIZED_SPORTS } from '../../config/sports';
import { useTimeGreeting } from '../../lib/useGreeting';
import { useMatchiStore } from '../../lib/store';


export const FEATURED_CITY_FILTERS = [
  { label: '📍 Near You', value: 'near' },
  { label: 'All Cities', value: 'all' },
  { label: 'Naga City', value: 'naga' },
  { label: 'Taguig / BGC', value: 'taguig' },
  { label: 'Pasig / Ortigas', value: 'pasig' },
  { label: 'Makati', value: 'makati' },
  { label: 'Quezon City', value: 'quezon' },
  { label: 'Cebu City', value: 'cebu' },
];

export const AVAILABLE_USER_LOCATIONS = [
  'Naga City',
  'Taguig / BGC',
  'Makati',
  'Pasig',
  'Quezon City',
  'Cebu City',
  'Metro Manila',
];

function isVenueInCity(venue: Venue, cityKey: string): boolean {
  if (cityKey === 'all') return true;
  const cLower = cityKey.toLowerCase();
  const vCity = (venue.city || '').toLowerCase();
  const vAddr = (venue.address || '').toLowerCase();

  if (cLower === 'naga') return vCity.includes('naga') || vAddr.includes('naga') || vAddr.includes('camarines');
  if (cLower === 'taguig') return vCity.includes('taguig') || vAddr.includes('taguig') || vAddr.includes('bgc');
  if (cLower === 'pasig') return vCity.includes('pasig') || vAddr.includes('pasig') || vAddr.includes('ortigas');
  if (cLower === 'makati') return vCity.includes('makati') || vAddr.includes('makati') || vAddr.includes('rockwell');
  if (cLower === 'quezon') return vCity.includes('quezon') || vAddr.includes('quezon') || vCity.includes('qc');
  if (cLower === 'cebu') return vCity.includes('cebu') || vAddr.includes('cebu');

  return vCity.includes(cLower) || vAddr.includes(cLower);
}

function isVenueNearLocation(venue: Venue, locationStr: string): boolean {
  const locLower = (locationStr || '').toLowerCase().trim();
  const vCity = (venue.city || '').toLowerCase();
  const vAddr = (venue.address || '').toLowerCase();

  // If user is from Naga City or Camarines Sur:
  if (locLower.includes('naga') || locLower.includes('camarines') || locLower.includes('bicol')) {
    // Only venues in Naga City or Camarines Sur are near!
    // Manila (Pasig, Taguig, Makati, QC) and Cebu are > 250km away, so they are far and shouldn't appear
    return vCity.includes('naga') || vAddr.includes('naga') || vAddr.includes('camarines');
  }

  // If user is from Metro Manila:
  if (
    locLower.includes('manila') ||
    locLower.includes('taguig') ||
    locLower.includes('bgc') ||
    locLower.includes('pasig') ||
    locLower.includes('makati') ||
    locLower.includes('quezon') ||
    locLower.includes('ortigas')
  ) {
    const isManila =
      vCity.includes('taguig') ||
      vCity.includes('pasig') ||
      vCity.includes('makati') ||
      vCity.includes('quezon') ||
      vCity.includes('manila') ||
      vAddr.includes('metro manila');
    return isManila;
  }

  // If user is from Cebu:
  if (locLower.includes('cebu')) {
    return vCity.includes('cebu') || vAddr.includes('cebu');
  }

  return vCity.includes(locLower) || vAddr.includes(locLower);
}

interface DiscoverScreenProps {
  venues?: Venue[];
  games?: CommunityGame[];
  onSelectGame: (game: CommunityGame) => void;
  onSelectVenue: (venue: Venue) => void;
  onOpenNotifications: () => void;
  onNavigateToScores: () => void;
  onNavigateToPlay: () => void;
  onNavigateToVenues: (filters?: { query?: string; sport?: string; city?: string }) => void;
  onCreateGame?: () => void;
  onSelectMatch?: (match: any) => void;
  user?: {
    id?: string;
    name: string;
    avatarId: string;
    level: number;
    isGuest?: boolean;
    city?: string;
  };
  isGuest?: boolean;
  onRequireAuth?: (actionName?: string) => void;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  venues = [],
  games = [],
  onSelectGame,
  onSelectVenue,
  onOpenNotifications,
  onNavigateToScores,
  onNavigateToPlay,
  onNavigateToVenues,
  onCreateGame,
  user,
  isGuest = false,
  onRequireAuth,
}) => {
  const { currentUser, setAuthenticatedUser } = useMatchiStore();
  const [activeSport, setActiveSport] = useState<string>('All');
  const [courtSearchInput, setCourtSearchInput] = useState<string>('');

  // User location detection (persisted in localStorage or currentUser)
  const [userLocation, setUserLocation] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sportsync_user_location');
      if (stored) return stored;
    }
    return currentUser.city || user?.city || 'Naga City';
  });

  // Featured Courts City Filter ('near' = near user location, 'all' = All Cities, or specific city)
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('near');
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);

  React.useEffect(() => {
    if (currentUser.city && currentUser.city !== userLocation) {
      setUserLocation(currentUser.city);
    }
  }, [currentUser.city]);

  const handleSelectLocation = (newLoc: string) => {
    setUserLocation(newLoc);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_user_location', newLoc);
    }
    if (currentUser.id) {
      setAuthenticatedUser({ city: newLoc });
    }
    setShowLocationPicker(false);
  };

  const effectiveIsGuest = isGuest || !user?.id || user.isGuest;
  const userName = user?.name || (effectiveIsGuest ? 'Guest' : 'Player');

  // Time-based greeting per Phase 8
  const { salutation, fullGreeting, showName } = useTimeGreeting(userName, effectiveIsGuest);

  // Filter featured courts by active sport AND location / city filter
  // If the court is far from current location (e.g. user is in Naga, courts are in Manila/Cebu), it shouldn't appear
  // It can only be seen in filters (All Cities)
  const featuredCourts = useMemo(() => {
    return venues.filter((v) => {
      // 1. Sport filter
      if (activeSport !== 'All') {
        const sportLower = activeSport.toLowerCase();
        const primaryMatch = v.sport.toLowerCase().includes(sportLower);
        const featuredMatch = v.featuredSports?.some((s) => s.toLowerCase().includes(sportLower));
        const courtsMatch = v.courts?.some((c: any) => c.sport?.toLowerCase().includes(sportLower));
        if (!primaryMatch && !featuredMatch && !courtsMatch) return false;
      }

      // 2. City / Location filter
      if (selectedCityFilter === 'all') {
        // "All Cities": All courts appear (Naga, Manila, Cebu, etc.)
        return true;
      }

      if (selectedCityFilter === 'near') {
        // "Near You": If user is in Naga City, Camarines Sur, courts in Manila, Cebu, etc. DO NOT appear
        return isVenueNearLocation(v, userLocation);
      }

      // Specific city selected (e.g. 'naga', 'taguig', 'cebu')
      return isVenueInCity(v, selectedCityFilter);
    });
  }, [venues, activeSport, selectedCityFilter, userLocation]);

  // Filter upcoming games by active sport
  const upcomingGames = useMemo(() => {
    return games.filter((g) => {
      if (activeSport === 'All') return true;
      return g.sport.toLowerCase().includes(activeSport.toLowerCase());
    });
  }, [games, activeSport]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onNavigateToVenues({
      query: courtSearchInput.trim(),
      sport: activeSport !== 'All' ? activeSport : undefined,
    });
  };

  const handleNotificationsClick = () => {
    if (effectiveIsGuest && onRequireAuth) {
      onRequireAuth('view notifications');
      return;
    }
    onOpenNotifications();
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. SportSync Header: Avatar + Time-Based Greeting + Notification Bell */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar
            id={toAvatarId(user?.avatarId)}
            size={42}
            showBadge={!effectiveIsGuest}
            badgeLevel={user?.level || 1}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#A5B0A6]">{salutation}</span>
              {!effectiveIsGuest && (
                <span className="px-2 py-0.5 rounded-full bg-[#1C241E] text-[#C8FF2E] text-[10px] font-bold border border-white/10">
                  Lv.{user?.level || 1}
                </span>
              )}
            </div>
            {/* 2. Personalized Greeting */}
            <h2 className="font-display font-black text-base text-[#F4F7F0] tracking-tight">
              {showName ? userName : 'Player Hub'}
            </h2>
          </div>
        </div>

        <button
          onClick={handleNotificationsClick}
          aria-label="View notifications"
          className="relative w-10 h-10 rounded-full bg-[#1C241E] border border-white/10 flex items-center justify-center hover:bg-[#263028] transition-colors press-scale"
        >
          <Bell className="w-4 h-4 text-[#F4F7F0]" />
          {!effectiveIsGuest && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C8FF2E] shadow-[0_0_8px_#C8FF2E]" />
          )}
        </button>
      </header>

      {/* 3. Official SportSync Tagline: Find Players. Play Together. */}
      <div className="px-5 pt-2 pb-1">
        <h1 className="text-3xl tracking-tight leading-tight text-[#F4F7F0]">
          <span className="font-display font-bold">Find Players. </span>
          <span className="font-editorial text-[#C8FF2E] text-4xl font-normal block sm:inline">
            Play Together.
          </span>
        </h1>
      </div>

      {/* 4. PROMINENT COURT SEARCH ENTRY POINT */}
      <div className="px-5 py-2.5">
        <form
          onSubmit={handleSearchSubmit}
          className="group relative flex items-center bg-[#141A15] border border-white/10 rounded-2xl p-1.5 transition-all focus-within:border-[#C8FF2E] focus-within:ring-1 focus-within:ring-[#C8FF2E]/30 shadow-lg"
        >
          <div className="pl-3 pr-2 text-[#A5B0A6] group-focus-within:text-[#C8FF2E] transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={courtSearchInput}
            onChange={(e) => setCourtSearchInput(e.target.value)}
            placeholder="Search courts by facility, court name, city, or sport..."
            className="w-full bg-transparent text-xs sm:text-sm text-[#F4F7F0] placeholder-[#6F7B71] focus:outline-none py-1"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] text-xs font-bold flex items-center gap-1 shrink-0 hover:bg-[#d4ff52] transition-colors press-scale"
          >
            <span>Search</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* 5. Standardized Sport Categories Rail (Phase 9 Ordering) */}
      <div className="px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {STANDARDIZED_SPORTS.map((sport) => {
          const isActive = activeSport === sport;
          return (
            <button
              key={sport}
              onClick={() => setActiveSport(sport)}
              className={`h-9 px-3.5 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border press-scale ${
                isActive
                  ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] shadow-sm'
                  : 'bg-[#141A15] text-[#A5B0A6] border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              {sport !== 'All' ? (
                <SportIcon
                  sport={sport}
                  size={13}
                  color={isActive ? '#0B0F0C' : '#A5B0A6'}
                />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-current" />
              )}
              <span>{sport}</span>
            </button>
          );
        })}
      </div>

      {/* 6. FEATURED COURTS (WITH LOCATION AWARENESS & CITY FILTERING) */}
      <section className="px-5 pt-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00E599]" />
              <h3 className="font-display font-black text-base text-[#F4F7F0] tracking-tight">
                Featured Courts
              </h3>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] text-[#A5B0A6]">
                {selectedCityFilter === 'near'
                  ? `Near ${userLocation.split(',')[0]} • Live verified availability`
                  : selectedCityFilter === 'all'
                  ? 'All registered courts across the Philippines'
                  : `Courts in ${FEATURED_CITY_FILTERS.find((c) => c.value === selectedCityFilter)?.label || selectedCityFilter}`}
              </p>
              <button
                type="button"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="text-[10px] text-[#C8FF2E] hover:underline font-bold inline-flex items-center gap-0.5 press-scale"
                title="Change your current location"
              >
                <span>Change</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          <button
            onClick={() =>
              onNavigateToVenues({
                sport: activeSport !== 'All' ? activeSport : undefined,
                city: selectedCityFilter === 'near' ? (userLocation.toLowerCase().includes('naga') ? 'naga' : 'all') : selectedCityFilter,
              })
            }
            className="text-xs text-[#C8FF2E] font-bold flex items-center gap-0.5 hover:underline press-scale shrink-0"
          >
            <span>Browse All ({venues.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Location Switcher Drawer */}
        {showLocationPicker && (
          <div className="mb-3 p-3 rounded-2xl bg-[#141A15] border border-white/10 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                Select Your Location:
              </span>
              <button
                onClick={() => setShowLocationPicker(false)}
                className="text-[10px] text-[#A5B0A6] hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {AVAILABLE_USER_LOCATIONS.map((loc) => {
                const isCurrent = userLocation.toLowerCase().includes(loc.toLowerCase());
                return (
                  <button
                    key={loc}
                    onClick={() => handleSelectLocation(loc)}
                    className={`h-7 px-3 rounded-full text-xs font-semibold transition-all flex items-center gap-1 border press-scale ${
                      isCurrent
                        ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                        : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-white'
                    }`}
                  >
                    <MapPin className="w-3 h-3 text-current" />
                    <span>{loc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* City Filter Chips Rail: Near You | All Cities | Naga City | Taguig | Pasig | Makati | QC | Cebu */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 mb-3">
          {FEATURED_CITY_FILTERS.map((c) => {
            const isActive = selectedCityFilter === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setSelectedCityFilter(c.value)}
                className={`h-7 px-3 rounded-full text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 border press-scale ${
                  isActive
                    ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] shadow-sm'
                    : 'bg-[#141A15] text-[#A5B0A6] border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                {c.value === 'near' && <MapPin className="w-3 h-3 text-current" />}
                <span>
                  {c.value === 'near'
                    ? `Near You (${userLocation.split(',')[0].replace(' City', '')})`
                    : c.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Featured Courts Content: Real Cards vs Empty State */}
        {featuredCourts.length > 0 ? (
          <div className="space-y-3.5">
            {featuredCourts.slice(0, 3).map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                variant="featured"
                onClick={() => onSelectVenue(venue)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1C241E] border border-white/10 flex items-center justify-center mx-auto text-[#A5B0A6]">
              <MapPin className="w-5 h-5 text-[#C8FF2E]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                No {activeSport !== 'All' ? activeSport : ''} courts found near {userLocation.split(',')[0]}
              </h4>
              <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                Courts in Manila, Cebu, and other cities can be viewed in &quot;All Cities&quot;.
              </p>
            </div>
            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCityFilter('all')}
                className="px-4 py-2 rounded-xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-xs font-bold text-[#0B0F0C] transition-all press-scale shadow-sm"
              >
                View All Cities
              </button>
              <button
                type="button"
                onClick={() =>
                  onNavigateToVenues({
                    sport: activeSport !== 'All' ? activeSport : undefined,
                    city: 'all',
                  })
                }
                className="px-4 py-2 rounded-xl bg-[#1C241E] hover:bg-[#263028] text-xs font-bold text-[#F4F7F0] border border-white/10 transition-all"
              >
                Browse All Venues
              </button>
            </div>
          </div>
        )}

        {/* Explore All Courts Quick Link Banner */}
        <div
          onClick={() => onNavigateToVenues()}
          className="mt-3.5 p-4 rounded-2xl bg-gradient-to-r from-[#141A15] to-[#1C241E] border border-white/10 flex items-center justify-between cursor-pointer hover:border-[#C8FF2E]/40 transition-all press-scale"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 flex items-center justify-center text-[#C8FF2E]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-bold text-xs text-[#F4F7F0]">Explore All Sports Facilities</h4>
              <p className="text-[10px] text-[#A5B0A6]">Filter by 9 sports, metro cities &amp; court availability</p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#C8FF2E]">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </section>

      {/* 7. UPCOMING FOR YOU (APPEARS DIRECTLY BELOW FEATURED COURTS) */}
      <section className="px-5 pt-7">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
              Upcoming For You
            </h3>
            <p className="text-[11px] text-[#A5B0A6]">Join an active roster and get on the pitch</p>
          </div>
          <button
            onClick={onNavigateToPlay}
            className="text-xs text-[#C8FF2E] font-semibold flex items-center gap-0.5 hover:underline"
          >
            <span>Explore Games</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Upcoming Games Content: Real Games vs Meaningful Empty State */}
        {upcomingGames.length > 0 ? (
          <div className="space-y-2.5">
            {upcomingGames.slice(0, 3).map((game) => (
              <MatchCard
                key={game.id}
                game={game}
                onClick={() => onSelectGame(game)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1C241E] border border-white/10 flex items-center justify-center mx-auto text-[#A5B0A6]">
              <Users className="w-5 h-5 text-[#C8FF2E]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                No upcoming games
              </h4>
              <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                {activeSport !== 'All'
                  ? `No ${activeSport} pickup matches scheduled yet. Host a session to complete your roster!`
                  : 'You haven\'t joined a game yet. Host a match or join open rosters near you.'}
              </p>
            </div>
            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (effectiveIsGuest && onRequireAuth) {
                    onRequireAuth('create a game');
                  } else if (onCreateGame) {
                    onCreateGame();
                  } else {
                    onNavigateToPlay();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C] text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm press-scale"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create a Game</span>
              </button>
              <button
                type="button"
                onClick={onNavigateToPlay}
                className="px-4 py-2 rounded-xl bg-[#1C241E] hover:bg-[#263028] text-xs font-bold text-[#A5B0A6] hover:text-white transition-all"
              >
                Browse Feed
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
