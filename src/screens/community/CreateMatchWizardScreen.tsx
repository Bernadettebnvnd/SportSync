import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, ArrowRight, Check, MapPin, Calendar, Clock, DollarSign, Share2, Sparkles } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Stepper, Toggle } from '../../design-system/components/SegmentedControl';
import { APP_CONFIG } from '../../config/appConfig';

interface CreateMatchWizardScreenProps {
  onClose: () => void;
  onMatchCreated: (gameData: {
    sport: 'Football' | 'Basketball' | 'Tennis';
    title: string;
    date: string;
    locationName: string;
    playersCount: number;
    skillLevel: 'Casual' | 'Competitive';
    pricePerPlayer: number;
    notes?: string;
  }) => void;
}

export const CreateMatchWizardScreen: React.FC<CreateMatchWizardScreenProps> = ({
  onClose,
  onMatchCreated,
}) => {
  const [step, setStep] = useState(1); // 1 to 4, then 5 = Success

  // Form states
  const [sport, setSport] = useState<'Football' | 'Basketball' | 'Tennis'>('Football');
  const [title, setTitle] = useState('5v5: Sunset Game Under Lights');
  const [date, setDate] = useState('Today (19:30)');
  const [locationName, setLocationName] = useState('The Pitchway 5s Arena, N1');
  const [playersCount, setPlayersCount] = useState(10);
  const [skillLevel, setSkillLevel] = useState<'Casual' | 'Competitive'>('Casual');
  const [splitCost, setSplitCost] = useState(true);
  const [pricePerPlayer, setPricePerPlayer] = useState(6);
  const [bringBootsNote, setBringBootsNote] = useState(true);
  const [visibility, setVisibility] = useState<'Public' | 'Friends' | 'Invite'>('Public');

  const triggerConfetti = () => {
    // Confetti in electric lime #C8FF2E and soft pink #FF8FC7
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#C8FF2E', '#FF8FC7', '#FFFFFF', '#0F2A22'],
    });
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      setStep(5); // Success state
      triggerConfetti();
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-20 select-none overflow-y-auto no-scrollbar">
      {/* Top Header & Step Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={step > 1 && step < 5 ? () => setStep(step - 1) : onClose}
            className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
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

      {/* STEP 1: SPORT & TITLE */}
      {step === 1 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
              What sport & format?
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-0.5">
              Choose the format for your match.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Football', label: 'Football 5s', icon: '⚽' },
              { id: 'Basketball', label: 'Basketball', icon: '🏀' },
              { id: 'Tennis', label: 'Tennis Doubles', icon: '🎾' },
            ].map((sp) => (
              <button
                key={sp.id}
                onClick={() => setSport(sp.id as any)}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all press-scale ${
                  sport === sp.id
                    ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E] font-bold shadow-[0_0_14px_rgba(200,255,46,0.2)]'
                    : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                }`}
              >
                <span className="text-2xl">{sp.icon}</span>
                <span className="text-xs">{sp.label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
              Match Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* STEP 2: SCHEDULE & PITCH LOCATION */}
      {step === 2 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
              When & where to play?
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-0.5">
              Pick date, kickoff time, and court venue.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
              Kickoff Date & Time
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button className="h-12 rounded-2xl bg-[#1C241E] border border-[#C8FF2E] text-xs font-bold text-[#C8FF2E] flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                Today, 19:30
              </button>
              <button className="h-12 rounded-2xl bg-[#1C241E] border border-white/10 text-xs font-semibold text-[#A5B0A6] flex items-center justify-center gap-2 hover:text-white">
                <Clock className="w-4 h-4" />
                Custom Time
              </button>
            </div>
          </div>

          {/* Map Preview with Pins */}
          <div>
            <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
              Pitch Location
            </label>
            <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-white/10 bg-[#1C241E]">
              <img
                src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80"
                alt="Pitch Map"
                className="w-full h-full object-cover filter brightness-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="px-3 py-1.5 rounded-full bg-[#0B0F0C]/90 backdrop-blur-md border border-[#C8FF2E] text-xs font-bold text-[#C8FF2E] flex items-center gap-1.5 shadow-lg">
                  <MapPin className="w-4 h-4 text-[#C8FF2E]" />
                  <span>The Pitchway 5s Arena (Pitch 2)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: ROSTER, SKILL & COST SPLIT */}
      {step === 3 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
              Roster & cost split
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-0.5">
              Set max player capacity and cost sharing.
            </p>
          </div>

          {/* Stepper (2 to 22 players) */}
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between">
            <div>
              <span className="font-display font-bold text-sm text-[#F4F7F0] block">
                Total Spots
              </span>
              <span className="text-xs text-[#A5B0A6]">Min 2, Max 22</span>
            </div>
            <Stepper
              value={playersCount}
              onChange={setPlayersCount}
              min={2}
              max={22}
              unit="spots"
            />
          </div>

          {/* Cost Split Toggle */}
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
            <Toggle
              checked={splitCost}
              onChange={setSplitCost}
              label="Split Court Fee"
              sublabel="Collect small share per attendee"
            />
            {splitCost && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-[#A5B0A6]">Price per player:</span>
                <span className="font-display font-bold text-base text-[#C8FF2E]">
                  {APP_CONFIG.currency}{pricePerPlayer}
                </span>
              </div>
            )}
          </div>

          {/* Bring Your Boots checklist toggle */}
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5">
            <Toggle
              checked={bringBootsNote}
              onChange={setBringBootsNote}
              label="Checklist: Bring Your Boots"
              sublabel="Remind players to pack turf trainers and water"
            />
          </div>
        </div>
      )}

      {/* STEP 4: VISIBILITY & REVIEW */}
      {step === 4 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
              Review & publish
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-0.5">
              Double check details before opening the roster.
            </p>
          </div>

          {/* Review Card */}
          <div className="p-4 rounded-3xl bg-[#141A15] border border-[#C8FF2E]/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-bold text-[10px] uppercase">
                {sport}
              </span>
              <span className="text-xs font-bold text-[#FF8FC7]">
                {playersCount} Spots Capacity
              </span>
            </div>

            <h3 className="font-display font-bold text-base text-[#F4F7F0]">
              {title}
            </h3>

            <div className="text-xs text-[#A5B0A6] space-y-1">
              <p>📍 {locationName}</p>
              <p>⏰ {date}</p>
              <p>💵 {APP_CONFIG.currency}{pricePerPlayer} / player split</p>
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

      {/* STEP 5: SUCCESS CELEBRATION (Lime & Pink Confetti) */}
      {step === 5 && (
        <div className="text-center py-6 space-y-4 animate-scaleUp">
          <div className="w-20 h-20 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center mx-auto shadow-[0_0_36px_rgba(200,255,46,0.4)]">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>

          <div>
            <span className="text-xs font-bold text-[#FF8FC7] uppercase tracking-widest block mb-1">
              Match Live on Feed
            </span>
            <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
              Game Created!
            </h2>
            <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto mt-1">
              Your match is published. Squad invites sent to your friends.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/10 max-w-xs mx-auto text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A5B0A6]">Invite Link:</span>
              <span className="text-[#C8FF2E] font-mono">sideline.app/m/892</span>
            </div>
            <Button
              variant="social"
              size="sm"
              leftIcon={<Share2 className="w-4 h-4" />}
              className="w-full text-xs font-bold"
            >
              Share via WhatsApp / Messages
            </Button>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                onMatchCreated({
                  sport,
                  title,
                  date,
                  locationName,
                  playersCount,
                  skillLevel,
                  pricePerPlayer: splitCost ? pricePerPlayer : 0,
                  notes: bringBootsNote ? 'Bring boots & shinpads' : undefined,
                })
              }
              className="w-full font-bold"
            >
              Open Match Room & Roster
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
            onClick={handleNext}
            rightIcon={<ArrowRight className="w-5 h-5" />}
            className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)]"
          >
            {step === 4 ? 'Publish Match Now' : 'Next Step'}
          </Button>
        </div>
      )}
    </div>
  );
};
