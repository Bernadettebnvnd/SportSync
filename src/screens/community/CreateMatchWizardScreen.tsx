import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Calendar,
  Clock,
  Share2,
  AlertCircle,
  Users,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Stepper, Toggle } from '../../design-system/components/SegmentedControl';
import { APP_CONFIG } from '../../config/appConfig';

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

interface CreateMatchWizardScreenProps {
  onClose: () => void;
  onFinish?: () => void;
  onMatchCreated: (gameData: {
    sport: WizardSport;
    title: string;
    date: string;
    locationName: string;
    playersCount: number;
    skillLevel: 'Casual' | 'Competitive';
    pricePerPlayer: number;
    notes?: string;
  }) => Promise<any> | void;
}

export const CreateMatchWizardScreen: React.FC<CreateMatchWizardScreenProps> = ({
  onClose,
  onFinish,
  onMatchCreated,
}) => {
  const [step, setStep] = useState(1); // 1 to 4, then 5 = Success

  // Form states
  const [sport, setSport] = useState<WizardSport>('Basketball');
  const [title, setTitle] = useState('Open Pickup Game Under Lights');
  const [date, setDate] = useState('Today (19:30)');
  const [locationName, setLocationName] = useState('The Upper Deck Sports Center, Ortigas');
  const [playersCount, setPlayersCount] = useState(10);
  const [skillLevel, setSkillLevel] = useState<'Casual' | 'Competitive'>('Casual');
  const [splitCost, setSplitCost] = useState(true);
  const [pricePerPlayer, setPricePerPlayer] = useState(150);
  const [bringBootsNote, setBringBootsNote] = useState(true);
  const [visibility, setVisibility] = useState<'Public' | 'Friends' | 'Invite'>('Public');

  // Async submission & validation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerConfetti = () => {
    // Confetti in electric lime #C8FF2E and energetic accent colors
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C8FF2E', '#3DDC84', '#FFFFFF', '#0F2A22'],
      });
    } catch {}
  };

  const validateStep = (currentStep: number): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!title.trim() || title.trim().length < 3) {
        setError('Please enter a match title with at least 3 characters.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!locationName.trim()) {
        setError('Please specify a pitch or court venue.');
        return false;
      }
    }
    if (currentStep === 3) {
      if (playersCount < 2 || playersCount > 24) {
        setError('Player capacity must be between 2 and 24.');
        return false;
      }
      if (splitCost && pricePerPlayer < 0) {
        setError('Price per player cannot be negative.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;

    if (step < 4) {
      setStep(step + 1);
    } else if (step === 4) {
      handlePublish();
    }
  };

  const handlePublish = async () => {
    if (isSubmitting) return; // Prevent duplicate submission
    setError(null);
    setIsSubmitting(true);

    try {
      await onMatchCreated({
        sport,
        title: title.trim(),
        date,
        locationName: locationName.trim(),
        playersCount,
        skillLevel,
        pricePerPlayer: splitCost ? pricePerPlayer : 0,
        notes: bringBootsNote ? 'Bring proper athletic gear and hydration' : undefined,
      });

      // Advance to success state ONLY after database/store save finishes successfully
      setStep(5);
      triggerConfetti();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to publish match. Please check your connection and retry.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-20 select-none overflow-y-auto no-scrollbar">
      {/* Top Header & Step Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={step > 1 && step < 5 ? () => { setError(null); setStep(step - 1); } : onClose}
            className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <span className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
            {step < 5 ? `Step ${step} of 4` : 'Match Published'}
          </span>

          <div className="w-9" />
        </div>

        {/* 4-Step Progress Bar */}
        {step < 5 && (
          <div className="w-full h-1.5 rounded-full bg-white/10 flex gap-1 overflow-hidden">
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

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-[#E0533C]/15 border border-[#E0533C]/40 text-[#FFA394] text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#E0533C]" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: SPORT & TITLE (9 Standardized Sports) */}
      {step === 1 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
              What sport &amp; title?
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-0.5">
              Choose from standard sports and give your pickup match a name.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
              Select Sport (9 Categories)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STANDARDIZED_SPORTS_OPTIONS.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => {
                    setSport(sp.id);
                    setError(null);
                  }}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all press-scale ${
                    sport === sp.id
                      ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_14px_rgba(200,255,46,0.2)]'
                      : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20'
                  }`}
                >
                  <span className="text-xl">{sp.icon}</span>
                  <span className="text-xs truncate max-w-[80px]">{sp.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
              Match Title <span className="text-[#C8FF2E]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. 5v5 Sunset Pickup Game"
              className="w-full h-12 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* STEP 2: SCHEDULE & VENUE LOCATION */}
      {step === 2 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
              When &amp; where to play?
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-0.5">
              Pick date, kickoff time, and court venue.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
              Kickoff Date &amp; Time
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDate('Today (19:30)')}
                className={`h-12 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  date.includes('Today')
                    ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                    : 'bg-[#1C241E] border-white/10 text-[#A5B0A6]'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Today, 19:30</span>
              </button>
              <button
                type="button"
                onClick={() => setDate('Tomorrow (18:00)')}
                className={`h-12 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  date.includes('Tomorrow')
                    ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E]'
                    : 'bg-[#1C241E] border-white/10 text-[#A5B0A6]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Tomorrow, 18:00</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
              Court / Pitch Location <span className="text-[#C8FF2E]">*</span>
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => {
                setLocationName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Upper Deck Sports Center, Ortigas"
              className="w-full h-12 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none mb-3"
            />

            {/* Map Preview Pill */}
            <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-white/10 bg-[#1C241E] flex items-center justify-center">
              <div className="px-3.5 py-1.5 rounded-full bg-[#0B0F0C]/90 backdrop-blur-md border border-[#C8FF2E] text-xs font-bold text-[#C8FF2E] flex items-center gap-1.5 shadow-lg">
                <MapPin className="w-4 h-4 text-[#C8FF2E]" />
                <span className="truncate max-w-[220px]">{locationName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: ROSTER, CAPACITY & COST SPLIT */}
      {step === 3 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
              Roster &amp; cost split
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-0.5">
              Set max player capacity and cost sharing per player.
            </p>
          </div>

          {/* Stepper (2 to 24 players) */}
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between">
            <div>
              <span className="font-display font-bold text-sm text-[#F4F7F0] block">
                Total Spots
              </span>
              <span className="text-xs text-[#A5B0A6]">Min 2, Max 24 players</span>
            </div>
            <Stepper
              value={playersCount}
              onChange={setPlayersCount}
              min={2}
              max={24}
              unit="spots"
            />
          </div>

          {/* Cost Split Toggle & Stepper */}
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
            <Toggle
              checked={splitCost}
              onChange={setSplitCost}
              label="Split Court Fee"
              sublabel="Collect small share per attendee"
            />
            {splitCost && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#A5B0A6] block">Fee per attendee:</span>
                  <span className="text-[10px] text-[#6F7B71]">Philippine Pesos (₱)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#C8FF2E]">{APP_CONFIG.currency}</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={pricePerPlayer}
                    onChange={(e) => setPricePerPlayer(Math.max(0, Number(e.target.value) || 0))}
                    className="w-24 h-10 px-3 rounded-xl bg-[#1C241E] border border-white/10 text-sm font-mono font-bold text-[#F4F7F0] text-right focus:border-[#C8FF2E] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Checklist reminder */}
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5">
            <Toggle
              checked={bringBootsNote}
              onChange={setBringBootsNote}
              label="Checklist: Athletic Gear & Hydration"
              sublabel="Remind attendees to bring shoes and water"
            />
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & PUBLISH */}
      {step === 4 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
              Review &amp; publish
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-0.5">
              Review details before creating and saving your game.
            </p>
          </div>

          {/* Review Card */}
          <div className="p-4 rounded-3xl bg-[#141A15] border border-[#C8FF2E]/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-bold text-[10px] uppercase">
                {sport}
              </span>
              <span className="text-xs font-bold text-[#3DDC84]">
                {playersCount} Spots Capacity
              </span>
            </div>

            <h3 className="font-display font-bold text-base text-[#F4F7F0]">
              {title}
            </h3>

            <div className="text-xs text-[#A5B0A6] space-y-1">
              <p>📍 {locationName}</p>
              <p>⏰ {date}</p>
              <p>
                💵 {splitCost ? `${APP_CONFIG.currency}${pricePerPlayer} / player split` : 'Free open pickup'}
              </p>
            </div>
          </div>

          {/* Visibility pills */}
          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Public', 'Friends Only', 'Invite Only'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v.split(' ')[0] as any)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border text-center transition-all ${
                    visibility.startsWith(v.split(' ')[0])
                      ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                      : 'bg-[#1C241E] text-[#A5B0A6] border-white/5'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS CELEBRATION */}
      {step === 5 && (
        <div className="text-center py-6 space-y-4 animate-scaleUp">
          <div className="w-20 h-20 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center mx-auto shadow-[0_0_36px_rgba(200,255,46,0.4)]">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>

          <div>
            <span className="text-xs font-bold text-[#3DDC84] uppercase tracking-widest block mb-1">
              Match Live on Feed
            </span>
            <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
              Game Created!
            </h2>
            <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto mt-1">
              Your match is published to the player discovery feed and saved to the database.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/10 max-w-xs mx-auto text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A5B0A6]">Match:</span>
              <span className="text-[#C8FF2E] font-bold truncate max-w-[150px]">{title}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A5B0A6]">Spots:</span>
              <span className="text-white font-mono">{playersCount} capacity</span>
            </div>
            <Button
              variant="social"
              size="sm"
              leftIcon={<Share2 className="w-4 h-4" />}
              className="w-full text-xs font-bold"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(`Join my ${sport} pickup game: ${title} at ${locationName}!`);
                }
              }}
            >
              Share Match Invite
            </Button>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={onFinish || onClose}
              className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)]"
            >
              Open Match Room &amp; Roster
            </Button>
          </div>
        </div>
      )}

      {/* Bottom CTA Button for Steps 1-4 */}
      {step < 5 && (
        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            onClick={handleNext}
            rightIcon={step < 4 ? <ArrowRight className="w-5 h-5" /> : undefined}
            className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)]"
          >
            {isSubmitting
              ? 'Saving & Publishing...'
              : step === 4
              ? 'Publish Match Now'
              : 'Next Step'}
          </Button>
        </div>
      )}
    </div>
  );
};
