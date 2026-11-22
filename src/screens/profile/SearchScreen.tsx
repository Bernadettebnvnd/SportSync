import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, TrendingUp, History, X, MapPin, Calendar } from 'lucide-react';
import { Venue, CommunityGame, AvatarId } from '../../mock/types';
import { UserAvatar } from '../../illustrations/Avatars';
import { useMatchiStore } from '../../lib/store';

interface SearchScreenProps {
  onBack: () => void;
  venues?: Venue[];
  games?: CommunityGame[];
  onSelectVenue?: (venue: Venue) => void;
  onSelectGame?: (game: CommunityGame) => void;
  onSelectItem?: (type: string, id: string) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onBack,
  venues: propVenues,
  games: propGames,
  onSelectVenue,
  onSelectGame,
  onSelectItem,
}) => {
  const { venues: storeVenues, sessions: storeSessions } = useMatchiStore();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(['Badminton', 'Pickleball', 'Basketball']);
  const [players, setPlayers] = useState<Array<{ id: string; name: string; avatarId: AvatarId; city?: string; sport?: string }>>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/players', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { players: [] }))
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.players) ? data.players : [];
        setPlayers(
          list.map((p: { id: string; name: string; avatarId?: string; city?: string; primarySport?: string }) => ({
            id: p.id,
            name: p.name,
            avatarId: (p.avatarId || 'alex') as AvatarId,
            city: p.city || 'Naga City',
            sport: p.primarySport || 'Player',
          }))
        );
      })
      .catch(() => {
        if (active) setPlayers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const liveVenues = useMemo<Venue[]>(() => {
    if (propVenues && propVenues.length > 0) return propVenues;
    return (storeVenues || []).map((v) => ({
      id: v.id,
      name: v.name,
      sport: ((v.featured_sports?.[0]
        ? v.featured_sports[0].charAt(0).toUpperCase() + v.featured_sports[0].slice(1)
        : 'Pickleball') as Venue['sport']),
      city: v.city || 'Naga City',
      address: v.address || 'Naga City',
      surface: v.courts?.[0]?.floor_type || 'Standard Surface',
      isIndoor: v.courts?.[0]?.is_indoor ?? true,
      pricePerHour: v.courts?.[0]?.hourly_rate_cents ? Math.round(v.courts[0].hourly_rate_cents / 100) : 350,
      rating: v.rating || 4.8,
      reviewCount: v.review_count || 0,
      image: v.images?.[0] || '',
      distanceMiles: 1.0,
      amenities: v.amenities || [],
      courtsCount: v.courts?.length || 1,
      availableSlots: ['08:00', '10:00', '14:00', '16:00', '18:00'],
      courts: v.courts || [],
    }));
  }, [propVenues, storeVenues]);

  const liveGames = useMemo<CommunityGame[]>(() => {
    if (propGames && propGames.length > 0) return propGames;
    return (storeSessions || []).map((s) => ({
      id: s.id,
      sessionId: s.id,
      sport: ((s.sport ? s.sport.charAt(0).toUpperCase() + s.sport.slice(1) : 'Pickleball') as CommunityGame['sport']),
      title: s.title,
      format: (s.rotation_format || '5v5') as CommunityGame['format'],
      skillLevel: 'Intermediate',
      date: s.start_time ? s.start_time.split('T')[0] : 'Today',
      time: s.start_time && s.start_time.includes('T') ? s.start_time.split('T')[1].slice(0, 5) : (s.start_time || '18:00'),
      locationName: s.location_details || 'Naga City',
      distance: '1.0 km',
      hostName: s.host?.full_name || 'Organizer',
      hostAvatar: 'alex',
      spotsTotal: s.max_players || 10,
      spotsJoined: s.current_players_count || 1,
      pricePerPlayer: Math.round((s.fee_cents || 0) / 100),
      notes: s.description || '',
      isPublic: true,
      members: [],
    }));
  }, [propGames, storeSessions]);

  const qLower = query.trim().toLowerCase();
  const matchingGames = liveGames.filter(
    (g) =>
      g.title.toLowerCase().includes(qLower) ||
      g.sport.toLowerCase().includes(qLower) ||
      g.locationName.toLowerCase().includes(qLower)
  );
  const matchingPlayers = players.filter(
    (p) =>
      p.name.toLowerCase().includes(qLower) ||
      (p.sport && p.sport.toLowerCase().includes(qLower))
  );
  const matchingVenues = liveVenues.filter(
    (v) =>
      v.name.toLowerCase().includes(qLower) ||
      v.sport.toLowerCase().includes(qLower) ||
      v.city.toLowerCase().includes(qLower) ||
      v.address.toLowerCase().includes(qLower)
  );

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header with Search Input */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7B71]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Naga City games, players, courts..."
            autoFocus
            className="w-full h-11 pl-10 pr-9 rounded-2xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!query ? (
        /* Empty State: Recent & Active Naga City Suggestions */
        <div className="space-y-6">
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  Quick Sport Filters
                </span>
                <button
                  onClick={() => setRecentSearches([])}
                  className="text-[10px] text-[#6F7B71] hover:text-white"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    onClick={() => setQuery(item)}
                    className="px-3 py-1.5 rounded-full bg-[#1C241E] border border-white/5 text-xs text-[#F4F7F0] hover:border-[#C8FF2E]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active in Naga City */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] flex items-center gap-1.5 mb-2.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#C8FF2E]" />
              Active in Naga City
            </span>
            {liveVenues.length === 0 && liveGames.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#141A15] border border-white/5 text-center text-xs text-[#A5B0A6]">
                No venues or open games published in Naga City yet. Search by sport or player name above.
              </div>
            ) : (
              <div className="space-y-2">
                {liveVenues.slice(0, 3).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      if (onSelectVenue) onSelectVenue(v);
                      else if (onSelectItem) onSelectItem('venue', v.id);
                      else setQuery(v.name);
                    }}
                    className="w-full p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between text-left press-scale"
                  >
                    <div>
                      <span className="text-xs font-semibold text-[#F4F7F0] block">{v.name}</span>
                      <span className="text-[10px] text-[#A5B0A6] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#C8FF2E]" />
                        {v.address || v.city}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#C8FF2E]">₱{v.pricePerHour}/hr</span>
                  </button>
                ))}
                {liveGames.slice(0, 3).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      if (onSelectGame) onSelectGame(g);
                      else if (onSelectItem) onSelectItem('game', g.id);
                      else setQuery(g.title);
                    }}
                    className="w-full p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between text-left press-scale"
                  >
                    <div>
                      <span className="text-xs font-semibold text-[#F4F7F0] block">{g.title}</span>
                      <span className="text-[10px] text-[#A5B0A6] flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-[#C8FF2E]" />
                        {g.sport} • {g.date} • {g.time}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#A5B0A6]">
                      {g.spotsJoined}/{g.spotsTotal} joined
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Categorized Results */
        <div className="space-y-5">
          {matchingGames.length === 0 && matchingPlayers.length === 0 && matchingVenues.length === 0 && (
            <div className="p-8 rounded-2xl bg-[#141A15] border border-white/5 text-center space-y-1">
              <p className="text-xs font-bold text-[#F4F7F0]">No matches found for &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-[#A5B0A6]">Try searching for another Naga City court, game title, or player.</p>
            </div>
          )}

          {/* 1. Community Games */}
          {matchingGames.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] block mb-2">
                Pickup Games &amp; Sessions
              </span>
              <div className="space-y-2">
                {matchingGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => {
                      if (onSelectGame) onSelectGame(game);
                      else onSelectItem?.('game', game.id);
                    }}
                    className="p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between cursor-pointer hover:border-white/20"
                  >
                    <div>
                      <h4 className="font-display font-bold text-xs text-[#F4F7F0]">{game.title}</h4>
                      <span className="text-[10px] text-[#A5B0A6]">
                        {game.sport} • {game.locationName} • {game.date} {game.time}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#C8FF2E]">
                      {game.spotsJoined}/{game.spotsTotal}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Players */}
          {matchingPlayers.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] block mb-2">
                Players
              </span>
              <div className="space-y-2">
                {matchingPlayers.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => onSelectItem?.('player', player.id)}
                    className="p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between cursor-pointer hover:border-white/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserAvatar id={player.avatarId} name={player.name} size={28} />
                      <div>
                        <h4 className="font-display font-bold text-xs text-[#F4F7F0]">{player.name}</h4>
                        <span className="text-[10px] text-[#A5B0A6] capitalize">{player.sport || 'Player'} • {player.city || 'Naga City'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Venues */}
          {matchingVenues.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] block mb-2">
                Courts &amp; Venues
              </span>
              <div className="space-y-2">
                {matchingVenues.map((venue) => (
                  <div
                    key={venue.id}
                    onClick={() => {
                      if (onSelectVenue) onSelectVenue(venue);
                      else onSelectItem?.('venue', venue.id);
                    }}
                    className="p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between cursor-pointer hover:border-white/20"
                  >
                    <div>
                      <h4 className="font-display font-bold text-xs text-[#F4F7F0]">{venue.name}</h4>
                      <span className="text-[10px] text-[#A5B0A6]">{venue.surface} • {venue.city}</span>
                    </div>
                    <span className="text-xs font-bold text-[#C8FF2E]">₱{venue.pricePerHour}/hr</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
