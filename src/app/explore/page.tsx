'use client';

import React, { useState, useMemo } from 'react';
import { useMonkeyStore } from '@/lib/store';
import { FilterBar } from '@/components/explore/FilterBar';
import { VenueCard } from '@/components/explore/VenueCard';
import { VenueMap } from '@/components/explore/VenueMap';
import { MascotBanner } from '@/components/mascot/MascotBanner';
import { Venue } from '@/types';

export default function ExplorePage() {
  const { venues, currentUser } = useMonkeyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('all');
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
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-3xl font-black text-[#1A241E] tracking-tight">
            Explore Courts &amp; Venues
          </h1>
          <span className="rounded-full bg-[#2D724E]/10 px-2.5 py-0.5 text-xs font-bold text-[#2D724E]">
            {filteredVenues.length} hubs active
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#65756B] mt-1">
          Discover badminton doubles &amp; singles centers, pickleball clubs, and padel arenas across Metro Manila.
        </p>
      </div>

      {/* Mascot banter banner */}
      <MascotBanner
        mood="hype"
        title="Matchi Scout"
        message="Looking for doubles rotations or private court slots? We’ve verified courts with Taraflex flooring and full payment flexibility!"
        equippedGear={currentUser.equipped_gear}
      />

      {/* Filter and View Controller */}
      <div className="rounded-3xl border border-[#E8E5DF] bg-white p-3.5 sm:p-5 shadow-sm">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSport={selectedSport}
          onSportChange={setSelectedSport}
          selectedFormat={selectedFormat}
          onFormatChange={setSelectedFormat}
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
            <div className="rounded-3xl border border-dashed border-[#D4CEBE] bg-white p-8 sm:p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBF0E6] text-2xl font-black text-[#C87D43]">
                M
              </div>
              <h3 className="mt-3 text-sm sm:text-base font-black text-[#1A241E]">
                Nothing here yet. Let&apos;s find you another court!
              </h3>
              <p className="mt-1 text-xs text-[#65756B] max-w-sm mx-auto">
                No venues match your current filters. Try selecting &ldquo;All Sports&rdquo; or clearing your search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSport('all');
                  setSelectedFormat('all');
                  setSelectedLevel('all_levels');
                }}
                className="mt-4 px-4 py-2.5 rounded-xl bg-[#2D724E] text-white text-xs font-bold shadow-sm min-h-[42px]"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
