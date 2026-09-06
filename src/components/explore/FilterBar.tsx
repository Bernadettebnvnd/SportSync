'use client';

import React from 'react';
import { SportType, SkillLevel, MatchFormat } from '@/types';
import { getSportDisplayName, getFormatDisplayName } from '@/lib/utils';
import {
  Search,
  Map as MapIcon,
  List,
  SlidersHorizontal,
  Users,
  User,
  Layers,
  Activity,
} from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSport: string;
  onSportChange: (s: string) => void;
  selectedFormat: string;
  onFormatChange: (f: string) => void;
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

const FORMATS: { id: MatchFormat | 'all'; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All Formats', icon: Layers },
  { id: 'doubles', label: 'Doubles (2v2)', icon: Users },
  { id: 'singles', label: 'Singles (1v1)', icon: User },
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
  selectedFormat,
  onFormatChange,
  selectedLevel,
  onLevelChange,
  viewMode,
  onViewModeChange,
}: FilterBarProps) {
  return (
    <div className="space-y-3.5">
      {/* Search Bar + List/Map Toggle */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#65756B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search courts in BGC, Pasig, Makati, QC..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FAF8F5] text-xs sm:text-sm text-[#1A241E] placeholder:text-[#65756B] focus:outline-none focus:ring-2 focus:ring-[#2D724E] transition-all shadow-sm"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#E8E5DF]/60 rounded-xl self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-[#1A241E] shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'map'
                ? 'bg-[#2D724E] text-white shadow-sm'
                : 'text-[#65756B] hover:text-[#1A241E]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
        </div>
      </div>

      {/* Sport Category Pills - Clean Vector Badges (NO EMOJIS) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {SPORTS.map((sport) => {
          const isSelected = selectedSport === sport;
          return (
            <button
              key={sport}
              type="button"
              onClick={() => onSportChange(sport)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                isSelected
                  ? 'bg-[#2D724E] text-white shadow-sm'
                  : 'bg-white text-[#65756B] border border-[#E8E5DF] hover:border-[#2D724E] hover:text-[#1A241E]'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${isSelected ? 'text-[#E9C46A]' : 'text-[#65756B]'}`} />
              <span>{sport === 'all' ? 'All Sports' : getSportDisplayName(sport)}</span>
            </button>
          );
        })}
      </div>

      {/* Match Format: Doubles vs Singles Selection */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs text-[#65756B]">
        <span className="font-extrabold text-[#1A241E] shrink-0">Format:</span>
        {FORMATS.map((fmt) => {
          const Icon = fmt.icon;
          const isSelected = selectedFormat === fmt.id;
          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => onFormatChange(fmt.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? 'bg-[#C87D43] text-white shadow-sm'
                  : 'bg-white border border-[#E8E5DF] text-[#65756B] hover:border-[#C87D43]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{fmt.label}</span>
            </button>
          );
        })}

        <div className="h-4 w-px bg-[#E8E5DF] mx-1 shrink-0" />

        {/* Skill Level Filter Chips */}
        <span className="font-bold text-[#1A241E] shrink-0 flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3 text-[#2D724E]" />
          Level:
        </span>
        {SKILL_LEVELS.map((lvl) => (
          <button
            key={lvl.id}
            type="button"
            onClick={() => onLevelChange(lvl.id)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              selectedLevel === lvl.id
                ? 'bg-[#1A241E] text-white font-bold'
                : 'bg-white border border-[#E8E5DF] text-[#65756B] hover:bg-[#FAF8F5]'
            }`}
          >
            {lvl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
