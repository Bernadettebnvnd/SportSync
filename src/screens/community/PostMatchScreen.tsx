import React, { useState } from 'react';
import { ArrowLeft, Star, Trophy, Award, Share2, Check, Sparkles } from 'lucide-react';
import { UserAvatar } from '../../illustrations/Avatars';
import { Button } from '../../design-system/components/Button';
import { StadiumScene } from '../../illustrations/Scenes';
import { FRIENDS, CURRENT_USER } from '../../mock/mockData';
import { APP_CONFIG } from '../../config/appConfig';

interface PostMatchScreenProps {
  onBack: () => void;
  onDone: () => void;
}

export const PostMatchScreen: React.FC<PostMatchScreenProps> = ({ onBack, onDone }) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Great passer', 'Fair play']);
  const [selectedMvp, setSelectedMvp] = useState<string>('marcus');
  const [scoreHome, setScoreHome] = useState(7);
  const [scoreAway, setScoreAway] = useState(4);
  const [showStoryModal, setShowStoryModal] = useState(false);

  const tagsList = ['Great passer', 'Fair play', 'Clinical finisher', 'Iron defender', 'Speed demon'];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <span className="font-display font-bold text-xs uppercase tracking-wider text-[#C8FF2E]">
          Full-Time Wrap Up
        </span>

        <button
          onClick={() => setShowStoryModal(true)}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#FF8FC7] flex items-center justify-center hover:bg-[#263028]"
          title="Share to Instagram Story"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-display font-black text-2xl text-[#F4F7F0]">
            Match Finished!
          </h1>
          <p className="text-xs text-[#A5B0A6] mt-0.5">
            5v5: Sunset Game Under Lights • Final Result
          </p>
        </div>

        {/* 2. Scoreboard Input */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/10 text-center">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[#A5B0A6] block mb-2">
            Final Score
          </span>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <span className="text-xs font-bold text-[#F4F7F0] block mb-1">Bibs White</span>
              <span className="font-display font-black text-4xl text-[#C8FF2E] tabular-nums">
                {scoreHome}
              </span>
            </div>
            <span className="font-display font-bold text-2xl text-[#6F7B71]">:</span>
            <div className="text-center">
              <span className="text-xs font-bold text-[#F4F7F0] block mb-1">Bibs Dark</span>
              <span className="font-display font-black text-4xl text-[#FF8FC7] tabular-nums">
                {scoreAway}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Vote Match MVP */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#F4F7F0] flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#C8FF2E]" />
              Vote Match MVP
            </h3>
            <span className="text-[10px] text-[#A5B0A6]">+100 Playmaker XP</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {FRIENDS.slice(0, 3).map((player) => {
              const isSelected = selectedMvp === player.avatarId;
              return (
                <button
                  key={player.id}
                  onClick={() => setSelectedMvp(player.avatarId)}
                  className={`p-3 rounded-2xl border flex flex-col items-center text-center transition-all press-scale ${
                    isSelected
                      ? 'bg-[#1C241E] border-[#C8FF2E] text-[#C8FF2E] shadow-[0_0_12px_rgba(200,255,46,0.2)]'
                      : 'bg-[#141A15] border-white/5 text-[#A5B0A6]'
                  }`}
                >
                  <UserAvatar id={player.avatarId} size={32} />
                  <span className="text-xs font-semibold text-[#F4F7F0] mt-1 truncate w-full">
                    {player.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-[#6F7B71]">Striker</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Rate Spirit & Fair Play (5 Stars + Badges) */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#F4F7F0]">
              Game Spirit & Fair Play
            </h3>
            <span className="text-xs font-bold text-[#C8FF2E]">{rating} / 5</span>
          </div>

          <div className="flex items-center justify-center gap-2 py-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-7 h-7 ${
                    star <= rating ? 'text-[#C8FF2E] fill-[#C8FF2E]' : 'text-white/20'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tagsList.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                      : 'bg-[#1C241E] text-[#A5B0A6] border-white/5'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Complete Button */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={onDone}
            className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)]"
          >
            Submit Post-Match Ratings
          </Button>
        </div>
      </div>

      {/* 6. Instagram Story Card Modal (1080 x 1920 Proportions) */}
      {showStoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-6 flex flex-col items-center justify-center animate-fadeIn">
          <div className="relative w-full max-w-[320px] aspect-[9/16] rounded-3xl bg-[#0F2A22] border-2 border-[#C8FF2E] shadow-2xl p-6 flex flex-col justify-between overflow-hidden">
            <StadiumScene className="absolute inset-0 w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C] via-transparent to-[#0B0F0C]/80" />

            <div className="relative z-10 text-center">
              <span className="font-display font-black text-xs text-[#C8FF2E] uppercase tracking-widest">
                {APP_CONFIG.appName} MATCHDAY
              </span>
              <h3 className="font-display font-black text-xl text-white mt-1">
                Sunset 5v5 Victory!
              </h3>
            </div>

            <div className="relative z-10 text-center py-4">
              <div className="font-display font-black text-5xl text-[#C8FF2E] tabular-nums tracking-tighter">
                {scoreHome} - {scoreAway}
              </div>
              <span className="text-xs font-semibold text-white/90 mt-1 block">
                MVP: Marcus Bell • 4 Goals
              </span>
            </div>

            <div className="relative z-10 text-center space-y-2">
              <p className="font-editorial text-xl text-white">
                "Gather your friends. Play more."
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowStoryModal(false)}
                className="w-full font-bold text-xs"
              >
                Close Story Card
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
