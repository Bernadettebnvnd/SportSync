'use client';

import React from 'react';
import { SportType, SkillLevel } from '@/types';
import { getSportEmoji, getSportDisplayName } from '@/lib/utils';
import { Search, Map as MapIcon, List, SlidersHorizontal } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSport: string;
  onSportChange: (s: string) => void;
  selectedLevel: string;
  onLevelChange: (l: string) => void;
  viewMode: 'list' | 'map';
  onViewModeChange: (m: 'list' | 'map') => void;
}

const SPORTS: (SportType | 'all')[] = [
  'all',
  'badminton',
  'pickleball',
  'padel',
  'basketball',
  'tennis',
];

const SKILL_LEVELS: { id: SkillLevel; label: string }[] = [
  { id: 'all_levels', label: 'All Levels' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedSport,
  onSportChange,
  selectedLevel,
  onLevelChange,
  viewMode,
  onViewModeChange,
}: FilterBarProps) {
  return (
    <div className="space-y-4">
      {/* Top row: Search input + View mode toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search courts by venue name, city (e.g. BGC, Pasig, QC)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EBEBE6] bg-white text-sm text-[#171717] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#1F9D55] transition-all shadow-sm"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#F1F1EB] rounded-xl self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-[#171717] shadow-sm'
                : 'text-[#6B7280] hover:text-[#171717]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'map'
                ? 'bg-[#1F9D55] text-white shadow-sm'
                : 'text-[#6B7280] hover:text-[#171717]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Map View
          </button>
        </div>
      </div>

      {/* Sport Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {SPORTS.map((sport) => {
          const isSelected = selectedSport === sport;
          return (
            <button
              key={sport}
              type="button"
              onClick={() => onSportChange(sport)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#1F9D55] text-white shadow-sm'
                  : 'bg-white text-[#6B7280] border border-[#EBEBE6] hover:border-[#1F9D55] hover:text-[#171717]'
              }`}
            >
              <span>{sport === 'all' ? '⚡' : getSportEmoji(sport)}</span>
              <span>{sport === 'all' ? 'All Sports' : getSportDisplayName(sport)}</span>
            </button>
          );
        })}
      </div>

      {/* Skill Level Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs text-[#6B7280]">
        <span className="font-semibold text-[#171717] flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3 text-[#1F9D55]" />
          Level:
        </span>
        {SKILL_LEVELS.map((lvl) => (
          <button
            key={lvl.id}
            type="button"
            onClick={() => onLevelChange(lvl.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedLevel === lvl.id
                ? 'bg-[#171717] text-white font-semibold'
                : 'bg-white border border-[#EBEBE6] text-[#6B7280] hover:bg-[#FAFAF7]'
            }`}
          >
            {lvl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
