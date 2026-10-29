'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';
import { FilterBar } from '@/components/explore/FilterBar';
import { VenueCard } from '@/components/explore/VenueCard';
import { VenueMap } from '@/components/explore/VenueMap';
import { CardSkeleton, EmptyState } from '@/components/ui/States';
import { Venue, SportType, DiscoveredFacility } from '@/types';
import { searchDiscoveredCourts } from '@/lib/maps/provider';
import { getSportDisplayName } from '@/lib/utils';
import { Compass, Navigation, MapPin, Loader2 } from 'lucide-react';

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialSport = searchParams.get('sport') || 'all';
  const initialCity = searchParams.get('city') || '';

  const { venues, isLoading } = useMatchiStore();
  const initialView = searchParams.get('view') === 'list' ? 'list' : 'map';
  const [searchQuery, setSearchQuery] = useState(initialCity);
  const [selectedSport, setSelectedSport] = useState(initialSport);
  const [viewMode, setViewMode] = useState<'list' | 'map'>(initialView);
  const [selectedVenueId, setSelectedVenueId] = useState<string | undefined>();
  const [selectedDiscoveredId, setSelectedDiscoveredId] = useState<string | undefined>();

  // Real-time map discovery state
  const [discoveredCourts, setDiscoveredCourts] = useState<DiscoveredFacility[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Fetch real-time discovered courts from OpenStreetMap based on selected sport and search query
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsDiscovering(true);
      try {
        const results = await searchDiscoveredCourts(
          selectedSport as SportType,
          searchQuery.trim() || undefined
        );
        if (active) {
          setDiscoveredCourts(results);
        }
      } catch (err) {
        console.warn('Error discovering sports courts:', err);
      } finally {
        if (active) setIsDiscovering(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedSport, searchQuery]);

  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      // Search query match (name, city, address)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = venue.name.toLowerCase().includes(q);
        const matchesCity = venue.city.toLowerCase().includes(q);
        const matchesAddress = venue.address.toLowerCase().includes(q);
        if (!matchesName && !matchesCity && !matchesAddress) return false;
      }

      // Sport filter
      if (selectedSport !== 'all') {
        const matchesSport = venue.featured_sports?.includes(selectedSport as SportType);
        if (!matchesSport) return false;
      }

      return true;
    });
  }, [venues, searchQuery, selectedSport]);

  const handleLocateOnMap = (venue: Venue) => {
    setSelectedVenueId(venue.id);
    setSelectedDiscoveredId(undefined);
    setViewMode('map');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSport('all');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-[#F4F7F0] tracking-tight">
            Courts &amp; Sports Venues
          </h1>
          <p className="text-xs sm:text-sm text-[#A5B0A6]">
            {isLoading
              ? 'Checking real-time court availability...'
              : `${filteredVenues.length} sports centers ready for booking across the Philippines`}
          </p>
        </div>
      </div>

      {/* Filter and View Controller */}
      <div className="rounded-3xl border border-white/10 bg-[#141A15] p-3.5 sm:p-5 shadow-lg">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSport={selectedSport}
          onSportChange={setSelectedSport}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* View Content: Loading Skeleton vs List vs Map vs Empty */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          <VenueMap
            venues={filteredVenues}
            discoveredFacilities={discoveredCourts}
            selectedVenueId={selectedVenueId}
            selectedDiscoveredId={selectedDiscoveredId}
            onSelectVenue={(v) => {
              setSelectedVenueId(v.id);
              setSelectedDiscoveredId(undefined);
            }}
            onSelectDiscovered={(d) => {
              setSelectedDiscoveredId(d.id);
              setSelectedVenueId(undefined);
            }}
          />

          {/* Quick summary below map */}
          <div className="flex items-center justify-between text-xs text-[#A5B0A6] px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C8FF2E]" />
              <strong className="text-[#F4F7F0]">{filteredVenues.length}</strong> available on SportSync
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <strong className="text-[#F4F7F0]">{discoveredCourts.length}</strong> discovered on map
            </span>
          </div>

          {filteredVenues.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#A5B0A6]">
                SportSync Venues
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredVenues.map((venue) => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    onLocateOnMap={() => {
                      setSelectedVenueId(venue.id);
                      setSelectedDiscoveredId(undefined);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {filteredVenues.length === 0 && discoveredCourts.length === 0 && !isLoading && !isDiscovering ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#141A15] p-8 sm:p-14 text-center">
              <EmptyState
                icon={<Compass className="w-6 h-6 text-[#C8FF2E]" />}
                title="No facilities found matching your filters"
                description="Try changing the sport or searching another city in the Philippines."
                action={{
                  label: 'Reset Filters',
                  onClick: handleResetFilters,
                }}
              />
            </div>
          ) : (
            <>
              {/* Platform Venues Section */}
              {filteredVenues.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C8FF2E]" />
                      <h2 className="text-base sm:text-lg font-black text-[#F4F7F0]">
                        Available on SportSync ({filteredVenues.length})
                      </h2>
                    </div>
                    <span className="text-xs text-[#A5B0A6] font-bold">
                      Direct booking &amp; hourly rates
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredVenues.map((venue) => (
                      <VenueCard
                        key={venue.id}
                        venue={venue}
                        onLocateOnMap={() => handleLocateOnMap(venue)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Map Discovered Facilities Section */}
              {(discoveredCourts.length > 0 || isDiscovering) && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                      <h2 className="text-base sm:text-lg font-black text-[#F4F7F0]">
                        Other Nearby Courts ({discoveredCourts.length})
                      </h2>
                      {isDiscovering && (
                        <Loader2 className="w-3.5 h-3.5 text-[#C8FF2E] animate-spin" />
                      )}
                    </div>
                    <span className="text-xs text-[#A5B0A6]">
                      Discovered via OpenStreetMap &bull; Directions &amp; location
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {discoveredCourts.map((court) => (
                      <div
                        key={court.id}
                        className="rounded-3xl border border-white/10 bg-[#141A15] p-4 sm:p-5 flex flex-col justify-between hover:border-white/20 transition-all shadow-md"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-[#C8FF2E] bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 px-2 py-0.5 rounded-md">
                              {getSportDisplayName(court.sport)}
                            </span>
                            <span className="text-[10px] font-bold text-[#A5B0A6] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
                              Map Location
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-black text-[#F4F7F0] leading-snug">
                            {court.name}
                          </h3>
                          <p className="text-xs text-[#A5B0A6] line-clamp-2 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#A5B0A6] shrink-0 mt-0.5" />
                            <span>{court.address}</span>
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-4 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDiscoveredId(court.id);
                              setSelectedVenueId(undefined);
                              setViewMode('map');
                            }}
                            className="text-xs font-bold text-[#C8FF2E] hover:text-[#b4eb25] flex items-center gap-1"
                          >
                            <span>Locate</span>
                          </button>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${court.latitude},${court.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#1C241E] text-white text-xs font-bold hover:bg-[#263028] border border-white/10 transition-colors inline-flex items-center gap-1"
                          >
                            <Navigation className="w-3 h-3 text-[#C8FF2E]" />
                            <span>Directions</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-7xl mx-auto px-4 py-12 text-center text-xs text-[#A5B0A6]">
          Loading courts...
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
