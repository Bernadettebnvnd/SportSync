'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Calendar,
  Clock,
  Share2,
  AlertCircle,
  X,
  Sparkles,
  Copy,
  Lock,
  Globe,
  Link as LinkIcon,
  Plus,
  Trash2,
} from 'lucide-react';
import { UserAvatar } from '../../illustrations/Avatars';
import { AvatarId, CommunityGame } from '../../mock/types';
import { Button } from '../../design-system/components/Button';
import { Stepper, Toggle } from '../../design-system/components/SegmentedControl';
import { DateStrip, generateUpcomingDates } from '../../design-system/components/DateStrip';
import { MonthCalendarSheet } from '../../design-system/components/MonthCalendarSheet';
import { TimeWheelSheet } from '../../design-system/components/TimeWheelSheet';
import {
  NagaLocationPicker,
  NAGA_CITY_CENTER,
  NAGA_SPORTS_VENUES,
  NagaLandmark,
  LocationSuggestionItem,
  isWithinNagaCity,
  reverseGeocodeNaga,
} from '../../components/community/NagaLocationPicker';
import { APP_CONFIG } from '../../config/appConfig';
import { copyToClipboard, shareMatch } from '../../lib/shareUtils';
import {
  MAX_BOOKING_HORIZON_DAYS,
  formatManilaDateLabel,
  formatManilaDateShort,
  formatMatchSummaryLine,
  formatTime12h,
  formatTimeRange12h,
  getManilaTodayISO,
  getManilaTomorrowISO,
  getSmartDefaultKickoff,
  isManilaDateTimeInPast,
  parseTimeTo24h,
  shiftTime24ByMinutes,
  toManilaIsoTimestamp,
  validateEndTime,
} from '../../lib/datetime';

export {
  NAGA_CITY_CENTER,
  NAGA_SPORTS_VENUES,
  reverseGeocodeNaga,
};
export type { NagaLandmark, LocationSuggestionItem };

export const STANDARDIZED_SPORTS_OPTIONS = [
  { id: 'Basketball', label: 'Basketball', icon: '🏀' },
  { id: 'Badminton', label: 'Badminton', icon: '🏸' },
  { id: 'Volleyball', label: 'Volleyball', icon: '🏐' },
  { id: 'Football', label: 'Football', icon: '⚽' },
  { id: 'Pickleball', label: 'Pickleball', icon: '🏓' },
  { id: 'Tennis', label: 'Tennis', icon: '🎾' },
  { id: 'Billiards', label: 'Billiards', icon: '🎱' },
  { id: 'Darts', label: 'Darts', icon: '🎯' },
  { id: 'Other', label: 'Other', icon: '🏆' },
] as const;

export type WizardSport = (typeof STANDARDIZED_SPORTS_OPTIONS)[number]['id'];

const QUICK_TIME_SLOTS_24 = ['07:00', '09:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00'] as const;
const DURATION_CHIPS = [
  { label: '+1h', minutes: 60 },
  { label: '+1.5h', minutes: 90 },
  { label: '+2h', minutes: 120 },
  { label: '+3h', minutes: 180 },
] as const;
const FEE_PRESETS = [50, 100, 150, 200, 250, 350] as const;
const MAX_FEE_PHP = 5000;
const WIZARD_DRAFT_KEY = 'sportsync_create_match_draft_v1';

interface WizardDraft {
  step: number;
  sport: WizardSport;
  title: string;
  scheduleMode: 'today' | 'tomorrow' | 'custom';
  selectedDateISO: string;
  kickoffTime24: string;
  hasEndTime: boolean;
  endTime24: string;
  locationName: string;
  locationDetails: string;
  coordinates: [number, number];
  hasPin: boolean;
  selectedVenueId: string;
  isUnlimitedSpots: boolean;
  playersCount: number;
  skillLevel: 'Casual' | 'Competitive';
  splitCost: boolean;
  pricePerPlayer: number;
  bringBootsNote: boolean;
  visibility: 'Public' | 'Invite';
}

interface CreateMatchWizardScreenProps {
  currentUserName?: string;
  currentUserAvatar?: AvatarId;
  currentUserId?: string;
  onClose: () => void;
  onFinish?: () => void;
  onMatchCreated: (gameData: {
    sport: WizardSport;
    title: string;
    date: string;
    time?: string;
    endTime?: string | null;
    startsAt?: string;
    endsAt?: string | null;
    formattedDate?: string;
    locationName: string;
    locationDetails?: string;
    playersCount: number | null;
    skillLevel: 'Casual' | 'Competitive';
    pricePerPlayer: number;
    notes?: string;
    coordinates?: [number, number];
    visibility?: 'Public' | 'Invite';
    inviteCode?: string;
    venueId?: string;
    invitedPlayers?: Array<{ id: string; name: string; avatarId?: AvatarId }>;
  }) => Promise<unknown> | void;
}

