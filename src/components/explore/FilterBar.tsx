'use client';

import React from 'react';
import { SportType } from '@/types';
import { getSportDisplayName } from '@/lib/utils';
import { Search, Map as MapIcon, List } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSport: string;
  onSportChange: (s: string) => void;
  viewMode: 'list' | 'map';
  onViewModeChange: (m: 'list' | 'map') => void;
}

// Strictly ordered per SportSync standardized categories specification
const SPORTS: (SportType | 'all')[] = [
  'all',
  'basketball',
  'badminton',
  'volleyball',
  'football',
  'pickleball',
  'tennis',
  'billiards',
  'darts',
  'other',
];

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedSport,
  onSportChange,
  viewMode,
  onViewModeChange,
}: FilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Search Input & View Mode Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A5B0A6]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search city, province, or court name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-[#141A15] text-xs sm:text-sm text-[#F4F7F0] placeholder-[#6F7B71] focus:outline-none focus:border-[#C8FF2E] transition-all"
          />
        </div>

        {/* View Mode Segmented Control */}
        <div className="flex items-center bg-[#141A15] border border-white/10 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'map'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-xs'
                : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-xs'
                : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Sport Selector Chips (Standardized Order) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {SPORTS.map((sport) => {
          const isSelected = selectedSport === sport;
          return (
            <button
              key={sport}
              type="button"
              onClick={() => onSportChange(sport)}
              className={`h-9 px-3.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 flex items-center ${
                isSelected
                  ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold shadow-xs'
                  : 'bg-[#141A15] text-[#A5B0A6] border-white/10 hover:border-white/20 hover:text-[#F4F7F0]'
              }`}
            >
              <span>{sport === 'all' ? 'All Sports' : getSportDisplayName(sport)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
