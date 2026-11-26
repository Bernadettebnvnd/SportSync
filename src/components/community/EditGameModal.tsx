'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  Save,
  Plus,
  Trash2,
} from 'lucide-react';
import { CommunityGame } from '@/mock/types';
import { APP_CONFIG } from '@/config/appConfig';
import { Stepper, Toggle } from '@/design-system/components/SegmentedControl';
import { DateStrip, generateUpcomingDates } from '@/design-system/components/DateStrip';
import { MonthCalendarSheet } from '@/design-system/components/MonthCalendarSheet';
import { TimeWheelSheet } from '@/design-system/components/TimeWheelSheet';
import {
  NagaLocationPicker,
  NAGA_CITY_CENTER,
  NAGA_SPORTS_VENUES,
  isWithinNagaCity,
} from '@/components/community/NagaLocationPicker';
import { STANDARDIZED_SPORTS_OPTIONS } from '@/screens/community/CreateMatchWizardScreen';
import {
  MAX_BOOKING_HORIZON_DAYS,
  formatManilaDateShort,
  formatMatchSummaryLine,
  formatTime12h,
  getManilaTodayISO,
  getManilaTomorrowISO,
  isManilaDateTimeInPast,
  parseTimeTo24h,
  resolveFlexibleDateToManilaISO,
  shiftTime24ByMinutes,
  toManilaIsoTimestamp,
  validateEndTime,
} from '@/lib/datetime';

const QUICK_TIME_SLOTS_24 = ['07:00', '09:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00'] as const;
const DURATION_CHIPS = [
  { label: '+1h', minutes: 60 },
  { label: '+1.5h', minutes: 90 },
  { label: '+2h', minutes: 120 },
  { label: '+3h', minutes: 180 },
] as const;
const FEE_PRESETS = [50, 100, 150, 200, 250, 350] as const;
const MAX_FEE_PHP = 5000;

interface EditGameModalProps {
  isOpen: boolean;
  game: CommunityGame;
  onClose: () => void;
  onSave: (updatedData: {
    title: string;
    sport: string;
    date: string;
    time: string;
    endTime?: string | null;
    startsAt?: string;
    endsAt?: string | null;
    locationName: string;
    locationDetails?: string;
    skillLevel: 'Beginner' | 'Casual' | 'Intermediate' | 'Competitive';
    spotsTotal: number | null;
    pricePerPlayer: number;
    notes?: string;
    coordinates?: [number, number];
  }) => Promise<void> | void;
}

function extractKickoffAndEnd24(game: CommunityGame): {
  kickoff24: string;
  hasEnd: boolean;
  end24: string;
} {
  if (game.startsAt) {
    const startParsed = parseTimeTo24h(game.startsAt);
    const endParsed = game.endsAt ? parseTimeTo24h(game.endsAt) : game.endTime ? parseTimeTo24h(game.endTime) : null;
    const k = startParsed?.hhmm || '18:00';
    return {
      kickoff24: k,
      hasEnd: Boolean(endParsed),
      end24: endParsed?.hhmm || shiftTime24ByMinutes(k, 120),
    };
  }

  const rawTime = (game.time || '18:00').trim();
  if (rawTime.includes(' - ') || rawTime.includes(' – ')) {
    const [sPart, ePart] = rawTime.split(/\s[-–]\s/);
    const sp = parseTimeTo24h(sPart);
    const ep = parseTimeTo24h(ePart);
    const k = sp?.hhmm || '18:00';
    return {
      kickoff24: k,
      hasEnd: Boolean(ep),
      end24: ep?.hhmm || shiftTime24ByMinutes(k, 120),
    };
  }

  const sp = parseTimeTo24h(rawTime);
  const ep = game.endTime ? parseTimeTo24h(game.endTime) : game.endsAt ? parseTimeTo24h(game.endsAt) : null;
  const k = sp?.hhmm || '18:00';
  return {
    kickoff24: k,
    hasEnd: Boolean(ep),
    end24: ep?.hhmm || shiftTime24ByMinutes(k, 120),
  };
}

