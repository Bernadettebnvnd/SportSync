import React, { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { TEAMS } from '../../mock/mockData';
import { TeamCrest } from '../../illustrations/TeamCrests';
import { Toggle } from '../../design-system/components/SegmentedControl';

interface PersonalizationScreenProps {
  onComplete: (preferences?: {
    selectedSports: string[];
    skillLevel: string;
    favoriteTeams: string[];
  }) => void;
}

export const PersonalizationScreen: React.FC<PersonalizationScreenProps> = ({ onComplete }) => {
  const [selectedSports, setSelectedSports] = useState<string[]>(['Football', 'Tennis']);
  const [skillLevel, setSkillLevel] = useState(2); // 0: Beginner, 1: Casual, 2: Intermediate, 3: Pro
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(['northgate', 'kensington']);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const sportsList = [
    { id: 'Football', name: 'Football / 5s', icon: '⚽', color: 'border-[#C8FF2E]' },
    { id: 'Tennis', name: 'Tennis', icon: '🎾', color: 'border-[#C8432B]' },
    { id: 'Basketball', name: 'Basketball', icon: '🏀', color: 'border-[#FF8FC7]' },
    { id: 'Padel', name: 'Padel', icon: '🎾', color: 'border-[#3DDC84]' },
    { id: 'Running', name: 'Track & Run', icon: '🏃', color: 'border-[#FFC247]' },
  ];

  const skillLabels = ['Beginner', 'Casual', 'Intermediate', 'Pro / League'];

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
      }
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const toggleTeam = (teamId: string) => {
    if (favoriteTeams.includes(teamId)) {
      setFavoriteTeams(favoriteTeams.filter((t) => t !== teamId));
    } else {
      setFavoriteTeams([...favoriteTeams, teamId]);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#0B0F0C] p-6 pt-8 select-none overflow-y-auto no-scrollbar">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <span className="text-[11px] font-bold text-[#C8FF2E] uppercase tracking-widest block mb-1">
            Step 3 of 3 • Customise Feed
          </span>
          <h2 className="font-display font-black text-2xl text-[#F4F7F0]">
            What do you play?
          </h2>
          <p className="text-xs text-[#A5B0A6] mt-0.5">
            Tailor your live fixtures, pickup games, and pitch recommendations.
          </p>
        </div>

        {/* 1. Pick Sports (Multi-select big tiles) */}
        <div>
          <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block mb-2.5">
            1. Select Your Sports
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {sportsList.map((sport) => {
              const isSelected = selectedSports.includes(sport.id);
              return (
                <button
                  key={sport.id}
                  onClick={() => toggleSport(sport.id)}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all press-scale ${
                    isSelected
                      ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_16px_rgba(200,255,46,0.18)]'
                      : 'bg-[#1C241E] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{sport.icon}</span>
                    <span className={`text-xs font-semibold ${isSelected ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                      {sport.name}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'border border-white/20'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Pick Skill Level (Slider with labels Beginner to Pro) */}
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
            <span>Pro</span>
          </div>
        </div>

        {/* 3. Favorite Clubs (Crest Grid) */}
        <div>
          <label className="text-xs font-bold text-[#F4F7F0] uppercase tracking-wider block mb-2.5">
            3. Follow Clubs for Live Match Alerts
          </label>
          <div className="grid grid-cols-4 gap-2">
            {Object.values(TEAMS).map((team) => {
              const isSelected = favoriteTeams.includes(team.id);
              return (
                <button
                  key={team.id}
                  onClick={() => toggleTeam(team.id)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center text-center transition-all press-scale ${
                    isSelected
                      ? 'bg-[#141A15] border-[#C8FF2E] shadow-[0_0_12px_rgba(200,255,46,0.2)]'
                      : 'bg-[#1C241E] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="relative mb-1">
                    <TeamCrest id={team.crestId} size={28} />
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-[#F4F7F0] truncate w-full">
                    {team.shortName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Notification Preferences */}
        <div className="p-3.5 rounded-2xl bg-[#1C241E] border border-white/5">
          <Toggle
            checked={notificationsEnabled}
            onChange={setNotificationsEnabled}
            label="Instant Match Reminders"
            sublabel="Goal alerts and pickup game confirmations"
          />
        </div>
      </div>

      {/* Complete Button */}
      <div className="pt-6 pb-2">
        <Button
          variant="primary"
          size="lg"
          onClick={() =>
            onComplete({
              selectedSports,
              skillLevel: skillLabels[skillLevel],
              favoriteTeams,
            })
          }
          rightIcon={<ArrowRight className="w-5 h-5" />}
          className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)]"
        >
          Enter SIDELINE Hub
        </Button>
      </div>
    </div>
  );
};
