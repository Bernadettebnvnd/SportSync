import React, { useState } from 'react';
import { SearchBar } from '../../design-system/components/SearchBar';
import { VenueCard } from '../../design-system/components/VenueCard';
import { VENUES } from '../../mock/mockData';
import { Venue } from '../../mock/types';
import { MapPin, SlidersHorizontal, List, Map as MapIcon } from 'lucide-react';

interface VenuesListScreenProps {
  venues?: Venue[];
  onSelectVenue: (venue: Venue) => void;
}

export const VenuesListScreen: React.FC<VenuesListScreenProps> = ({
  venues = VENUES,
  onSelectVenue,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSurface, setActiveSurface] = useState<string>('All');
  const [activeEnvironment, setActiveEnvironment] = useState<'All' | 'Indoor' | 'Outdoor'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const filteredVenues = venues.filter((v) => {
    if (activeSurface !== 'All' && v.surface !== activeSurface) return false;
    if (activeEnvironment === 'Indoor' && !v.isIndoor) return false;
    if (activeEnvironment === 'Outdoor' && v.isIndoor) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return v.name.toLowerCase().includes(q) || v.city.toLowerCase().includes(q) || v.sport.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Header with View Mode Switcher */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl tracking-tight text-[#F4F7F0]">
            Courts & Pitches
          </h1>
          <p className="text-xs text-[#A5B0A6]">Discover & book premium venues</p>
        </div>

        {/* List / Map toggle */}
        <div className="flex bg-[#1C241E] p-1 rounded-full border border-white/10">
          <button
            onClick={() => setViewMode('list')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              viewMode === 'list' ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'text-[#A5B0A6]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              viewMode === 'map' ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'text-[#A5B0A6]'
            }`}
          >
            <MapIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Search & Surface Filter Chips */}
      <div className="px-5 py-2 space-y-2">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search clay courts, turf pitches..."
        />

        {/* Surface Filter Rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {['All', 'Clay', '3G Turf', 'Panoramic Glass', 'Grass', 'Hardcourt'].map((surface) => (
            <button
              key={surface}
              onClick={() => setActiveSurface(surface)}
              className={`h-8 px-3 rounded-full text-xs font-semibold shrink-0 transition-all border ${
                activeSurface === surface
                  ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] shadow-sm'
                  : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-white'
              }`}
            >
              {surface}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Venue Cards on Dark Canvas (Ref C Light Surface Highlight) */}
      <div className="px-5 pt-3">
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredVenues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onClick={() => onSelectVenue(venue)}
              />
            ))}
          </div>
        ) : (
          /* Map View */
          <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-white/10 bg-[#1C241E]">
            <img
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80"
              alt="Venues Map"
              className="w-full h-full object-cover filter brightness-50"
            />
            {filteredVenues.slice(0, 5).map((venue, idx) => (
              <button
                key={venue.id}
                onClick={() => onSelectVenue(venue)}
                style={{
                  top: `${20 + idx * 16}%`,
                  left: `${25 + (idx % 2) * 40}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-[#F5F7F2] text-[#0B0F0C] border-2 border-[#C8FF2E] shadow-xl flex items-center gap-1.5 press-scale group hover:scale-105"
              >
                <span className="font-display font-black text-xs">£{venue.pricePerHour}</span>
                <span className="text-[10px] text-[#4A554D] truncate max-w-[90px]">{venue.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
