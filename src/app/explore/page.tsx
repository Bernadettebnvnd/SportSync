'use client';

import React, { useState, useMemo } from 'react';
import { useMonkeyStore } from '@/lib/store';
import { FilterBar } from '@/components/explore/FilterBar';
import { VenueCard } from '@/components/explore/VenueCard';
import { VenueMap } from '@/components/explore/VenueMap';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { Venue } from '@/types';
import { Compass, Sparkles } from 'lucide-react';

export default function ExplorePage() {
  const { venues, currentUser } = useMonkeyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all_levels');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedVenueId, setSelectedVenueId] = useState<string | undefined>();

  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = venue.name.toLowerCase().includes(q);
        const matchesCity = venue.city.toLowerCase().includes(q);
        const matchesAddress = venue.address.toLowerCase().includes(q);
        if (!matchesName && !matchesCity && !matchesAddress) return false;
      }

      // Sport filter
      if (selectedSport !== 'all') {
        const matchesSport = venue.featured_sports.includes(selectedSport as any);
        if (!matchesSport) return false;
      }

      return true;
    });
  }, [venues, searchQuery, selectedSport]);

  const handleLocateOnMap = (venue: Venue) => {
    setSelectedVenueId(venue.id);
    setViewMode('map');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header & Mascot microcopy */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
              Explore Courts & Venues
            </h1>
            <span className="rounded-full bg-[#1F9D55]/10 px-2.5 py-0.5 text-xs font-bold text-[#1F9D55]">
              {filteredVenues.length} hubs active
            </span>
          </div>
          <p className="text-sm text-[#6B7280] mt-1">
            Discover top-tier badminton courts, pickleball centers, and padel clubs across Metro Manila.
          </p>
        </div>
      </div>

      {/* Mascot banter banner */}
      <MascotBanner
        mood="hype"
        title="Court Scout"
        message="Looking for non-slip floors or fast queues? I’ve scouted the freshest courts in BGC, Pasig, and QC! 🏸⚡"
        equippedGear={currentUser.equipped_gear}
      />

      {/* Filter and View Controller */}
      <div className="rounded-2xl border border-[#EBEBE6] bg-white p-4 shadow-sm">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSport={selectedSport}
          onSportChange={setSelectedSport}
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* View Content: List vs Map */}
      {viewMode === 'map' ? (
        <div className="space-y-4">
          <VenueMap
            venues={filteredVenues}
            selectedVenueId={selectedVenueId}
            onSelectVenue={(v) => setSelectedVenueId(v.id)}
          />

          {/* Quick horizontal cards underneath map */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVenues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onLocateOnMap={() => setSelectedVenueId(venue.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          {filteredVenues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF5EA] text-3xl">
                🙈
              </div>
              <h3 className="mt-4 text-base font-bold text-[#171717]">
                Nothing here yet. Let’s find you another game!
              </h3>
              <p className="mt-1 text-xs text-[#6B7280] max-w-sm mx-auto">
                No venues match your current filters. Try selecting &ldquo;All Sports&rdquo; or searching a different area.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSport('all');
                  setSelectedLevel('all_levels');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#1F9D55] text-white text-xs font-bold shadow-sm"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVenues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  onLocateOnMap={() => handleLocateOnMap(venue)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
