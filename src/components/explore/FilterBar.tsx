'use client';

import React from 'react';
import { SportType } from '@/types';
import { getSportDisplayName } from '@/lib/utils';
import {
  Search,
  Map as MapIcon,
  List,
} from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSport: string;
  onSportChange: (s: string) => void;
  viewMode: 'list' | 'map';
  onViewModeChange: (m: 'list' | 'map') => void;
}

const SPORTS: (SportType | 'all')[] = [
  'all',
  'pickleball',
  'badminton',
  'basketball',
  'tennis',
  'padel',
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#65756B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search city, province, or court name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs sm:text-sm text-[#1A241E] placeholder:text-[#65756B] focus:outline-none focus:ring-1 focus:ring-[#2D724E] transition-all"
          />
        </div>

        {/* View Mode Segmented Control */}
        <div className="flex items-center bg-[#E8E5DF]/60 p-0.5 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'map'
                ? 'bg-[#2D724E] text-white shadow-xs'
                : 'text-[#65756B] hover:text-[#1A241E]'
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
                ? 'bg-white text-[#1A241E] shadow-xs'
                : 'text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Sport Selector Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {SPORTS.map((sport) => {
          const isSelected = selectedSport === sport;
          return (
            <button
              key={sport}
              type="button"
              onClick={() => onSportChange(sport)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-[#1E4A32] text-white border-[#1E4A32] shadow-xs'
                  : 'bg-white text-[#65756B] border-[#E8E5DF] hover:border-[#1A241E] hover:text-[#1A241E]'
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
