import React, { useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, BarChart2, Users, MessageSquare } from 'lucide-react';
import { Match } from '../../mock/types';
import { TeamCrest } from '../../illustrations/TeamCrests';

interface VideoPlayerProps {
  match: Match;
  onSelectTab?: (tab: 'stats' | 'lineups' | 'commentary' | 'predict') => void;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  match,
  onSelectTab,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [scrubberValue, setScrubberValue] = useState(64); // percentage (e.g. 58th minute)
  const [activeControl, setActiveControl] = useState<'stats' | 'lineups' | 'commentary' | 'predict'>('predict');
  const [predictionVoted, setPredictionVoted] = useState<string | null>(null);

  const handlePillClick = (key: 'stats' | 'lineups' | 'commentary' | 'predict') => {
    setActiveControl(key);
    onSelectTab?.(key);
  };

  return (
    <div className={`relative w-full h-[520px] rounded-[32px] overflow-hidden bg-black select-none ${className}`}>
      {/* Full-bleed Dynamic Video Canvas Placeholder */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80"
          alt="Live Match Broadcast"
          className="w-full h-full object-cover filter brightness-90"
        />
        {/* Broadcast ambient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
      </div>

      {/* Top Overlay: Live Pill & Match Header */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF3B30] text-white font-display font-bold text-xs tracking-wider shadow-md">
            <span className="w-2 h-2 rounded-full bg-white animate-live-pulse" />
            <span>LIVE</span>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#F4F7F0] text-xs font-semibold">
            {match.minute ?? 58}' MIN
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Center Watermark Scoreboard */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-4">
        <div className="flex items-center gap-2">
          <TeamCrest id={match.homeTeam.crestId} size={22} />
          <span className="font-display font-bold text-xs text-white">{match.homeTeam.shortName}</span>
        </div>
        <div className="font-display font-black text-sm text-[#C8FF2E] tabular-nums">
          {match.homeScore ?? 0} : {match.awayScore ?? 0}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-xs text-white">{match.awayTeam.shortName}</span>
          <TeamCrest id={match.awayTeam.crestId} size={22} />
        </div>
      </div>

      {/* Frosted Bottom Sheet (Ref A) */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-4 rounded-t-[28px] bg-[#141A15]/90 backdrop-blur-2xl border-t border-white/10 flex flex-col gap-3">
        {/* Scrubber with Lime Thumb */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[#A5B0A6] font-medium tabular-nums">
            <span>58:12</span>
            <span className="text-[#C8FF2E] font-semibold">90:00</span>
          </div>

          <div className="relative w-full h-4 flex items-center cursor-pointer group">
            {/* Scrubber Track */}
            <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                style={{ width: `${scrubberValue}%` }}
                className="h-full bg-[#C8FF2E]"
              />
            </div>
            {/* Scrubber Lime Thumb */}
            <div
              style={{ left: `${scrubberValue}%` }}
              className="absolute -translate-x-1/2 w-4 h-4 rounded-full bg-[#C8FF2E] shadow-[0_0_12px_rgba(200,255,46,0.6)] border-2 border-[#0B0F0C] transition-transform group-hover:scale-125"
            />
          </div>
        </div>

        {/* Quick Action Pills (Stats, Lineups, Commentary, Predict) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'predict', label: 'Predict', icon: Sparkles },
            { id: 'stats', label: 'Stats', icon: BarChart2 },
            { id: 'lineups', label: 'Lineups', icon: Users },
            { id: 'commentary', label: 'Commentary', icon: MessageSquare },
          ].map((pill) => {
            const isActive = activeControl === pill.id;
            const Icon = pill.icon;
            return (
              <button
                key={pill.id}
                onClick={() => handlePillClick(pill.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all press-scale shrink-0 ${
                  isActive
                    ? 'bg-[#C8FF2E] text-[#0B0F0C] shadow-[0_0_14px_rgba(200,255,46,0.25)]'
                    : 'bg-[#1C241E] text-[#A5B0A6] hover:text-white border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Free-to-Play Prediction Card Panel */}
        {activeControl === 'predict' && match.prediction && (
          <div className="p-3 rounded-2xl bg-[#1C241E] border border-white/10 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#FF8FC7] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FF8FC7]" />
                Live Fan Prediction
              </span>
              <span className="text-[10px] text-[#A5B0A6]">+50 Playmaker XP</span>
            </div>
            <p className="font-display font-semibold text-xs text-[#F4F7F0] mb-2">
              {match.prediction.question}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {match.prediction.options.map((opt) => {
                const isSelected = predictionVoted === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPredictionVoted(opt.id)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-medium transition-all text-center flex flex-col items-center justify-center border ${
                      isSelected
                        ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                        : 'bg-[#141A15] text-[#A5B0A6] border-white/5 hover:text-white'
                    }`}
                  >
                    <span className="truncate w-full">{opt.label}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-[#0B0F0C]/80' : 'text-[#6F7B71]'}`}>
                      {opt.percentage}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