export const CreateMatchWizardScreen: React.FC<CreateMatchWizardScreenProps> = ({
  currentUserName,
  currentUserAvatar,
  currentUserId,
  onClose,
  onFinish,
  onMatchCreated,
}) => {
  const smartDefault = useMemo(() => getSmartDefaultKickoff(), []);
  const todayISO = getManilaTodayISO();
  const tomorrowISO = getManilaTomorrowISO();
  const isTodayUnavailable = smartDefault.scheduleMode === 'tomorrow';

  // Restore non-sensitive draft from sessionStorage on mount
  const initialDraft = useMemo<Partial<WizardDraft> | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(WIZARD_DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<WizardDraft>;
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const [step, setStep] = useState<number>(() => {
    const saved = initialDraft?.step;
    return typeof saved === 'number' && saved >= 1 && saved <= 4 ? saved : 1;
  });

  const [availablePlayers, setAvailablePlayers] = useState<
    Array<{ id: string; name: string; avatarId: AvatarId }>
  >([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/players?excludeSelf=true', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { players: [] }))
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.players) ? data.players : [];
        const filtered = list.filter((p: { id?: string; name?: string }) => {
          if (currentUserId && p.id === currentUserId) return false;
          if (
            currentUserName &&
            p.name &&
            p.name.trim().toLowerCase() === currentUserName.trim().toLowerCase()
          ) {
            return false;
          }
          return true;
        });
        setAvailablePlayers(
          filtered.map((p: { id: string; name: string; avatarId?: string }) => ({
            id: p.id,
            name: p.name,
            avatarId: (p.avatarId || 'alex') as AvatarId,
          }))
        );
      })
      .catch(() => {
        if (active) setAvailablePlayers([]);
      })
      .finally(() => {
        if (active) setIsLoadingPlayers(false);
      });
    return () => {
      active = false;
    };
  }, [currentUserId, currentUserName]);

  // Step 1
  const [sport, setSport] = useState<WizardSport>(initialDraft?.sport || 'Basketball');
  const [title, setTitle] = useState<string>(initialDraft?.title || '');

  // Step 2: Date & Time (Asia/Manila)
  const initialDateISO = useMemo(() => {
    const d = initialDraft?.selectedDateISO;
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= todayISO) return d;
    return smartDefault.isoDate;
  }, [initialDraft, todayISO, smartDefault.isoDate]);

  const initialKickoff24 = useMemo(() => {
    const t = initialDraft?.kickoffTime24;
    if (t && !isManilaDateTimeInPast(initialDateISO, t)) return t;
    return smartDefault.time24;
  }, [initialDraft, initialDateISO, smartDefault.time24]);

  const [scheduleMode, setScheduleMode] = useState<'today' | 'tomorrow' | 'custom'>(() => {
    if (initialDraft?.scheduleMode) return initialDraft.scheduleMode;
    return smartDefault.scheduleMode;
  });
  const [selectedDateISO, setSelectedDateISO] = useState<string>(initialDateISO);
  const [kickoffTime24, setKickoffTime24] = useState<string>(initialKickoff24);
  const [hasEndTime, setHasEndTime] = useState<boolean>(Boolean(initialDraft?.hasEndTime));
  const [endTime24, setEndTime24] = useState<string>(
    initialDraft?.endTime24 || shiftTime24ByMinutes(initialKickoff24, 120)
  );

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeTimeWheel, setActiveTimeWheel] = useState<'start' | 'end' | null>(null);

  // Step 2: Location in Naga City
  const [locationName, setLocationName] = useState<string>(initialDraft?.locationName || '');
  const [locationDetails, setLocationDetails] = useState<string>(initialDraft?.locationDetails || '');
  const [coordinates, setCoordinates] = useState<[number, number]>(() => {
    const c = initialDraft?.coordinates;
    if (Array.isArray(c) && c.length === 2 && isWithinNagaCity(c[0], c[1])) {
      return [c[0], c[1]];
    }
    return NAGA_SPORTS_VENUES[0].coordinates;
  });
  const [hasPin, setHasPin] = useState<boolean>(Boolean(initialDraft?.hasPin && initialDraft?.locationName));
  const [selectedVenueId, setSelectedVenueId] = useState<string>(initialDraft?.selectedVenueId || '');

  // Step 3: Roster & Fee
  const [isUnlimitedSpots, setIsUnlimitedSpots] = useState<boolean>(Boolean(initialDraft?.isUnlimitedSpots));
  const [playersCount, setPlayersCount] = useState<number>(() => {
    const c = initialDraft?.playersCount;
    return typeof c === 'number' && c >= 2 && c <= 24 ? c : 10;
  });
  const [playersCountInput, setPlayersCountInput] = useState<string>(String(playersCount));
  const [spotsError, setSpotsError] = useState<string | null>(null);

  const [skillLevel, setSkillLevel] = useState<'Casual' | 'Competitive'>(
    initialDraft?.skillLevel || 'Casual'
  );
  const [splitCost, setSplitCost] = useState<boolean>(initialDraft?.splitCost ?? true);
  const [pricePerPlayer, setPricePerPlayer] = useState<number>(
    typeof initialDraft?.pricePerPlayer === 'number' ? initialDraft.pricePerPlayer : 150
  );
  const [lastNonZeroFee, setLastNonZeroFee] = useState<number>(
    typeof initialDraft?.pricePerPlayer === 'number' && initialDraft.pricePerPlayer > 0
      ? initialDraft.pricePerPlayer
      : 150
  );
  const [feeError, setFeeError] = useState<string | null>(null);
  const [bringBootsNote, setBringBootsNote] = useState<boolean>(initialDraft?.bringBootsNote ?? true);

  // Step 4: Visibility & Invites
  const [visibility, setVisibility] = useState<'Public' | 'Invite'>(initialDraft?.visibility || 'Public');
  const [inviteCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedPublicShare, setCopiedPublicShare] = useState(false);

  // UI & confirmation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Persist non-sensitive draft in sessionStorage (cleared on publish or discard)
  useEffect(() => {
    if (typeof window === 'undefined' || step >= 5) return;
    try {
      const draft: WizardDraft = {
        step,
        sport,
        title,
        scheduleMode,
        selectedDateISO,
        kickoffTime24,
        hasEndTime,
        endTime24,
        locationName,
        locationDetails,
        coordinates,
        hasPin,
        selectedVenueId,
        isUnlimitedSpots,
        playersCount,
        skillLevel,
        splitCost,
        pricePerPlayer,
        bringBootsNote,
        visibility,
      };
      sessionStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    step,
    sport,
    title,
    scheduleMode,
    selectedDateISO,
    kickoffTime24,
    hasEndTime,
    endTime24,
    locationName,
    locationDetails,
    coordinates,
    hasPin,
    selectedVenueId,
    isUnlimitedSpots,
    playersCount,
    skillLevel,
    splitCost,
    pricePerPlayer,
    bringBootsNote,
    visibility,
  ]);

  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(WIZARD_DRAFT_KEY);
      } catch {}
    }
  };

  const hasUnsavedInput = useMemo(() => {
    if (step >= 5) return false;
    return Boolean(
      title.trim().length > 0 ||
        locationName.trim().length > 0 ||
        locationDetails.trim().length > 0 ||
        hasEndTime ||
        step > 1
    );
  }, [step, title, locationName, locationDetails, hasEndTime]);

  const handleRequestClose = () => {
    if (hasUnsavedInput) {
      setShowDiscardConfirm(true);
    } else {
      clearDraft();
      onClose();
    }
  };

  // Shift end time by the same delta whenever kickoff changes so duration is preserved
  const updateKickoffTime = useCallback(
    (nextTime24: string, switchToCustom = true) => {
      const prevParsed = parseTimeTo24h(kickoffTime24);
      const nextParsed = parseTimeTo24h(nextTime24);
      if (hasEndTime && prevParsed && nextParsed) {
        const delta =
          nextParsed.hour24 * 60 + nextParsed.minute - (prevParsed.hour24 * 60 + prevParsed.minute);
        if (delta !== 0) {
          setEndTime24((prevEnd) => shiftTime24ByMinutes(prevEnd, delta));
        }
      }
      setKickoffTime24(nextTime24);
      if (switchToCustom) {
        setScheduleMode('custom');
      }
      setError(null);
    },
    [kickoffTime24, hasEndTime]
  );

  const handleSelectDateISO = (iso: string) => {
    const safeIso = iso < todayISO ? todayISO : iso;
    setSelectedDateISO(safeIso);
    setScheduleMode('custom');
    // If picking today and current kickoff is in the past, bump to smart default
    if (safeIso === todayISO && isManilaDateTimeInPast(safeIso, kickoffTime24)) {
      const smart = getSmartDefaultKickoff();
      if (smart.isoDate === todayISO) {
        updateKickoffTime(smart.time24, true);
      }
    }
    setError(null);
  };

  const handleSelectTodayPreset = () => {
    if (isTodayUnavailable) return;
    setScheduleMode('today');
    setSelectedDateISO(todayISO);
    updateKickoffTime(smartDefault.time24, false);
  };

  const handleSelectTomorrowPreset = () => {
    setScheduleMode('tomorrow');
    setSelectedDateISO(tomorrowISO);
    updateKickoffTime('18:00', false);
  };

  const handleAddEndTime = () => {
    setHasEndTime(true);
    setEndTime24(shiftTime24ByMinutes(kickoffTime24, 120));
  };

  const handleRemoveEndTime = () => {
    setHasEndTime(false);
    setError(null);
  };

  const handleDurationChip = (minutes: number) => {
    setHasEndTime(true);
    setEndTime24(shiftTime24ByMinutes(kickoffTime24, minutes));
    setError(null);
  };

  const endTimeValidation = useMemo(() => {
    if (!hasEndTime) return null;
    return validateEndTime(selectedDateISO, kickoffTime24, endTime24);
  }, [hasEndTime, selectedDateISO, kickoffTime24, endTime24]);

  // Roster numeric field: free typing while focused, clamp 2-24 on blur/commit
  const handlePlayersCountChange = (val: string) => {
    const digitsOnly = val.replace(/[^0-9]/g, '');
    setPlayersCountInput(digitsOnly);
    if (digitsOnly === '') {
      setSpotsError('Enter between 2 and 24 players');
      return;
    }
    const parsed = parseInt(digitsOnly, 10);
    if (parsed < 2 || parsed > 24) {
      setSpotsError('Must be between 2 and 24 players');
    } else {
      setPlayersCount(parsed);
      setSpotsError(null);
    }
  };

  const handlePlayersCountBlur = () => {
    if (!playersCountInput.trim()) {
      setPlayersCountInput(String(playersCount));
      setSpotsError(null);
      return;
    }
    const num = parseInt(playersCountInput, 10);
    if (!Number.isFinite(num)) {
      setPlayersCountInput(String(playersCount));
      setSpotsError(null);
      return;
    }
    const clamped = Math.max(2, Math.min(24, num));
    setPlayersCount(clamped);
    setPlayersCountInput(String(clamped));
    setSpotsError(null);
  };

  const handleFeeChange = (nextFee: number) => {
    setPricePerPlayer(nextFee);
    if (nextFee > 0) setLastNonZeroFee(nextFee);
  };

  const handleSplitCostToggle = (checked: boolean) => {
    setSplitCost(checked);
    if (checked) {
      setPricePerPlayer((prev) => (prev > 0 ? prev : lastNonZeroFee || 150));
    }
  };

  // Step validation reason (drives disabled Next Step button + helper text)
  const stepValidationReason = useMemo<string | null>(() => {
    if (step === 1) {
      if (!title.trim() || title.trim().length < 3) {
        return 'Enter a match title (at least 3 characters)';
      }
      return null;
    }
    if (step === 2) {
      if (selectedDateISO < todayISO) {
        return 'Choose a date today or later';
      }
      if (isManilaDateTimeInPast(selectedDateISO, kickoffTime24)) {
        return 'Choose a kickoff time in the future';
      }
      if (hasEndTime && endTimeValidation && !endTimeValidation.valid) {
        return endTimeValidation.error || 'End time must be after kickoff';
      }
      if (!locationName.trim()) {
        return 'Pin a location in Naga City';
      }
      if (!isWithinNagaCity(coordinates[0], coordinates[1])) {
        return 'Pilot area is Naga City only';
      }
      return null;
    }
    if (step === 3) {
      if (!isUnlimitedSpots) {
        const parsed = parseInt(playersCountInput, 10);
        if (!Number.isFinite(parsed) || parsed < 2 || parsed > 24) {
          return 'Enter total spots between 2 and 24';
        }
      }
      if (splitCost && (pricePerPlayer < 0 || pricePerPlayer > MAX_FEE_PHP)) {
        return `Fee must be between ${APP_CONFIG.currency}0 and ${APP_CONFIG.currency}${MAX_FEE_PHP}`;
      }
      return null;
    }
    return null;
  }, [
    step,
    title,
    selectedDateISO,
    todayISO,
    kickoffTime24,
    hasEndTime,
    endTimeValidation,
    locationName,
    coordinates,
    isUnlimitedSpots,
    playersCountInput,
    splitCost,
    pricePerPlayer,
  ]);

  const scheduleSummaryLine = useMemo(
    () => formatMatchSummaryLine(selectedDateISO, kickoffTime24, hasEndTime ? endTime24 : null),
    [selectedDateISO, kickoffTime24, hasEndTime, endTime24]
  );

  const toggleInvitedFriend = (friendId: string) => {
    setInvitedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const persistDraftInvitation = useCallback(async () => {
    if (!inviteCode || typeof window === 'undefined') return;
    const activeCapacity = isUnlimitedSpots ? null : playersCount;
    const startsAtIso = toManilaIsoTimestamp(selectedDateISO, kickoffTime24);
    const endsAtIso =
      hasEndTime && endTimeValidation?.valid ? endTimeValidation.endIso : null;

    const draftGame: CommunityGame = {
      id: 'game_' + inviteCode,
      sport: (sport as CommunityGame['sport']) || 'Basketball',
      title: title.trim() || `${sport} Match`,
      format: (activeCapacity !== null && activeCapacity <= 4 ? '2v2 Doubles' : '5v5') as CommunityGame['format'],
      skillLevel: skillLevel || 'Casual',
      date: formatManilaDateLabel(selectedDateISO),
      time: formatTimeRange12h(kickoffTime24, hasEndTime ? endTime24 : null),
      endTime: hasEndTime ? formatTime12h(endTime24) : null,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      locationName: locationName.trim() || 'Naga City Venue',
      locationDetails: locationDetails.trim() || undefined,
      distance: 'Naga City • 0.5 km away',
      hostId: currentUserId || 'organizer',
      hostName: currentUserName || 'Player',
      hostAvatar: currentUserAvatar || 'alex',
      spotsTotal: activeCapacity,
      spotsJoined: 0,
      pricePerPlayer: splitCost ? pricePerPlayer : 0,
      notes: bringBootsNote ? 'Bring proper athletic gear and hydration' : 'Organized via SportSync Matchmaking',
      coordinates,
      isPublic: visibility !== 'Invite',
      visibility: visibility || 'Public',
      inviteCode,
      members: [],
    };

    try {
      await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: draftGame }),
      });
    } catch {}
  }, [
    inviteCode,
    isUnlimitedSpots,
    playersCount,
    selectedDateISO,
    kickoffTime24,
    hasEndTime,
    endTime24,
    endTimeValidation,
    sport,
    title,
    skillLevel,
    locationName,
    locationDetails,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    splitCost,
    pricePerPlayer,
    bringBootsNote,
    coordinates,
    visibility,
  ]);

  useEffect(() => {
    if (visibility === 'Invite' && (step === 4 || step === 5)) {
      void persistDraftInvitation();
    }
  }, [visibility, step, persistDraftInvitation]);

  const handleCopyInviteLink = async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/?invite=${inviteCode}`
        : `https://sportsync.ph/?invite=${inviteCode}`;
    await persistDraftInvitation();
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    }
  };

  const handleSharePublicMatch = async () => {
    await shareMatch(
      {
        id: inviteCode,
        title,
        sport,
        locationName,
        inviteCode,
      },
      () => {
        setCopiedPublicShare(true);
        setTimeout(() => setCopiedPublicShare(false), 2500);
      }
    );
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C8FF2E', '#3DDC84', '#FFFFFF', '#0F2A22'],
      });
    } catch {}
  };

  const handlePublish = async () => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const startsAtIso = toManilaIsoTimestamp(selectedDateISO, kickoffTime24);
      const endsAtIso =
        hasEndTime && endTimeValidation?.valid ? endTimeValidation.endIso : null;
      const activeCapacity = isUnlimitedSpots
        ? null
        : Math.max(2, Math.min(24, parseInt(playersCountInput, 10) || playersCount));

      await onMatchCreated({
        sport,
        title: title.trim(),
        date: selectedDateISO,
        time: kickoffTime24,
        endTime: hasEndTime ? endTime24 : null,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        formattedDate: scheduleSummaryLine,
        locationName: locationName.trim(),
        locationDetails: locationDetails.trim() || undefined,
        playersCount: activeCapacity,
        skillLevel,
        pricePerPlayer: splitCost ? pricePerPlayer : 0,
        notes: bringBootsNote
          ? 'Bring proper athletic gear and hydration'
          : 'Organized via SportSync Matchmaking',
        coordinates,
        visibility,
        inviteCode,
        venueId: selectedVenueId || undefined,
        invitedPlayers:
          visibility === 'Invite'
            ? availablePlayers
                .filter((f) => invitedFriendIds.includes(f.id))
                .map((f) => ({
                  id: f.id,
                  name: f.name,
                  avatarId: f.avatarId,
                }))
            : undefined,
      });

      clearDraft();
      setStep(5);
      triggerConfetti();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to publish match. Please check your connection and retry.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (stepValidationReason) {
      setError(stepValidationReason);
      return;
    }
    setError(null);
    if (step < 4) {
      setStep((s) => s + 1);
    } else if (step === 4) {
      void handlePublish();
    }
  };

  const upcomingDates = useMemo(() => generateUpcomingDates(14), []);

  const feeSummaryText = useMemo(() => {
    if (!splitCost || pricePerPlayer <= 0) return null;
    if (isUnlimitedSpots) {
      return `${APP_CONFIG.currency}${pricePerPlayer.toLocaleString()} per player`;
    }
    const validSpots = Math.max(2, Math.min(24, parseInt(playersCountInput, 10) || playersCount));
    const total = validSpots * pricePerPlayer;
    return `${validSpots} spots × ${APP_CONFIG.currency}${pricePerPlayer.toLocaleString()} = ${APP_CONFIG.currency}${total.toLocaleString()} total`;
  }, [splitCost, pricePerPlayer, isUnlimitedSpots, playersCountInput, playersCount]);

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-[#0B0F0C] text-[#F4F7F0] select-none relative overflow-hidden">
      {/* Top Fixed Header & Step Progress Bar */}
      <div className="px-4 pt-4 pb-2 sm:px-5 shrink-0 bg-[#0B0F0C] z-10 border-b border-white/5">
        <div className="flex items-center justify-between mb-2.5">
          <button
            type="button"
            onClick={
              step > 1 && step < 5
                ? () => {
                    setError(null);
                    setStep(step - 1);
                  }
                : handleRequestClose
            }
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
            title={step > 1 && step < 5 ? 'Go back a step' : 'Cancel and close'}
            aria-label={step > 1 && step < 5 ? 'Go back a step' : 'Close wizard'}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#C8FF2E] block">
              {step < 5 ? `Step ${step} of 4` : 'Match Published'}
            </span>
            <span className="text-[10px] text-[#A5B0A6]">
              {step === 1 && 'Sport & Title'}
              {step === 2 && 'When & Where'}
              {step === 3 && 'Roster & Fee'}
              {step === 4 && 'Review Details'}
              {step === 5 && 'Live on Discovery'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-[#FFA394] flex items-center justify-center transition-colors press-scale"
            title="Close"
            aria-label="Close wizard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-Step Progress Bar */}
        {step < 5 && (
          <div className="w-full h-1.5 rounded-full bg-white/10 flex gap-1.5 overflow-hidden">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-full rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-[#C8FF2E]' : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main Scrollable Step Content Container */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-8 sm:px-5 sm:pt-4 space-y-4 no-scrollbar">
        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="p-3 rounded-2xl bg-[#E0533C]/15 border border-[#E0533C]/40 text-[#FFA394] text-xs flex items-center gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E0533C]" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* =========================================================================
            STEP 1: SPORT & TITLE
           ========================================================================= */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                What sport &amp; game title?
              </h2>
              <p className="text-xs text-[#A5B0A6] mt-0.5">
                Select your sport category and give your match a recognizable title.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
                Select Sport Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STANDARDIZED_SPORTS_OPTIONS.map((sp) => {
                  const isSelected = sport === sp.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        setSport(sp.id);
                        setError(null);
                      }}
                      className={`h-20 sm:h-22 p-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all press-scale ${
                        isSelected
                          ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_14px_rgba(200,255,46,0.25)]'
                          : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span className="text-2xl leading-none">{sp.icon}</span>
                      <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight line-clamp-1">
                        {sp.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                  Match Title <span className="text-[#C8FF2E]">*</span>
                </label>
                <span className="text-[10px] text-[#65756B]">Min 3 chars</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 5v5 Sunset Pickup Game"
                autoComplete="off"
                className="w-full min-h-[48px] h-12 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] placeholder-[#65756B] focus:border-[#C8FF2E] focus:outline-none transition-all"
              />

              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  '5v5 Open Pickup',
                  'Weekend Scrimmage',
                  'Casual Friendly Rally',
                  'Competitive 3v3 Run',
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setTitle(`${sport}: ${sug}`);
                      setError(null);
                    }}
                    className="min-h-[36px] text-[11px] px-3 py-1.5 rounded-full bg-[#141A15] border border-white/10 text-[#A5B0A6] hover:text-[#C8FF2E] hover:border-[#C8FF2E]/40 transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: WHEN & WHERE (CALENDAR, 12H TIME WHEEL, OPTIONAL END TIME, NAGA MAP)
           ========================================================================= */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-[#C8FF2E]/20 text-[#C8FF2E] text-[10px] font-bold uppercase tracking-wider">
                  Pilot Testing Area
                </span>
                <span className="text-xs text-[#A5B0A6]">Naga City, Cam. Sur</span>
              </div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                When &amp; where to play?
              </h2>
              <p className="text-xs text-[#A5B0A6]">
                Pick your date, kickoff time, and court location in Naga City.
              </p>
            </div>

            {/* Date & Kickoff Time Section */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                Kickoff Date &amp; Time
              </label>

              {/* 3 Non-Wrapping Preset Pills (Today / Tomorrow / Custom) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isTodayUnavailable}
                  aria-disabled={isTodayUnavailable}
                  onClick={handleSelectTodayPreset}
                  className={`min-h-[44px] px-2 rounded-2xl border text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden transition-all press-scale ${
                    isTodayUnavailable
                      ? 'bg-[#141A15] border-white/5 text-[#6F7B71] opacity-40 cursor-not-allowed'
                      : scheduleMode === 'today'
                      ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-sm'
                      : 'bg-[#1C241E] border-white/10 text-[#A5B0A6] hover:text-white'
                  }`}
                >
                  <span className="truncate">Today {formatTime12h(smartDefault.time24)}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectTomorrowPreset}
                  className={`min-h-[44px] px-2 rounded-2xl border text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden transition-all press-scale ${
                    scheduleMode === 'tomorrow'
                      ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-sm'
                      : 'bg-[#1C241E] border-white/10 text-[#A5B0A6] hover:text-white'
                  }`}
                >
                  <span className="truncate">Tomorrow 6:00 PM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode('custom')}
                  className={`min-h-[44px] px-2 rounded-2xl border text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 whitespace-nowrap transition-all press-scale ${
                    scheduleMode === 'custom'
                      ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-sm'
                      : 'bg-[#1C241E] border-white/10 text-[#A5B0A6] hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Custom</span>
                </button>
              </div>

              {/* Custom Date & Time Picker Card */}
              {scheduleMode === 'custom' && (
                <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/10 space-y-3.5">
                  {/* Date: One Tappable Human-Formatted Field + Horizontal DateStrip */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6]">
                        Date
                      </span>
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
                      onSelect={(iso) => handleSelectDateISO(iso)}
                      showCalendarPicker={true}
                      onOpenCalendar={() => setIsCalendarOpen(true)}
                    />
                  </div>

                  {/* Kickoff Time: One Tappable 12h Field + Quick Chips */}
                  <div className="space-y-2 pt-2.5 border-t border-white/5">
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
                            title={isPast ? 'This time has already passed today' : undefined}
                            onClick={() => {
                              if (isPast) return;
                              updateKickoffTime(slot, true);
                            }}
                            className={`min-h-[44px] py-2 px-1 rounded-xl text-[11px] font-semibold border transition-all press-scale whitespace-nowrap ${
                              isPast
                                ? 'bg-[#141A15] text-[#6F7B71]/50 border-white/5 opacity-40 cursor-not-allowed'
                                : activeSlot
                                ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                                : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {formatTime12h(slot)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Optional End Time Row */}
              <div className="p-3 rounded-2xl bg-[#141A15] border border-white/5 space-y-2.5">
                {!hasEndTime ? (
                  <button
                    type="button"
                    onClick={handleAddEndTime}
                    className="w-full min-h-[44px] px-2 flex items-center justify-between text-xs font-semibold text-[#C8FF2E] hover:text-[#d4ff52] transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>Add end time</span>
                    </span>
                    <span className="text-[11px] text-[#6F7B71] font-normal">Optional</span>
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6]">
                        End Time (Optional)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTimeWheel('end')}
                          className="min-h-[44px] px-3.5 rounded-xl bg-[#1C241E] border border-white/10 hover:border-[#C8FF2E] text-sm font-display font-bold text-[#F4F7F0] tabular-nums flex items-center gap-2 transition-all press-scale"
                        >
                          <Clock className="w-4 h-4 text-[#C8FF2E]" />
                          <span>{formatTime12h(endTime24)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveEndTime}
                          aria-label="Remove end time"
                          title="Remove end time"
                          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-[#1C241E] border border-white/10 text-[#A5B0A6] hover:text-[#FF5C5C] flex items-center justify-center transition-colors"
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
                            aria-pressed={isMatch}
                            onClick={() => handleDurationChip(chip.minutes)}
                            className={`min-h-[44px] rounded-xl text-xs font-bold border transition-all press-scale ${
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
                      <div className="px-3 py-2 rounded-xl bg-[#FF5C5C]/15 border border-[#FF5C5C]/35 text-[#FF8F8F] text-xs flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{endTimeValidation.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Date/Time Summary Line */}
              <div className="px-3.5 py-2.5 rounded-xl bg-[#1C241E]/80 border border-[#C8FF2E]/25 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#A5B0A6] font-medium">Match Schedule</span>
                <span className="text-xs font-display font-bold text-[#C8FF2E] tabular-nums">
                  {scheduleSummaryLine}
                </span>
              </div>
            </div>

            {/* Naga City Location Pinpointer */}
            <NagaLocationPicker
              isActive={step === 2}
              locationName={locationName}
              locationDetails={locationDetails}
              coordinates={coordinates}
              hasPin={hasPin}
              selectedVenueId={selectedVenueId}
              showQuickHubs={true}
              onChangeLocation={(update) => {
                setLocationName(update.locationName);
                setCoordinates(update.coordinates);
                setHasPin(update.hasPin);
                setSelectedVenueId(update.selectedVenueId || '');
                if (error) setError(null);
              }}
              onChangeLocationDetails={setLocationDetails}
            />
          </div>
        )}

        {/* =========================================================================
            STEP 3: ROSTER CAPACITY (WITH UNLIMITED) & SINGLE FEE CONTROL
           ========================================================================= */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                Roster capacity &amp; fee
              </h2>
              <p className="text-xs text-[#A5B0A6] mt-0.5">
                Set attendee spots or open to all, plus optional court fee split.
              </p>
            </div>

            {/* Total Spots Card (with Unlimited Toggle inside the same card) */}
            <div
              className={`p-3.5 sm:p-4 rounded-2xl bg-[#141A15] border ${
                !isUnlimitedSpots && spotsError ? 'border-[#FF5C5C]/50' : 'border-white/5'
              } space-y-3`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-display font-bold text-sm text-[#F4F7F0] block">
                    Total Spots
                  </span>
                  {!isUnlimitedSpots && (
                    <span className="text-xs text-[#A5B0A6]">Min 2, Max 24 players</span>
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
                      value={playersCountInput}
                      onChange={(e) => handlePlayersCountChange(e.target.value)}
                      onBlur={handlePlayersCountBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      placeholder="10"
                      aria-label="Total Spots"
                      className={`w-20 min-h-[44px] h-11 px-3 text-center rounded-xl bg-[#1C241E] border ${
                        spotsError
                          ? 'border-[#FF5C5C] text-[#FF5C5C]'
                          : 'border-white/10 text-[#F4F7F0] focus:border-[#C8FF2E]'
                      } text-base font-bold font-mono focus:outline-none transition-all select-text`}
                    />
                    <span className="text-xs font-semibold text-[#A5B0A6]">spots</span>
                  </div>
                )}
              </div>

              {!isUnlimitedSpots && spotsError && (
                <div className="p-2.5 rounded-xl bg-[#E0533C]/15 border border-[#E0533C]/40 text-[#FFA394] text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#E0533C]" />
                  <span>{spotsError}</span>
                </div>
              )}

              <div className="pt-2.5 border-t border-white/5">
                <Toggle
                  checked={isUnlimitedSpots}
                  onChange={(checked) => {
                    setIsUnlimitedSpots(checked);
                    if (checked) setSpotsError(null);
                  }}
                  label="Open for all / No spot limit"
                  sublabel="Anyone can join without a player cap"
                  className="w-full"
                />
              </div>
            </div>

            {/* Skill Level Selection */}
            <div>
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
                Target Skill Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSkillLevel('Casual')}
                  className={`min-h-[56px] p-3 rounded-2xl border text-left transition-all press-scale ${
                    skillLevel === 'Casual'
                      ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E]'
                      : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                  }`}
                >
                  <span className="font-display font-bold text-xs block">Casual Run</span>
                  <span className="text-[10px] opacity-80">All levels, fun &amp; welcoming</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSkillLevel('Competitive')}
                  className={`min-h-[56px] p-3 rounded-2xl border text-left transition-all press-scale ${
                    skillLevel === 'Competitive'
                      ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E]'
                      : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                  }`}
                >
                  <span className="font-display font-bold text-xs block">Competitive</span>
                  <span className="text-[10px] opacity-80">Fast-paced, regular players</span>
                </button>
              </div>
            </div>

            {/* Cost Split Toggle & Single Fee Control */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
              <Toggle
                checked={splitCost}
                onChange={handleSplitCostToggle}
                label="Split Court Fee"
                sublabel="Share venue rental fee per attendee"
                className="w-full"
              />
              {splitCost && (
                <div className="pt-2.5 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs text-[#F4F7F0] block font-semibold">
                        Fee per attendee
                      </span>
                      <span className="text-[11px] text-[#6F7B71] block whitespace-nowrap">
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
                      onOutOfBoundsChange={setFeeError}
                    />
                  </div>

                  {feeError && (
                    <p className="text-[11px] text-[#FFA394]">{feeError}</p>
                  )}

                  {/* Quick Preset Pills (no Free pill — toggle off means free) */}
                  <div className="grid grid-cols-6 gap-1.5">
                    {FEE_PRESETS.map((preset) => {
                      const isPresetSelected = pricePerPlayer === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          aria-pressed={isPresetSelected}
                          onClick={() => handleFeeChange(preset)}
                          className={`min-h-[44px] py-1.5 rounded-xl text-[11px] font-mono font-semibold border transition-all press-scale ${
                            isPresetSelected
                              ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold shadow-sm'
                              : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {APP_CONFIG.currency}
                          {preset}
                        </button>
                      );
                    })}
                  </div>

                  {/* One-Line Live Fee Summary */}
                  {feeSummaryText && (
                    <div className="px-3 py-2 rounded-xl bg-[#1C241E]/80 border border-[#C8FF2E]/25 flex items-center justify-between text-xs">
                      <span className="text-[#A5B0A6]">Estimated Fee</span>
                      <span className="font-mono font-bold text-[#C8FF2E]">{feeSummaryText}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Checklist Reminder */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#141A15] border border-white/5">
              <Toggle
                checked={bringBootsNote}
                onChange={setBringBootsNote}
                label="Checklist: Athletic Gear & Water"
                sublabel="Remind attendees to bring athletic gears and hydration"
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 4: REVIEW & PUBLISH
           ========================================================================= */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0]">
                Review &amp; publish
              </h2>
              <p className="text-xs text-[#A5B0A6] mt-0.5">
                Review your match details before publishing to the Naga discovery feed.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-[#141A15] border border-[#C8FF2E]/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-bold text-[10px] uppercase">
                  {sport}
                </span>
                <span className="text-xs font-bold text-[#3DDC84]">
                  {isUnlimitedSpots ? 'Open to all' : `${playersCount} Spots`} • {skillLevel}
                </span>
              </div>

              <h3 className="font-display font-bold text-base sm:text-lg text-[#F4F7F0] leading-snug">
                {title}
              </h3>

              <div className="text-xs text-[#A5B0A6] space-y-1.5 pt-1 border-t border-white/5">
                <p className="flex items-center gap-1.5">
                  <span className="text-[#C8FF2E]">📍</span>
                  <span className="text-[#F4F7F0] font-medium truncate">
                    {locationName}
                    {locationDetails ? ` • ${locationDetails}` : ''}
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-[#C8FF2E]">⏰</span>
                  <span className="text-[#F4F7F0] font-medium">{scheduleSummaryLine}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-[#C8FF2E]">💵</span>
                  <span>
                    {splitCost && pricePerPlayer > 0
                      ? `${APP_CONFIG.currency}${pricePerPlayer} / player split`
                      : 'Free open pickup game'}
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-[#C8FF2E]">🎯</span>
                  <span className="text-[11px] font-mono text-[#6F7B71]">
                    Coords: {coordinates[0].toFixed(4)}°N, {coordinates[1].toFixed(4)}°E (Naga City)
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  {visibility === 'Invite' ? (
                    <Lock className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
                  )}
                  <span className="text-xs text-[#F4F7F0] font-medium">
                    {visibility === 'Invite'
                      ? 'Invite Only (Hidden from public feed)'
                      : 'Public Feed'}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
                Visibility
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Public', 'Invite'] as const).map((v) => {
                  const label = v === 'Invite' ? 'Invite Only' : 'Public Feed';
                  const isSelected = visibility === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVisibility(v)}
                      className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all press-scale ${
                        isSelected
                          ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                          : 'bg-[#1C241E] text-[#A5B0A6] border-white/5'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {visibility === 'Invite' && (
              <div className="p-4 rounded-2xl bg-[#141A15] border border-[#C8FF2E]/30 space-y-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 flex items-center justify-center shrink-0 text-[#C8FF2E] mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-xs text-[#F4F7F0] block">
                      Invite-Only Access
                    </span>
                    <p className="text-[11px] text-[#A5B0A6] leading-relaxed mt-0.5">
                      Only players with your private invite link or invited friends can view and join this match.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                    Shareable Invitation Link
                  </span>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0B0F0C] border border-white/10">
                    <LinkIcon className="w-4 h-4 text-[#C8FF2E] shrink-0 ml-1" />
                    <span className="text-xs font-mono text-[#F4F7F0] truncate flex-1 select-all">
                      {typeof window !== 'undefined'
                        ? `${window.location.origin}/?invite=${inviteCode}`
                        : `https://sportsync.ph/?invite=${inviteCode}`}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all press-scale flex items-center gap-1.5 shrink-0 ${
                        copiedInvite
                          ? 'bg-[#3DDC84] text-[#0B0F0C]'
                          : 'bg-[#C8FF2E] text-[#0B0F0C] hover:bg-[#d4ff52]'
                      }`}
                    >
                      {copiedInvite ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                      Invite Friends Directly
                    </span>
                    {invitedFriendIds.length > 0 && (
                      <span className="text-[10px] font-bold text-[#C8FF2E] font-mono">
                        {invitedFriendIds.length} selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {isLoadingPlayers ? (
                      <span className="text-[11px] text-[#A5B0A6] py-1">Loading players...</span>
                    ) : availablePlayers.length === 0 ? (
                      <span className="text-[11px] text-[#A5B0A6] py-1">
                        No other players found yet — share an invite link instead.
                      </span>
                    ) : (
                      availablePlayers.slice(0, 8).map((f) => {
                        const isInvited = invitedFriendIds.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleInvitedFriend(f.id)}
                            className={`p-2 rounded-2xl border flex flex-col items-center shrink-0 transition-all press-scale ${
                              isInvited
                                ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                                : 'bg-[#0B0F0C] border-white/5 text-[#A5B0A6]'
                            }`}
                          >
                            <div className="relative">
                              <UserAvatar id={f.avatarId} name={f.name} size={32} />
                              {isInvited && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center">
                                  <Check className="w-2 h-2 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] mt-1 truncate max-w-[54px] font-medium">
                              {f.name.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            STEP 5: SUCCESS CELEBRATION
           ========================================================================= */}
        {step === 5 && (
          <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center mx-auto shadow-[0_0_36px_rgba(200,255,46,0.4)]">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            <div>
              <span className="text-xs font-bold text-[#3DDC84] uppercase tracking-widest block mb-1">
                Match Live on Feed
              </span>
              <h2 className="font-display font-black text-2xl text-[#F4F7F0]">Game Created!</h2>
              <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto mt-1">
                Your match has been pinned in Naga City and published to player discovery.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/10 max-w-xs mx-auto text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A5B0A6]">Match:</span>
                <span className="text-[#C8FF2E] font-bold truncate max-w-[160px]">{title}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A5B0A6]">Schedule:</span>
                <span className="text-white truncate max-w-[175px]">{scheduleSummaryLine}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A5B0A6]">Location:</span>
                <span className="text-white truncate max-w-[160px]">
                  {locationName}
                  {locationDetails ? ` (${locationDetails})` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A5B0A6]">Spots:</span>
                <span className="text-white font-mono">
                  {isUnlimitedSpots ? 'Open to all' : `${playersCount} capacity`}
                </span>
              </div>
              {visibility === 'Invite' ? (
                <Button
                  variant="social"
                  size="sm"
                  leftIcon={copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  className="w-full text-xs font-bold mt-2 min-h-[44px]"
                  onClick={handleCopyInviteLink}
                >
                  {copiedInvite ? 'Invite Link Copied!' : 'Copy Private Invite Link'}
                </Button>
              ) : (
                <Button
                  variant="social"
                  size="sm"
                  leftIcon={
                    copiedPublicShare ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )
                  }
                  className="w-full text-xs font-bold mt-2 min-h-[44px]"
                  onClick={handleSharePublicMatch}
                >
                  {copiedPublicShare ? 'Match Link Copied!' : 'Share Match Invite'}
                </Button>
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={onFinish || onClose}
                className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)] min-h-[48px]"
              >
                Open Match Room &amp; Roster
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          IN-FLOW FOOTER CTA (NEVER COVERED BY iOS SAFARI TOOLBAR OR KEYBOARD)
         ========================================================================= */}
      {step < 5 && (
        <div className="shrink-0 z-20 w-full px-4 pt-3 sm:px-5 bg-[#0B0F0C] border-t border-white/10 safe-area-bottom-12 space-y-1.5">
          {stepValidationReason && (
            <p className="text-[11px] text-[#A5B0A6] text-center" role="status">
              {stepValidationReason}
            </p>
          )}
          <div
            onClick={() => {
              if (stepValidationReason && !isSubmitting) {
                setError(stepValidationReason);
              }
            }}
          >
            <Button
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting || Boolean(stepValidationReason)}
              onClick={handleNext}
              rightIcon={step < 4 ? <ArrowRight className="w-5 h-5" /> : undefined}
              className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)] min-h-[48px]"
            >
              {isSubmitting
                ? 'Saving & Publishing...'
                : step === 4
                ? visibility === 'Invite'
                  ? 'Publish Invite-Only Match'
                  : 'Publish Match to Naga Feed'
                : 'Next Step'}
            </Button>
          </div>
        </div>
      )}

      {/* Monthly Calendar Bottom Sheet */}
      <MonthCalendarSheet
        isOpen={isCalendarOpen}
        selectedDateISO={selectedDateISO}
        maxHorizonDays={MAX_BOOKING_HORIZON_DAYS}
        onSelect={handleSelectDateISO}
        onClose={() => setIsCalendarOpen(false)}
      />

      {/* 12-Hour Apple-Clock Time Wheel Bottom Sheet */}
      <TimeWheelSheet
        isOpen={activeTimeWheel !== null}
        value24={activeTimeWheel === 'end' ? endTime24 : kickoffTime24}
        selectedDateISO={selectedDateISO}
        blockPastTimes={activeTimeWheel === 'start'}
        title={activeTimeWheel === 'end' ? 'Select End Time' : 'Select Kickoff Time'}
        onChange={(next24) => {
          if (activeTimeWheel === 'end') {
            setEndTime24(next24);
          } else {
            updateKickoffTime(next24, true);
          }
        }}
        onClose={() => setActiveTimeWheel(null)}
      />

      {/* Unsaved Draft Close Confirmation Dialog */}
      {showDiscardConfirm && (
        <div
          className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDiscardConfirm(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Discard match draft"
            className="w-full max-w-xs rounded-3xl bg-[#141A15] border border-white/10 p-5 space-y-4 shadow-2xl"
          >
            <div>
              <h3 className="font-display font-bold text-base text-[#F4F7F0]">
                Discard match draft?
              </h3>
              <p className="text-xs text-[#A5B0A6] mt-1 leading-relaxed">
                You have unsaved match details. Leaving now will clear your progress.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="min-h-[44px] rounded-2xl bg-[#1C241E] border border-white/10 text-xs font-bold text-[#F4F7F0] hover:bg-[#263028] transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  clearDraft();
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="min-h-[44px] rounded-2xl bg-[#FF5C5C]/20 border border-[#FF5C5C]/40 text-xs font-bold text-[#FF8F8F] hover:bg-[#FF5C5C]/30 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