export const EditGameModal: React.FC<EditGameModalProps> = ({
  isOpen,
  game,
  onClose,
  onSave,
}) => {
  const todayISO = getManilaTodayISO();
  const tomorrowISO = getManilaTomorrowISO();

  const resolveInitialCoords = (g: CommunityGame): [number, number] => {
    if (
      g.coordinates &&
      Array.isArray(g.coordinates) &&
      g.coordinates.length === 2 &&
      isWithinNagaCity(g.coordinates[0], g.coordinates[1])
    ) {
      return g.coordinates;
    }
    const match = NAGA_SPORTS_VENUES.find(
      (v) =>
        g.locationName.toLowerCase().includes(v.shortName.toLowerCase()) ||
        g.locationName.toLowerCase().includes(v.barangay.toLowerCase())
    );
    return match ? match.coordinates : NAGA_CITY_CENTER;
  };

  const isInvalidLoc = (val?: string | null) =>
    !val || val.includes('Upper Deck') || val.includes('Pasig') || val.includes('Ortigas');

  const initialTimes = extractKickoffAndEnd24(game);
  const initialDateIso = resolveFlexibleDateToManilaISO(game.startsAt || game.date);

  const [title, setTitle] = useState(game.title);
  const [sport, setSport] = useState<string>(game.sport);
  const [scheduleMode, setScheduleMode] = useState<'today' | 'tomorrow' | 'custom'>(() => {
    if (initialDateIso === todayISO) return 'today';
    if (initialDateIso === tomorrowISO) return 'tomorrow';
    return 'custom';
  });
  const [selectedDateISO, setSelectedDateISO] = useState<string>(initialDateIso);
  const [kickoffTime24, setKickoffTime24] = useState<string>(initialTimes.kickoff24);
  const [hasEndTime, setHasEndTime] = useState<boolean>(initialTimes.hasEnd);
  const [endTime24, setEndTime24] = useState<string>(initialTimes.end24);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeTimeWheel, setActiveTimeWheel] = useState<'start' | 'end' | null>(null);

  const initialSafeLoc = !isInvalidLoc(game.locationName)
    ? game.locationName
    : !isInvalidLoc(game.locationDetails)
    ? game.locationDetails!
    : 'Metro Naga Sports Complex';
  const initialSafeDetails = !isInvalidLoc(game.locationDetails) ? game.locationDetails! : '';

  const [locationName, setLocationName] = useState(initialSafeLoc);
  const [locationDetails, setLocationDetails] = useState(initialSafeDetails);
  const [coordinates, setCoordinates] = useState<[number, number]>(() => resolveInitialCoords(game));
  const [hasPin, setHasPin] = useState<boolean>(true);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  const [skillLevel, setSkillLevel] = useState<'Beginner' | 'Casual' | 'Intermediate' | 'Competitive'>(
    game.skillLevel || 'Casual'
  );
  const [isUnlimitedSpots, setIsUnlimitedSpots] = useState<boolean>(game.spotsTotal === null);
  const [spotsTotal, setSpotsTotal] = useState<number>(
    game.spotsTotal === null ? Math.max(10, game.spotsJoined || 2) : game.spotsTotal
  );
  const [spotsInput, setSpotsInput] = useState<string>(String(spotsTotal));
  const [spotsError, setSpotsError] = useState<string | null>(null);

  const [splitCost, setSplitCost] = useState<boolean>((game.pricePerPlayer || 0) > 0);
  const [pricePerPlayer, setPricePerPlayer] = useState<number>(game.pricePerPlayer || 0);
  const [lastNonZeroFee, setLastNonZeroFee] = useState<number>(
    game.pricePerPlayer && game.pricePerPlayer > 0 ? game.pricePerPlayer : 150
  );
  const [notes, setNotes] = useState<string>(game.notes || '');

  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const prevIsOpenRef = useRef(false);
  const prevGameIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentGameId = game?.id || game?.sessionId || null;
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isNewGame = isOpen && currentGameId !== null && currentGameId !== prevGameIdRef.current;

    prevIsOpenRef.current = isOpen;
    prevGameIdRef.current = currentGameId;

    if (isOpen && game && (isOpening || isNewGame)) {
      const nextIso = resolveFlexibleDateToManilaISO(game.startsAt || game.date);
      const nextTimes = extractKickoffAndEnd24(game);
      setTitle(game.title);
      setSport(game.sport);
      setSelectedDateISO(nextIso);
      setScheduleMode(nextIso === todayISO ? 'today' : nextIso === tomorrowISO ? 'tomorrow' : 'custom');
      setKickoffTime24(nextTimes.kickoff24);
      setHasEndTime(nextTimes.hasEnd);
      setEndTime24(nextTimes.end24);

      const safeLoc = !isInvalidLoc(game.locationName)
        ? game.locationName
        : !isInvalidLoc(game.locationDetails)
        ? game.locationDetails!
        : 'Metro Naga Sports Complex';
      const safeDet = !isInvalidLoc(game.locationDetails) ? game.locationDetails! : '';
      setLocationName(safeLoc);
      setLocationDetails(safeDet);
      setCoordinates(resolveInitialCoords(game));
      setHasPin(Boolean(safeLoc));
      setSelectedVenueId('');

      setSkillLevel(game.skillLevel || 'Casual');
      const unlimited = game.spotsTotal === null;
      const numericSpots = unlimited ? Math.max(10, game.spotsJoined || 2) : game.spotsTotal!;
      setIsUnlimitedSpots(unlimited);
      setSpotsTotal(numericSpots);
      setSpotsInput(String(numericSpots));
      setSpotsError(null);

      const fee = game.pricePerPlayer || 0;
      setSplitCost(fee > 0);
      setPricePerPlayer(fee);
      setLastNonZeroFee(fee > 0 ? fee : 150);
      setNotes(game.notes || '');
      setValidationError(null);
    }
  }, [isOpen, game, todayISO, tomorrowISO]);

  const updateKickoffTime = (next24: string) => {
    const prevParsed = parseTimeTo24h(kickoffTime24);
    const nextParsed = parseTimeTo24h(next24);
    if (hasEndTime && prevParsed && nextParsed) {
      const delta =
        nextParsed.hour24 * 60 + nextParsed.minute - (prevParsed.hour24 * 60 + prevParsed.minute);
      if (delta !== 0) {
        setEndTime24((prevEnd) => shiftTime24ByMinutes(prevEnd, delta));
      }
    }
    setKickoffTime24(next24);
    setValidationError(null);
  };

  const endTimeValidation = useMemo(() => {
    if (!hasEndTime) return null;
    return validateEndTime(selectedDateISO, kickoffTime24, endTime24);
  }, [hasEndTime, selectedDateISO, kickoffTime24, endTime24]);

  const scheduleSummaryLine = useMemo(
    () => formatMatchSummaryLine(selectedDateISO, kickoffTime24, hasEndTime ? endTime24 : null),
    [selectedDateISO, kickoffTime24, hasEndTime, endTime24]
  );

  const upcomingDates = useMemo(() => generateUpcomingDates(14), []);
  const joinedCount = Math.max(
    Array.isArray(game.members) ? game.members.length : 0,
    game.spotsJoined || 0
  );
  const minAllowedSpots = Math.max(2, joinedCount);

  const handleSpotsInputChange = (val: string) => {
    const digits = val.replace(/[^0-9]/g, '');
    setSpotsInput(digits);
    if (digits === '') {
      setSpotsError(`Enter between ${minAllowedSpots} and 24 players`);
      return;
    }
    const parsed = parseInt(digits, 10);
    if (parsed < joinedCount) {
      setSpotsError(`Cannot be less than the ${joinedCount} players already joined`);
    } else if (parsed < 2 || parsed > 24) {
      setSpotsError('Must be between 2 and 24 players');
    } else {
      setSpotsTotal(parsed);
      setSpotsError(null);
    }
  };

  const handleSpotsInputBlur = () => {
    if (!spotsInput.trim()) {
      setSpotsInput(String(spotsTotal));
      setSpotsError(null);
      return;
    }
    const parsed = parseInt(spotsInput, 10);
    if (!Number.isFinite(parsed)) {
      setSpotsInput(String(spotsTotal));
      setSpotsError(null);
      return;
    }
    if (parsed < joinedCount) {
      setSpotsError(`Cannot be less than the ${joinedCount} players already joined`);
      return;
    }
    const clamped = Math.max(minAllowedSpots, Math.min(24, parsed));
    setSpotsTotal(clamped);
    setSpotsInput(String(clamped));
    setSpotsError(null);
  };

  const handleFeeChange = (nextFee: number) => {
    setPricePerPlayer(nextFee);
    if (nextFee > 0) setLastNonZeroFee(nextFee);
  };

  const feeSummaryText = useMemo(() => {
    if (!splitCost || pricePerPlayer <= 0) return null;
    if (isUnlimitedSpots) {
      return `${APP_CONFIG.currency}${pricePerPlayer.toLocaleString()} per player`;
    }
    const validSpots = Math.max(minAllowedSpots, Math.min(24, parseInt(spotsInput, 10) || spotsTotal));
    return `${validSpots} spots × ${APP_CONFIG.currency}${pricePerPlayer.toLocaleString()} = ${APP_CONFIG.currency}${(validSpots * pricePerPlayer).toLocaleString()} total`;
  }, [splitCost, pricePerPlayer, isUnlimitedSpots, minAllowedSpots, spotsInput, spotsTotal]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || title.trim().length < 3) {
      setValidationError('Please enter a match title with at least 3 characters.');
      return;
    }
    if (!locationName.trim()) {
      setValidationError('Please pin a match location in Naga City.');
      return;
    }
    if (!isWithinNagaCity(coordinates[0], coordinates[1])) {
      setValidationError('Pilot area is Naga City only.');
      return;
    }
    if (hasEndTime && endTimeValidation && !endTimeValidation.valid) {
      setValidationError(endTimeValidation.error || 'End time must be after kickoff.');
      return;
    }

    let finalSpotsTotal: number | null = null;
    if (!isUnlimitedSpots) {
      const parsed = parseInt(spotsInput, 10);
      if (!Number.isFinite(parsed) || parsed < 2 || parsed > 24) {
        setValidationError('Total spots must be between 2 and 24 players.');
        return;
      }
      if (parsed < joinedCount) {
        setValidationError(`Total spots cannot be less than the ${joinedCount} players already joined.`);
        return;
      }
      finalSpotsTotal = parsed;
    }

    setValidationError(null);
    setIsSaving(true);

    try {
      const startsAtIso = toManilaIsoTimestamp(selectedDateISO, kickoffTime24);
      const endsAtIso =
        hasEndTime && endTimeValidation?.valid ? endTimeValidation.endIso : null;

      await onSave({
        title: title.trim(),
        sport,
        date: selectedDateISO,
        time: kickoffTime24,
        endTime: hasEndTime ? endTime24 : null,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        locationName: locationName.trim(),
        locationDetails: locationDetails.trim() || undefined,
        skillLevel,
        spotsTotal: finalSpotsTotal,
        pricePerPlayer: splitCost ? pricePerPlayer : 0,
        notes: notes.trim(),
        coordinates,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update game details. Please try again.';
      setValidationError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[550] flex items-center justify-center p-2 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-game-modal-title"
        className="relative w-full max-w-xl rounded-3xl bg-[#0B0F0C] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88dvh] select-none animate-in zoom-in-95 duration-200 text-[#F4F7F0]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/10 bg-[#0B0F0C] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C8FF2E] shadow-[0_0_8px_#C8FF2E]" />
              <span className="font-display font-bold text-xs uppercase tracking-wider text-[#C8FF2E]">
                Host Game Management
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
              aria-label="Close edit game modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 id="edit-game-modal-title" className="font-display font-black text-lg sm:text-xl text-[#F4F7F0] mt-1">
            Edit Hosted Game
          </h2>
          <p className="text-xs text-[#A5B0A6]">
            Update match schedule, Naga venue pin, spots, fee, or notes for all players.
          </p>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-8 space-y-5 no-scrollbar">
          {validationError && (
            <div role="alert" className="p-3 rounded-2xl bg-[#FF5C5C]/15 border border-[#FF5C5C]/40 text-[#FF8F8F] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#FF5C5C]" />
              <span className="leading-tight">{validationError}</span>
            </div>
          )}

          {/* Sport Category */}
          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
              Sport Category <span className="text-[#C8FF2E]">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {STANDARDIZED_SPORTS_OPTIONS.map((sp) => {
                const isSelected = sport.toLowerCase() === sp.id.toLowerCase();
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => setSport(sp.id)}
                    className={`h-16 p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all press-scale ${
                      isSelected
                        ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_12px_rgba(200,255,46,0.25)]'
                        : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="text-xl leading-none">{sp.icon}</span>
                    <span className="text-[10px] font-semibold text-center leading-tight line-clamp-1">
                      {sp.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Match Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                Match Title <span className="text-[#C8FF2E]">*</span>
              </label>
              <span className="text-[10px] text-[#65756B]">{title.length}/60 chars</span>
            </div>
            <input
              type="text"
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5v5 Sunset Pickup Game"
              className="w-full min-h-[48px] h-12 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] placeholder-[#65756B] focus:border-[#C8FF2E] focus:outline-none transition-all"
            />
          </div>

          {/* Schedule: Same MonthCalendarSheet + TimeWheelSheet + Optional End Time */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
              Kickoff Date &amp; Time <span className="text-[#C8FF2E]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setScheduleMode('today');
                  setSelectedDateISO(todayISO);
                }}
                className={`min-h-[44px] px-2 rounded-2xl border text-xs font-bold flex items-center justify-center whitespace-nowrap transition-all press-scale ${
                  scheduleMode === 'today'
                    ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                    : 'bg-[#1C241E] border-white/10 text-[#A5B0A6]'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  setScheduleMode('tomorrow');
                  setSelectedDateISO(tomorrowISO);
                }}
                className={`min-h-[44px] px-2 rounded-2xl border text-xs font-semibold flex items-center justify-center whitespace-nowrap transition-all press-scale ${
                  scheduleMode === 'tomorrow'
                    ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] font-bold'
                    : 'bg-[#1C241E] border-white/10 text-[#A5B0A6]'
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('custom')}
                className={`min-h-[44px] px-2 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1 whitespace-nowrap transition-all press-scale ${
                  scheduleMode === 'custom'
                    ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] font-bold'
                    : 'bg-[#1C241E] border-white/10 text-[#A5B0A6]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Custom</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/10 space-y-3">
              {scheduleMode === 'custom' && (
                <div className="space-y-2 pb-2.5 border-b border-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6]">Date</span>
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(true)}
                      className="min-h-[44px] px-3.5 rounded-xl bg-[#1C241E] border border-white/10 hover:border-[#C8FF2E] text-xs font-display font-bold text-[#F4F7F0] flex items-center gap-2 transition-all press-scale"
                    >
                      <Calendar className="w-4 h-4 text-[#C8FF2E]" />
                      <span>{formatManilaDateShort(selectedDateISO)}</span>
                    </button>
                  </div>
                  <DateStrip
                    dates={upcomingDates}
                    selectedId={selectedDateISO}
                    onSelect={(iso) => {
                      setSelectedDateISO(iso);
                      setScheduleMode('custom');
                    }}
                    showCalendarPicker={true}
                    onOpenCalendar={() => setIsCalendarOpen(true)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6]">
                    Kickoff Time
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTimeWheel('start')}
                    className="min-h-[44px] px-3.5 rounded-xl bg-[#1C241E] border border-white/10 hover:border-[#C8FF2E] text-sm font-display font-bold text-[#C8FF2E] tabular-nums flex items-center gap-2 transition-all press-scale"
                  >
                    <Clock className="w-4 h-4 text-[#C8FF2E]" />
                    <span>{formatTime12h(kickoffTime24)}</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {QUICK_TIME_SLOTS_24.map((slot) => {
                    const activeSlot = kickoffTime24 === slot;
                    const isPast = isManilaDateTimeInPast(selectedDateISO, slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isPast}
                        aria-disabled={isPast}
                        aria-pressed={activeSlot}
                        onClick={() => {
                          if (!isPast) updateKickoffTime(slot);
                        }}
                        className={`min-h-[44px] py-1.5 px-1 rounded-xl text-[11px] font-semibold border transition-all press-scale whitespace-nowrap ${
                          isPast
                            ? 'bg-[#141A15] text-[#6F7B71]/50 border-white/5 opacity-40 cursor-not-allowed'
                            : activeSlot
                            ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                            : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-white'
                        }`}
                      >
                        {formatTime12h(slot)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional End Time */}
              <div className="pt-2.5 border-t border-white/5">
                {!hasEndTime ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHasEndTime(true);
                      setEndTime24(shiftTime24ByMinutes(kickoffTime24, 120));
                    }}
                    className="w-full min-h-[44px] flex items-center justify-between text-xs font-semibold text-[#C8FF2E]"
                  >
                    <span className="flex items-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>Add end time</span>
                    </span>
                    <span className="text-[11px] text-[#6F7B71] font-normal">Optional</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6]">
                        End Time (Optional)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTimeWheel('end')}
                          className="min-h-[44px] px-3.5 rounded-xl bg-[#1C241E] border border-white/10 hover:border-[#C8FF2E] text-sm font-display font-bold text-[#F4F7F0] tabular-nums flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4 text-[#C8FF2E]" />
                          <span>{formatTime12h(endTime24)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHasEndTime(false)}
                          aria-label="Remove end time"
                          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-[#1C241E] border border-white/10 text-[#A5B0A6] hover:text-[#FF5C5C] flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {DURATION_CHIPS.map((chip) => {
                        const targetEnd = shiftTime24ByMinutes(kickoffTime24, chip.minutes);
                        const isMatch = endTime24 === targetEnd;
                        return (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setEndTime24(targetEnd)}
                            className={`min-h-[44px] rounded-xl text-xs font-bold border transition-all ${
                              isMatch
                                ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                                : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-white'
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                    {endTimeValidation && !endTimeValidation.valid && (
                      <p className="text-xs text-[#FF8F8F]">{endTimeValidation.error}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="px-3 py-2 rounded-xl bg-[#1C241E]/80 border border-[#C8FF2E]/25 flex items-center justify-between text-xs">
                <span className="text-[#A5B0A6]">Schedule</span>
                <span className="font-display font-bold text-[#C8FF2E]">{scheduleSummaryLine}</span>
              </div>
            </div>
          </div>

          {/* Shared Naga Location Picker */}
          <NagaLocationPicker
            isActive={isOpen}
            locationName={locationName}
            locationDetails={locationDetails}
            coordinates={coordinates}
            hasPin={hasPin}
            selectedVenueId={selectedVenueId}
            showQuickHubs={false}
            onChangeLocation={(update) => {
              setLocationName(update.locationName);
              setCoordinates(update.coordinates);
              setHasPin(update.hasPin);
              setSelectedVenueId(update.selectedVenueId || '');
            }}
            onChangeLocationDetails={setLocationDetails}
          />

          {/* Total Spots (with Unlimited Toggle) */}
          <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-display font-bold text-sm text-[#F4F7F0] block">
                  Total Spots
                </span>
                {!isUnlimitedSpots && (
                  <span className="text-xs text-[#A5B0A6]">
                    Min {minAllowedSpots}, Max 24 players ({joinedCount} joined)
                  </span>
                )}
              </div>
              {isUnlimitedSpots ? (
                <span className="min-h-[44px] px-4 rounded-xl bg-[#C8FF2E]/15 border border-[#C8FF2E]/40 text-[#C8FF2E] font-display font-bold text-sm inline-flex items-center">
                  Unlimited
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={spotsInput}
                    onChange={(e) => handleSpotsInputChange(e.target.value)}
                    onBlur={handleSpotsInputBlur}
                    aria-label="Total Spots"
                    className={`w-20 min-h-[44px] h-11 px-3 text-center rounded-xl bg-[#1C241E] border ${
                      spotsError ? 'border-[#FF5C5C] text-[#FF5C5C]' : 'border-white/10 text-[#F4F7F0] focus:border-[#C8FF2E]'
                    } text-base font-bold font-mono focus:outline-none select-text`}
                  />
                  <span className="text-xs font-semibold text-[#A5B0A6]">spots</span>
                </div>
              )}
            </div>

            {!isUnlimitedSpots && spotsError && (
              <p className="text-xs text-[#FF8F8F]">{spotsError}</p>
            )}

            <div className="pt-2.5 border-t border-white/5">
              <Toggle
                checked={isUnlimitedSpots}
                onChange={(checked) => {
                  setIsUnlimitedSpots(checked);
                  if (checked) {
                    setSpotsError(null);
                  } else {
                    const safeSpots = Math.max(minAllowedSpots, Math.min(24, spotsTotal));
                    setSpotsTotal(safeSpots);
                    setSpotsInput(String(safeSpots));
                  }
                }}
                label="Open for all / No spot limit"
                sublabel="Anyone can join without a player cap"
                className="w-full"
              />
            </div>
          </div>

          {/* Single Fee Control (Split Court Fee Toggle + Stepper + Presets) */}
          <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
            <Toggle
              checked={splitCost}
              onChange={(checked) => {
                setSplitCost(checked);
                if (checked) {
                  setPricePerPlayer((prev) => (prev > 0 ? prev : lastNonZeroFee || 150));
                }
              }}
              label="Split Court Fee"
              sublabel="Share venue rental fee per attendee"
              className="w-full"
            />
            {splitCost && (
              <div className="pt-2.5 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-[#F4F7F0] block">Fee per attendee</span>
                    <span className="text-[11px] text-[#6F7B71] whitespace-nowrap">
                      Per player, in {APP_CONFIG.currency}
                    </span>
                  </div>
                  <Stepper
                    value={pricePerPlayer}
                    onChange={handleFeeChange}
                    min={0}
                    max={MAX_FEE_PHP}
                    step={10}
                    prefix={APP_CONFIG.currency}
                    ariaLabel="fee per attendee"
                  />
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {FEE_PRESETS.map((preset) => {
                    const activeFee = pricePerPlayer === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={activeFee}
                        onClick={() => handleFeeChange(preset)}
                        className={`min-h-[44px] py-1.5 rounded-xl text-[11px] font-mono font-semibold border transition-all ${
                          activeFee
                            ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                            : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-white'
                        }`}
                      >
                        {APP_CONFIG.currency}
                        {preset}
                      </button>
                    );
                  })}
                </div>
                {feeSummaryText && (
                  <div className="px-3 py-2 rounded-xl bg-[#1C241E]/80 border border-[#C8FF2E]/25 flex items-center justify-between text-xs">
                    <span className="text-[#A5B0A6]">Estimated Fee</span>
                    <span className="font-mono font-bold text-[#C8FF2E]">{feeSummaryText}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Skill Level */}
          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
              Target Skill Tier
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Beginner', 'Casual', 'Intermediate', 'Competitive'] as const).map((lvl) => {
                const isSelected = skillLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSkillLevel(lvl)}
                    className={`min-h-[44px] h-11 rounded-xl text-xs font-bold transition-all border press-scale ${
                      isSelected
                        ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-sm'
                        : 'bg-[#141A15] border-white/5 text-[#A5B0A6] hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Host Notes */}
          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
              Host Notes &amp; Entry Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bring your gear. Court lights booked from 7:00 PM."
              className="w-full p-3 rounded-2xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] placeholder-[#65756B] focus:border-[#C8FF2E] focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0B0F0C] shrink-0 flex items-center justify-end gap-3 safe-area-bottom-12">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="min-h-[48px] px-5 rounded-2xl bg-[#141A15] hover:bg-[#1C241E] text-xs font-bold text-[#A5B0A6] hover:text-white border border-white/10 transition-all press-scale disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="min-h-[48px] px-7 rounded-2xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-xs font-display font-bold text-[#0B0F0C] shadow-[0_0_20px_rgba(200,255,46,0.3)] transition-all press-scale flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <MonthCalendarSheet
        isOpen={isCalendarOpen}
        selectedDateISO={selectedDateISO}
        maxHorizonDays={MAX_BOOKING_HORIZON_DAYS}
        onSelect={(iso) => {
          setSelectedDateISO(iso);
          setScheduleMode('custom');
        }}
        onClose={() => setIsCalendarOpen(false)}
      />

      <TimeWheelSheet
        isOpen={activeTimeWheel !== null}
        value24={activeTimeWheel === 'end' ? endTime24 : kickoffTime24}
        selectedDateISO={selectedDateISO}
        blockPastTimes={false}
        title={activeTimeWheel === 'end' ? 'Select End Time' : 'Select Kickoff Time'}
        onChange={(next24) => {
          if (activeTimeWheel === 'end') {
            setEndTime24(next24);
          } else {
            updateKickoffTime(next24);
          }
        }}
        onClose={() => setActiveTimeWheel(null)}
      />
    </div>
  );
};
