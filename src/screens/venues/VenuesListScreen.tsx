import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  MapPin,
  SlidersHorizontal,
  List,
  LayoutGrid,
  Calendar,
  Clock,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  X,
  Sparkles,
} from 'lucide-react';
import { VenueCard } from '../../design-system/components/VenueCard';
import { Venue } from '../../mock/types';
import { SportIcon, SportId } from '../../illustrations/SportIcons';
import { APP_CONFIG } from '../../config/appConfig';
import { STANDARDIZED_SPORTS } from '../../config/sports';

interface VenuesListScreenProps {
  venues?: Venue[];
  onSelectVenue: (venue: Venue) => void;
  onBack?: () => void;
  initialQuery?: string;
  initialSport?: string;
  initialCity?: string;
}

const OFFICIAL_SPORTS: Array<{ label: string; value: string }> = STANDARDIZED_SPORTS.map((s) => ({
  label: s === 'All' ? 'All Sports' : s,
  value: s,
}));

const CITIES = [
  { label: 'All Cities', value: 'all' },
  { label: 'Naga City', value: 'naga' },
  { label: 'Taguig / BGC', value: 'taguig' },
  { label: 'Pasig / Ortigas', value: 'pasig' },
  { label: 'Makati', value: 'makati' },
  { label: 'Quezon City', value: 'quezon' },
  { label: 'Cebu City', value: 'cebu' },
];

const DATE_OPTIONS = ['Any Date', 'Today', 'Tomorrow', 'This Weekend'];

const TIME_OPTIONS = [
  { label: 'Any Time', value: 'all' },
  { label: 'Morning (06:00 - 12:00)', value: 'morning' },
  { label: 'Afternoon (12:00 - 17:00)', value: 'afternoon' },
  { label: 'Evening (17:00 - 23:00)', value: 'evening' },
];

