import React, { useState } from 'react';
import { ArrowLeft, Trophy, Flame, Target, Award, Crown } from 'lucide-react';
import { FRIENDS, CURRENT_USER } from '../../mock/mockData';
import { UserAvatar } from '../../illustrations/Avatars';

interface AchievementsLeaderboardScreenProps {
  onBack: () => void;
}

export const AchievementsLeaderboardScreen: React.FC<AchievementsLeaderboardScreenProps> = ({
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'streaks' | 'challenges'>('leaderboard');

  // Sorted leaderboard
  const sortedPlayers = [
    { rank: 1, name: 'Leo Varga', username: '@leovarga', avatar: 'leo' as const, xp: 11200, level: 22, color: '#C8FF2E' },
    { rank: 2, name: 'Elena Rostova', username: '@elena_r', avatar: 'elena' as const, xp: 9400, level: 21, color: '#FF8FC7' },
    { rank: 3, name: 'Martin Green', username: '@m_green', avatar: 'martin' as const, xp: 7800, level: 19, color: '#F4F7F0' },
    { rank: 4, name: 'Alex Rivera (You)', username: '@alex_rivera', avatar: 'alex' as const, xp: 7240, level: 18, isMe: true },
    { rank: 5, name: 'Marcus Bell', username: '@marcus_b', avatar: 'marcus' as const, xp: 7200, level: 18 },
    { rank: 6, name: 'Kai Takahashi', username: '@kai_t', avatar: 'kai' as const, xp: 6200, level: 16 },
  ];

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="font-display font-black text-base text-[#F4F7F0]">
          Squad Rankings & Streaks
        </h1>

        <div className="w-9" />
      </div>

      {/* 2. Switcher */}
      <div className="flex rounded-2xl bg-[#141A15] p-1 border border-white/5 mb-6">
        {[
          { id: 'leaderboard', label: 'Leaderboard' },
          { id: 'streaks', label: 'Weekly Streaks' },
          { id: 'challenges', label: 'Badges' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                isActive
                  ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm'
                  : 'text-[#A5B0A6]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. PODIUM (Top 3 with Lime, Pink, Cream Colors) */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="relative pt-6 pb-2 px-2 flex items-end justify-center gap-3">
            {/* Rank 2 (Pink) */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="relative mb-2">
                <UserAvatar id={sortedPlayers[1].avatar} size={48} />
                <span className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-[#FF8FC7] text-[#0B0F0C] flex items-center justify-center font-display font-black text-[10px]">
                  2
                </span>
              </div>
              <span className="font-display font-bold text-xs text-[#F4F7F0] truncate max-w-[85px]">
                {sortedPlayers[1].name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-[#FF8FC7] font-mono">
                {sortedPlayers[1].xp} XP
              </span>
              {/* Podium Pillar */}
              <div className="w-full h-24 rounded-t-2xl bg-[#FF8FC7]/15 border-t-2 border-[#FF8FC7] mt-2 flex items-center justify-center font-display font-black text-xl text-[#FF8FC7]">
                2nd
              </div>
            </div>

            {/* Rank 1 (Lime - Highest elevated) */}
            <div className="flex-1 flex flex-col items-center text-center -translate-y-4">
              <Crown className="w-6 h-6 text-[#C8FF2E] mb-1 animate-bounce" />
              <div className="relative mb-2">
                <UserAvatar id={sortedPlayers[0].avatar} size={58} />
                <span className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-xs shadow-md">
                  1
                </span>
              </div>
              <span className="font-display font-bold text-sm text-[#F4F7F0] truncate max-w-[95px]">
                {sortedPlayers[0].name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-[#C8FF2E] font-mono font-bold">
                {sortedPlayers[0].xp} XP
              </span>
              {/* Podium Pillar */}
              <div className="w-full h-32 rounded-t-2xl bg-[#C8FF2E]/20 border-t-2 border-[#C8FF2E] mt-2 flex items-center justify-center font-display font-black text-2xl text-[#C8FF2E] shadow-[0_0_24px_rgba(200,255,46,0.2)]">
                1st
              </div>
            </div>

            {/* Rank 3 (Cream) */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="relative mb-2">
                <UserAvatar id={sortedPlayers[2].avatar} size={48} />
                <span className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-[#F4F7F0] text-[#0B0F0C] flex items-center justify-center font-display font-black text-[10px]">
                  3
                </span>
              </div>
              <span className="font-display font-bold text-xs text-[#F4F7F0] truncate max-w-[85px]">
                {sortedPlayers[2].name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-[#A5B0A6] font-mono">
                {sortedPlayers[2].xp} XP
              </span>
              {/* Podium Pillar */}
              <div className="w-full h-18 rounded-t-2xl bg-white/10 border-t-2 border-white/40 mt-2 flex items-center justify-center font-display font-black text-lg text-white/70">
                3rd
              </div>
            </div>
          </div>

          {/* Leaderboard List (Rank 4 to 6) */}
          <div className="p-3.5 rounded-3xl bg-[#141A15] border border-white/5 space-y-2">
            {sortedPlayers.slice(3).map((player) => (
              <div
                key={player.rank}
                className={`p-3 rounded-2xl flex items-center justify-between text-xs transition-colors ${
                  player.isMe ? 'bg-[#C8FF2E]/10 border border-[#C8FF2E]/30' : 'bg-[#1C241E]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-display font-bold text-xs text-[#A5B0A6] w-4">
                    #{player.rank}
                  </span>
                  <UserAvatar id={player.avatar} size={28} />
                  <div>
                    <span className={`font-semibold ${player.isMe ? 'text-[#C8FF2E] font-bold' : 'text-[#F4F7F0]'}`}>
                      {player.name}
                    </span>
                    <span className="text-[10px] text-[#6F7B71] block">Lv.{player.level}</span>
                  </div>
                </div>
                <span className="font-display font-bold text-xs text-[#F4F7F0] tabular-nums font-mono">
                  {player.xp} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. WEEKLY STREAKS TAB */}
      {activeTab === 'streaks' && (
        <div className="space-y-3">
          <div className="p-4 rounded-3xl bg-[#0F2A22] border border-[#C8FF2E]/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center">
                <Flame className="w-6 h-6 fill-[#0B0F0C]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A5B0A6]">Active Playing Streak</span>
                <h3 className="font-display font-black text-xl text-[#F4F7F0]">4 Consecutive Weeks</h3>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2 text-xs">
            <h4 className="font-bold text-[#F4F7F0]">Streak Benefits</h4>
            <p className="text-[#A5B0A6] leading-relaxed">
              Maintain your streak by playing at least 1 verified match per week to earn 2x Playmaker XP and unlock custom avatar crests.
            </p>
          </div>
        </div>
      )}

      {/* 5. CHALLENGES / BADGES TAB */}
      {activeTab === 'challenges' && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: 'Floodlight Warrior', desc: 'Play 5 evening games', unlocked: true, icon: '⚡' },
            { title: 'Playmaker Vision', desc: 'Deliver 10 assists', unlocked: true, icon: '🎯' },
            { title: 'Century Club', desc: 'Score 100 career goals', unlocked: false, icon: '🏆' },
            { title: 'Clay Specialist', desc: 'Win 3 tennis matches on clay', unlocked: true, icon: '🎾' },
          ].map((b, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border flex flex-col justify-between ${
                b.unlocked
                  ? 'bg-[#141A15] border-[#C8FF2E]/30 text-[#F4F7F0]'
                  : 'bg-[#141A15]/50 border-white/5 opacity-50'
              }`}
            >
              <span className="text-2xl mb-2">{b.icon}</span>
              <div>
                <h4 className="font-display font-bold text-xs text-[#F4F7F0]">{b.title}</h4>
                <p className="text-[10px] text-[#A5B0A6] mt-0.5">{b.desc}</p>
              </div>
              <span className={`text-[9px] font-bold uppercase mt-3 ${b.unlocked ? 'text-[#C8FF2E]' : 'text-[#6F7B71]'}`}>
                {b.unlocked ? '✓ Unlocked' : 'Locked'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
