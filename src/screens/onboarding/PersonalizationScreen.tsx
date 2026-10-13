import React, { useState } from 'react';
import { Check, ArrowRight, MapPin, User, Calendar, Clock } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { SportIcon, SportId } from '../../illustrations/SportIcons';
import { Toggle } from '../../design-system/components/SegmentedControl';

interface PersonalizationScreenProps {
  onComplete: (preferences?: {
    fullName?: string;
    selectedSports: string[];
    skillLevel: string;
    preferredArea?: string;
    availability?: string;
    avatarUrl?: string;
  }) => void;
}

export const PersonalizationScreen: React.FC<PersonalizationScreenProps> = ({ onComplete }) => {
  const [displayName, setDisplayName] = useState('Alex Rivera');
  const [selectedSports, setSelectedSports] = useState<string[]>(['Football', 'Basketball']);
  const [customSportInput, setCustomSportInput] = useState<string>('');
  const [skillLevel, setSkillLevel] = useState(2); // 0: Beginner, 1: Casual, 2: Intermediate, 3: Pro
  const [preferredArea, setPreferredArea] = useState('Downtown / Central');
  const [availability, setAvailability] = useState('Weekday Evenings & Weekends');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Exact 9 requested primary sports
  const officialSports: Array<{ id: SportId; name: string }> = [
    { id: 'Football', name: 'Football' },
    { id: 'Basketball', name: 'Basketball' },
    { id: 'Tennis', name: 'Tennis' },
    { id: 'Pickleball', name: 'Pickleball' },
    { id: 'Badminton', name: 'Badminton' },
    { id: 'Volleyball', name: 'Volleyball' },
    { id: 'Billiards', name: 'Billiards' },
    { id: 'Darts', name: 'Darts' },
    { id: 'Other', name: 'Other' },
  ];

  const skillLabels = ['Beginner', 'Casual', 'Intermediate', 'Competitive'];

  const availabilityOptions = [
    'Weekday Evenings & Weekends',
    'Weekday Mornings',
    'Weekend Afternoons',
    'Flexible / Anytime',
  ];

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
      }
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const hasOther = selectedSports.includes('Other');

  const handleFinish = () => {
    let finalSports = [...selectedSports];
    if (hasOther && customSportInput.trim()) {
      const normalizedCustom = customSportInput.trim();
      finalSports = finalSports.filter((s) => s !== 'Other').concat(normalizedCustom);
    }
    onComplete({
      fullName: displayName.trim() || 'Alex Rivera',
      selectedSports: finalSports,
      skillLevel: skillLabels[skillLevel],
      preferredArea,
      availability,
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#0B0F0C] p-6 pt-8 select-none overflow-y-auto no-scrollbar">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <span className="text-[11px] font-bold text-[#C8FF2E] uppercase tracking-widest block mb-1">
            Step 3 of 3 • Customise Your Experience
          </span>
          <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
            Player Profile & Sports
          </h2>
          <p className="text-xs text-[#A5B0A6] mt-0.5">
            SportSync connects you with compatible local players and complete rosters.
          </p>
        </div>

        {/* 1. Display Name */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
          <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
            1. Display Name
          </label>
          <div className="relative flex items-center">
            <User className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
            />
          </div>
        </div>


        {/* 1. Pick Sports (Multi-select 9 official sports with SVG icons) */}
        <div>
          <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block mb-2.5">
            1. Select Your Preferred Sports
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {officialSports.map((sport) => {
              const isSelected = selectedSports.includes(sport.id);
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => toggleSport(sport.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all press-scale ${
                    isSelected
                      ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_16px_rgba(200,255,46,0.18)]'
                      : 'bg-[#1C241E] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SportIcon
                      sport={sport.id}
                      size={18}
                      color={isSelected ? '#C8FF2E' : '#A5B0A6'}
                    />
                    <span className={`text-xs font-semibold ${isSelected ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                      {sport.name}
                    </span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'border border-white/20'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom sport input if "Other" is selected */}
          {hasOther && (
            <div className="mt-3 p-3 rounded-2xl bg-[#141A15] border border-[#C8FF2E]/40 animate-fadeIn space-y-1.5">
              <label className="text-[11px] font-bold text-[#C8FF2E] uppercase tracking-wider block">
                Specify Other Sport
              </label>
              <input
                type="text"
                value={customSportInput}
                onChange={(e) => setCustomSportInput(e.target.value)}
                placeholder="e.g. Table Tennis, Padel, Ultimate Frisbee"
                className="w-full h-10 px-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
              />
            </div>
          )}
        </div>

        {/* 2. Pick Skill Level */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider">
              2. Skill Level
            </label>
            <span className="text-xs font-bold text-[#C8FF2E]">
              {skillLabels[skillLevel]}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={skillLevel}
            onChange={(e) => setSkillLevel(parseInt(e.target.value))}
            className="w-full accent-[#C8FF2E] cursor-pointer"
          />

          <div className="flex items-center justify-between text-[10px] text-[#6F7B71] font-semibold mt-1">
            <span>Beginner</span>
            <span>Casual</span>
            <span>Intermediate</span>
            <span>Competitive</span>
          </div>
        </div>

        {/* 3. Preferred Playing Area */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
          <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
            3. Preferred Playing Area / District
          </label>
          <div className="relative flex items-center">
            <MapPin className="absolute left-3 w-4 h-4 text-[#C8FF2E]" />
            <input
              type="text"
              value={preferredArea}
              onChange={(e) => setPreferredArea(e.target.value)}
              placeholder="e.g. Downtown, North District, West Parks"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
            />
          </div>
        </div>

        {/* 4. General Availability */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2.5">
          <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block">
            4. General Playing Availability
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availabilityOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAvailability(opt)}
                className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                  availability === opt
                    ? 'bg-[#C8FF2E]/10 border-[#C8FF2E] text-[#C8FF2E] font-bold'
                    : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:text-[#F4F7F0]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Notification Preferences */}
        <div className="p-3.5 rounded-2xl bg-[#1C241E] border border-white/5">
          <Toggle
            checked={notificationsEnabled}
            onChange={setNotificationsEnabled}
            label="Game & Roster Notifications"
            sublabel="Alerts when local games need additional players"
          />
        </div>
      </div>

      {/* Complete Button */}
      <div className="pt-6 pb-2">
        <Button
          variant="primary"
          size="lg"
          onClick={handleFinish}
          rightIcon={<ArrowRight className="w-5 h-5" />}
          className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)] press-scale"
        >
          Enter SportSync
        </Button>
      </div>
    </div>
  );
};