export const VenuesListScreen: React.FC<VenuesListScreenProps> = ({
  venues = [],
  onSelectVenue,
  onBack,
  initialQuery = '',
  initialSport = 'All',
  initialCity = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedSport, setSelectedSport] = useState<string>(initialSport);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity || 'all');
  const [selectedDate, setSelectedDate] = useState<string>('Any Date');
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available_only' | 'inquire'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);

  // Active filter counter
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSport !== 'All') count++;
    if (selectedCity !== 'all') count++;
    if (selectedDate !== 'Any Date') count++;
    if (selectedTime !== 'all') count++;
    if (availabilityFilter !== 'all') count++;
    return count;
  }, [selectedSport, selectedCity, selectedDate, selectedTime, availabilityFilter]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedSport('All');
    setSelectedCity('all');
    setSelectedDate('Any Date');
    setSelectedTime('all');
    setAvailabilityFilter('all');
  };

  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      // 1. Sport filter (checks primary sport, featured sports list, and any registered court sport)
      if (selectedSport !== 'All') {
        const sportLower = selectedSport.toLowerCase();
        const primaryMatch = v.sport.toLowerCase().includes(sportLower);
        const featuredMatch = v.featuredSports?.some((s) => s.toLowerCase().includes(sportLower));
        const courtsMatch = v.courts?.some((c: any) =>
          c.sport?.toLowerCase().includes(sportLower) ||
          c.name?.toLowerCase().includes(sportLower)
        );
        if (!primaryMatch && !featuredMatch && !courtsMatch) return false;
      }

      // 2. City / Location filter
      if (selectedCity !== 'all') {
        const cLower = selectedCity.toLowerCase();
        const vCity = (v.city || '').toLowerCase();
        const vAddr = (v.address || '').toLowerCase();
        if (cLower === 'naga') {
          if (!vCity.includes('naga') && !vAddr.includes('naga') && !vAddr.includes('camarines')) return false;
        } else if (cLower === 'taguig') {
          if (!vCity.includes('taguig') && !vAddr.includes('taguig') && !vAddr.includes('bgc')) return false;
        } else if (cLower === 'pasig') {
          if (!vCity.includes('pasig') && !vAddr.includes('pasig') && !vAddr.includes('ortigas')) return false;
        } else if (cLower === 'makati') {
          if (!vCity.includes('makati') && !vAddr.includes('makati')) return false;
        } else if (cLower === 'quezon') {
          if (!vCity.includes('quezon') && !vAddr.includes('quezon') && !vCity.includes('qc')) return false;
        } else if (cLower === 'cebu') {
          if (!vCity.includes('cebu') && !vAddr.includes('cebu')) return false;
        } else {
          if (!vCity.includes(cLower) && !vAddr.includes(cLower)) return false;
        }
      }

      // 3. Availability Filter
      if (availabilityFilter === 'available_only') {
        if (!v.availableSlots || v.availableSlots.length === 0) return false;
      } else if (availabilityFilter === 'inquire') {
        if (v.availableSlots && v.availableSlots.length > 0) return false;
      }

      // 4. Time Filter (morning, afternoon, evening slots)
      if (selectedTime !== 'all' && v.availableSlots) {
        const hasMatchingSlot = v.availableSlots.some((slot) => {
          const hour = parseInt(slot.split(':')[0], 10);
          if (isNaN(hour)) return true;
          if (selectedTime === 'morning') return hour >= 6 && hour < 12;
          if (selectedTime === 'afternoon') return hour >= 12 && hour < 17;
          if (selectedTime === 'evening') return hour >= 17 && hour <= 23;
          return true;
        });
        if (!hasMatchingSlot) return false;
      }

      // 5. Query Search: facility name, court name, city, address
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = v.name.toLowerCase().includes(q);
        const cityMatch = v.city.toLowerCase().includes(q);
        const addressMatch = v.address.toLowerCase().includes(q);
        const sportMatch = v.sport.toLowerCase().includes(q);
        const courtsMatch = v.courts?.some((c: any) =>
          c.name?.toLowerCase().includes(q) || c.sport?.toLowerCase().includes(q)
        );
        if (!nameMatch && !cityMatch && !addressMatch && !sportMatch && !courtsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [venues, selectedSport, selectedCity, availabilityFilter, selectedTime, searchQuery]);

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none min-h-screen">
      {/* 1. Header with back button & search title */}
      <header className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/5 bg-[#0B0F0C]/90 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back to Home"
              className="w-10 h-10 rounded-full bg-[#1C241E] border border-white/10 flex items-center justify-center text-[#F4F7F0] hover:bg-[#263028] transition-colors press-scale"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-xl text-[#F4F7F0] tracking-tight">
                Search Courts
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#C8FF2E]/10 text-[#C8FF2E] text-[10px] font-bold border border-[#C8FF2E]/20">
                Live Supabase
              </span>
            </div>
            <p className="text-xs text-[#A5B0A6]">Find verified facilities & reserve playing areas</p>
          </div>
        </div>

        {/* View Mode Switcher (List vs Grid) */}
        <div className="flex bg-[#1C241E] p-1 rounded-full border border-white/10 shrink-0">
          <button
            onClick={() => setViewMode('list')}
            aria-label="List view"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              viewMode === 'list' ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm' : 'text-[#A5B0A6] hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              viewMode === 'grid' ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm' : 'text-[#A5B0A6] hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Prominent Search Bar & Filter Toggle */}
      <div className="px-5 pt-3 pb-2 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A5B0A6]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by facility name, court, city..."
              className="w-full h-11 pl-10 pr-9 rounded-2xl bg-[#141A15] border border-white/10 text-sm text-[#F4F7F0] placeholder-[#6F7B71] focus:outline-none focus:border-[#C8FF2E] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A5B0A6] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFiltersModal(!showFiltersModal)}
            className={`h-11 px-3.5 rounded-2xl border flex items-center gap-1.5 text-xs font-bold transition-all press-scale shrink-0 ${
              activeFiltersCount > 0
                ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                : 'bg-[#141A15] text-[#F4F7F0] border-white/10 hover:border-white/20'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#0B0F0C] text-[#C8FF2E] text-[10px] flex items-center justify-center font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* 3. Official 9-Sport Filter Chip Rail with Vector Icons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {OFFICIAL_SPORTS.map((sport) => {
            const isActive = selectedSport === sport.value;
            return (
              <button
                key={sport.value}
                onClick={() => setSelectedSport(sport.value)}
                className={`h-9 px-3.5 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border press-scale ${
                  isActive
                    ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] shadow-sm'
                    : 'bg-[#141A15] text-[#A5B0A6] border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                {sport.value !== 'All' ? (
                  <SportIcon
                    sport={sport.value}
                    size={14}
                    color={isActive ? '#0B0F0C' : '#A5B0A6'}
                  />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-current" />
                )}
                <span>{sport.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Quick Filter Pills: City, Date, Availability */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* City select chip */}
          <div className="relative shrink-0">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="h-8 pl-7 pr-7 rounded-full bg-[#1C241E] text-xs font-semibold text-[#F4F7F0] border border-white/10 appearance-none focus:outline-none focus:border-[#C8FF2E] cursor-pointer"
            >
              {CITIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#141A15] text-white">
                  {c.label}
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-[#C8FF2E] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#A5B0A6] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Date select chip */}
          <div className="relative shrink-0">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 pl-7 pr-7 rounded-full bg-[#1C241E] text-xs font-semibold text-[#F4F7F0] border border-white/10 appearance-none focus:outline-none focus:border-[#C8FF2E] cursor-pointer"
            >
              {DATE_OPTIONS.map((d) => (
                <option key={d} value={d} className="bg-[#141A15] text-white">
                  {d}
                </option>
              ))}
            </select>
            <Calendar className="w-3.5 h-3.5 text-[#C8FF2E] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#A5B0A6] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Availability toggle */}
          <button
            onClick={() => {
              if (availabilityFilter === 'all') setAvailabilityFilter('available_only');
              else if (availabilityFilter === 'available_only') setAvailabilityFilter('inquire');
              else setAvailabilityFilter('all');
            }}
            className={`h-8 px-3 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
              availabilityFilter === 'available_only'
                ? 'bg-[#00E599]/20 text-[#00E599] border-[#00E599]/40'
                : availabilityFilter === 'inquire'
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-[#1C241E] text-[#A5B0A6] border-white/10'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                availabilityFilter === 'available_only'
                  ? 'bg-[#00E599]'
                  : availabilityFilter === 'inquire'
                  ? 'bg-slate-400'
                  : 'bg-[#A5B0A6]'
              }`}
            />
            <span>
              {availabilityFilter === 'available_only'
                ? 'Available Today'
                : availabilityFilter === 'inquire'
                ? 'Desk Inquiry'
                : 'All Statuses'}
            </span>
          </button>

          {/* Reset button if any filter active */}
          {activeFiltersCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="h-8 px-2.5 rounded-full text-xs text-[#FF8FC7] hover:underline flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Expanded Filter Drawer (Modal / Collapsible Panel) */}
      {showFiltersModal && (
        <div className="mx-5 mb-3 p-4 rounded-3xl bg-[#141A15] border border-white/10 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="font-display font-bold text-sm text-[#F4F7F0]">Detailed Search Filters</h3>
            <button
              onClick={() => setShowFiltersModal(false)}
              className="text-xs text-[#A5B0A6] hover:text-white"
            >
              Close
            </button>
          </div>

          {/* Time Slot Preferences */}
          <div>
            <span className="text-[11px] uppercase font-bold text-[#A5B0A6] block mb-2">Time of Day</span>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSelectedTime(t.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border ${
                    selectedTime === t.value
                      ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                      : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <button
              onClick={resetAllFilters}
              className="text-xs text-[#A5B0A6] hover:text-[#FF8FC7] flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
            <button
              onClick={() => setShowFiltersModal(false)}
              className="px-4 py-1.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] text-xs font-bold"
            >
              Apply ({filteredVenues.length} Results)
            </button>
          </div>
        </div>
      )}

      {/* 6. Results Count & Status Summary */}
      <div className="px-5 py-2 flex items-center justify-between text-xs text-[#A5B0A6]">
        <span>
          Showing <strong className="text-[#F4F7F0]">{filteredVenues.length}</strong> registered {filteredVenues.length === 1 ? 'court facility' : 'court facilities'}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#00E599]">
          <ShieldCheck className="w-3.5 h-3.5" />
          Verified Philippine Venues
        </span>
      </div>

      {/* 7. Venues Presentation (Responsive List or Grid) */}
      <div className="px-5 pt-2">
        {filteredVenues.length > 0 ? (
          <div
            className={
              viewMode === 'list'
                ? 'space-y-4'
                : 'grid grid-cols-1 sm:grid-cols-2 gap-4'
            }
          >
            {filteredVenues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onClick={() => onSelectVenue(venue)}
              />
            ))}
          </div>
        ) : (
          /* Empty State Handling */
          <div className="py-16 text-center space-y-4 px-4 bg-[#141A15] rounded-3xl border border-white/5 mt-4">
            <div className="w-14 h-14 rounded-full bg-[#1C241E] border border-white/10 flex items-center justify-center mx-auto text-[#A5B0A6]">
              <Search className="w-6 h-6 text-[#C8FF2E]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#F4F7F0]">No courts match your search</h3>
              <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto mt-1">
                Try widening your city selection or switching to another sport in the filter rail above.
              </p>
            </div>
            <button
              onClick={resetAllFilters}
              className="px-5 py-2.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] text-xs font-bold shadow-lg press-scale inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Search Filters</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
