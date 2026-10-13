import React, { useState } from 'react';
import { ArrowLeft, Trophy, Flame, Target, Award, Crown, Sparkles, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { FRIENDS, CURRENT_USER } from '../../mock/mockData';
import { BadgeItem } from '../../mock/types';
import { UserAvatar } from '../../illustrations/Avatars';
import { DEFAULT_BADGES, SQUAD_FRIENDS_BASE } from '../../lib/useSportSyncBridge';

interface AchievementsLeaderboardScreenProps {
  onBack: () => void;
  userProfile?: any;
  badges?: BadgeItem[];
  leaderboardPlayers?: any[];
  onClaimBadge?: (badgeId: string) => { success: boolean; earnedXp?: number; message: string };
  onAwardXp?: (amount: number, reason: string) => void;
}

export const AchievementsLeaderboardScreen: React.FC<AchievementsLeaderboardScreenProps> = ({
  onBack,
  userProfile = CURRENT_USER,
  badges = DEFAULT_BADGES,
  leaderboardPlayers,
  onClaimBadge,
  onAwardXp,
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'streaks' | 'challenges'>('leaderboard');
  const [claimedToast, setClaimedToast] = useState<string | null>(null);

  // Compute dynamic player list if not provided directly
  const dynamicPlayers = leaderboardPlayers || [
    ...SQUAD_FRIENDS_BASE,
    {
      rank: 4,
      name: `${userProfile.name} (You)`,
      username: userProfile.username,
      avatar: userProfile.avatarId || ('alex' as const),
      xp: userProfile.xp,
      level: userProfile.level,
      isMe: true,
      color: '#C8FF2E',
    },
  ].sort((a, b) => b.xp - a.xp).map((p, idx) => ({ ...p, rank: idx + 1 }));

  const myPlayer = dynamicPlayers.find((p) => p.isMe);
  const myRank = myPlayer?.rank || 4;
  const myXp = userProfile.xp || 7240;

  // Next player to overtake calculation
  const nextPlayerAhead = myRank > 1 ? dynamicPlayers[myRank - 2] : null;
  const xpNeededToClimb = nextPlayerAhead ? Math.max(10, nextPlayerAhead.xp - myXp + 15) : 0;

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="font-display font-black text-base text-[#F4F7F0]">
          Squad Rankings & Badges
        </h1>

        <div className="w-9" />
      </div>

      {/* 2. Switcher */}
      <div className="flex rounded-2xl bg-[#141A15] p-1 border border-white/5 mb-5">
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

      {/* Feedback Toast */}
      {claimedToast && (
        <div className="mb-4 p-2.5 rounded-xl bg-[#0F2A22] border border-[#C8FF2E]/30 text-xs text-[#3DDC84] font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#C8FF2E]" />
          <span>{claimedToast}</span>
        </div>
      )}

      {/* 3. PODIUM & SQUAD RANKINGS TAB */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-5">
          {/* Rank climbing teaser card */}
          <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#F4F7F0]">
                  Your Standing: <strong className="text-[#C8FF2E]">#{myRank}</strong>
                </span>
                <span className="text-[10px] text-[#A5B0A6]">({myXp} XP)</span>
              </div>
              <p className="text-[11px] text-[#A5B0A6] mt-0.5">
                {myRank === 1
                  ? '👑 You hold the Squad Crown!'
                  : nextPlayerAhead
                  ? `Need +${xpNeededToClimb} XP to pass ${nextPlayerAhead.name.split(' ')[0]} (#${nextPlayerAhead.rank})`
                  : 'Playing on the podium'}
              </p>
            </div>

            {/* Quick Test XP Surge Button */}
            {onAwardXp && (
              <button
                onClick={() => {
                  onAwardXp(300, 'Squad Leaderboard Surge Boost');
                  setClaimedToast('⚡ +300 XP awarded! Ranking updated!');
                  setTimeout(() => setClaimedToast(null), 3000);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#C8FF2E]/15 border border-[#C8FF2E]/30 text-[11px] font-bold text-[#C8FF2E] flex items-center gap-1 hover:bg-[#C8FF2E]/25 transition-all press-scale"
              >
                <Zap className="w-3.5 h-3.5 fill-[#C8FF2E]" />
                <span>+300 XP</span>
              </button>
            )}
          </div>

          {/* DYNAMIC PODIUM (Top 3 with Lime, Pink, Cream Colors) */}
          <div className="relative pt-6 pb-2 px-1 flex items-end justify-center gap-2.5">
            {/* Rank 2 (Left - Pink) */}
            {dynamicPlayers[1] && (
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <UserAvatar id={dynamicPlayers[1].avatar} size={48} />
                  <span className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-[#FF8FC7] text-[#0B0F0C] flex items-center justify-center font-display font-black text-[10px] shadow-sm">
                    2
                  </span>
                </div>
                <span className={`font-display font-bold text-xs truncate max-w-[85px] ${dynamicPlayers[1].isMe ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                  {dynamicPlayers[1].name.split(' ')[0]} {dynamicPlayers[1].isMe && '⭐'}
                </span>
                <span className="text-[10px] text-[#FF8FC7] font-mono font-semibold">
                  {dynamicPlayers[1].xp} XP
                </span>
                {/* Podium Pillar */}
                <div className={`w-full h-24 rounded-t-2xl border-t-2 mt-2 flex flex-col items-center justify-center ${
                  dynamicPlayers[1].isMe
                    ? 'bg-[#FF8FC7]/25 border-[#FF8FC7] shadow-[0_0_15px_rgba(255,143,199,0.3)]'
                    : 'bg-[#FF8FC7]/15 border-[#FF8FC7]'
                }`}>
                  <span className="font-display font-black text-xl text-[#FF8FC7]">2nd</span>
                  <span className="text-[9px] text-[#A5B0A6]">Lv.{dynamicPlayers[1].level}</span>
                </div>
              </div>
            )}

            {/* Rank 1 (Center - Elevated Lime) */}
            {dynamicPlayers[0] && (
              <div className="flex-1 flex flex-col items-center text-center -translate-y-4">
                <Crown className="w-6 h-6 text-[#C8FF2E] mb-1 animate-bounce" />
                <div className="relative mb-2">
                  <UserAvatar id={dynamicPlayers[0].avatar} size={58} />
                  <span className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-xs shadow-md">
                    1
                  </span>
                </div>
                <span className={`font-display font-bold text-sm truncate max-w-[95px] ${dynamicPlayers[0].isMe ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                  {dynamicPlayers[0].name.split(' ')[0]} {dynamicPlayers[0].isMe && '👑'}
                </span>
                <span className="text-[10px] text-[#C8FF2E] font-mono font-bold">
                  {dynamicPlayers[0].xp} XP
                </span>
                {/* Podium Pillar */}
                <div className={`w-full h-32 rounded-t-2xl border-t-2 mt-2 flex flex-col items-center justify-center ${
                  dynamicPlayers[0].isMe
                    ? 'bg-[#C8FF2E]/30 border-[#C8FF2E] shadow-[0_0_25px_rgba(200,255,46,0.4)]'
                    : 'bg-[#C8FF2E]/20 border-[#C8FF2E]'
                }`}>
                  <span className="font-display font-black text-2xl text-[#C8FF2E]">1st</span>
                  <span className="text-[10px] text-[#F4F7F0]/80 font-semibold">Lv.{dynamicPlayers[0].level}</span>
                </div>
              </div>
            )}

            {/* Rank 3 (Right - Cream) */}
            {dynamicPlayers[2] && (
              <div className="flex-1 flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <UserAvatar id={dynamicPlayers[2].avatar} size={48} />
                  <span className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-[#F4F7F0] text-[#0B0F0C] flex items-center justify-center font-display font-black text-[10px] shadow-sm">
                    3
                  </span>
                </div>
                <span className={`font-display font-bold text-xs truncate max-w-[85px] ${dynamicPlayers[2].isMe ? 'text-[#C8FF2E]' : 'text-[#F4F7F0]'}`}>
                  {dynamicPlayers[2].name.split(' ')[0]} {dynamicPlayers[2].isMe && '(You)'}
                </span>
                <span className="text-[10px] text-[#A5B0A6] font-mono">
                  {dynamicPlayers[2].xp} XP
                </span>
                {/* Podium Pillar */}
                <div className={`w-full h-18 rounded-t-2xl border-t-2 mt-2 flex flex-col items-center justify-center ${
                  dynamicPlayers[2].isMe
                    ? 'bg-white/20 border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                    : 'bg-white/10 border-white/40'
                }`}>
                  <span className="font-display font-black text-lg text-white/80">3rd</span>
                  <span className="text-[9px] text-[#A5B0A6]">Lv.{dynamicPlayers[2].level}</span>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard List (Rank 4 and below) */}
          <div className="p-3.5 rounded-3xl bg-[#141A15] border border-white/5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#6F7B71] tracking-wider px-1 block">
              Squad Standings
            </span>
            {dynamicPlayers.slice(3).map((player) => (
              <div
                key={player.rank}
                className={`p-3 rounded-2xl flex items-center justify-between text-xs transition-colors ${
                  player.isMe
                    ? 'bg-[#C8FF2E]/10 border border-[#C8FF2E]/40 shadow-sm'
                    : 'bg-[#1C241E] border border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-display font-bold text-xs w-4 ${player.isMe ? 'text-[#C8FF2E]' : 'text-[#A5B0A6]'}`}>
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
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#0F2A22] border-2 border-[#C8FF2E]/30 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center shadow-lg">
                <Flame className="w-8 h-8 fill-[#0B0F0C]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider">
                  Active Playing Streak
                </span>
                <h3 className="font-display font-black text-2xl text-[#F4F7F0]">
                  {userProfile.streakWeeks || 4} Weeks Active
                </h3>
                <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-[#C8FF2E] font-semibold">
                  <Flame className="w-3.5 h-3.5 text-[#C8FF2E]" />
                  <span>1.5x Playmaker XP Multiplier Active</span>
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3 text-xs">
            <h4 className="font-bold text-[#F4F7F0] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#C8FF2E]" />
              <span>Streak Multiplier Benefits</span>
            </h4>
            <div className="space-y-2 text-[#A5B0A6]">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1C241E]">
                <span>Live Match Predictions</span>
                <span className="font-bold text-[#C8FF2E]">+50 XP → +75 XP (1.5x)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1C241E]">
                <span>Hosting Community Pickup</span>
                <span className="font-bold text-[#C8FF2E]">+100 XP → +150 XP (1.5x)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1C241E]">
                <span>Verified Court Reservations</span>
                <span className="font-bold text-[#C8FF2E]">+60 XP → +90 XP (1.5x)</span>
              </div>
            </div>
            <p className="text-[11px] text-[#6F7B71] leading-relaxed pt-1">
              Maintain your streak by participating in at least 1 verified match or prediction every 7 days.
            </p>
          </div>
        </div>
      )}

      {/* 5. CHALLENGES / BADGES TAB */}
      {activeTab === 'challenges' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {badges.map((b) => {
              const isReadyToClaim = b.unlocked && !b.claimed;
              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-3xl border flex flex-col justify-between transition-all ${
                    b.unlocked
                      ? 'bg-[#141A15] border-[#C8FF2E]/40 text-[#F4F7F0] shadow-sm'
                      : 'bg-[#141A15]/60 border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-[#1C241E] border border-white/10 flex items-center justify-center">
                      {b.id === 'oracle_vision' && <Target className="w-5 h-5 text-[#C8FF2E]" />}
                      {b.id === 'tactical_gambit' && <Sparkles className="w-5 h-5 text-[#FF8FC7]" />}
                      {b.id === 'squad_captain' && <Crown className="w-5 h-5 text-[#C8FF2E]" />}
                      {b.id === 'streak_master' && <Flame className="w-5 h-5 text-[#FF8FC7]" />}
                      {b.id === 'floodlight_warrior' && <Zap className="w-5 h-5 text-[#C8FF2E]" />}
                      {b.id === 'clay_specialist' && <Trophy className="w-5 h-5 text-[#C8FF2E]" />}
                      {!['oracle_vision', 'tactical_gambit', 'squad_captain', 'streak_master', 'floodlight_warrior', 'clay_specialist'].includes(b.id) && (
                        <Award className="w-5 h-5 text-[#C8FF2E]" />
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#1C241E] border border-white/10 text-[9px] font-bold text-[#C8FF2E]">
                      +{b.rewardXp} XP
                    </span>
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-xs text-[#F4F7F0] mb-0.5">
                      {b.title}
                    </h4>
                    <p className="text-[10px] text-[#A5B0A6] leading-tight">
                      {b.desc}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  {!b.unlocked && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[9px] text-[#6F7B71] mb-1">
                        <span>Progress</span>
                        <span>{b.progress}/{b.maxProgress}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (b.progress / b.maxProgress) * 100)}%` }}
                          className="h-full bg-[#C8FF2E]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Claim Button / Status */}
                  <div className="mt-3 pt-2 border-t border-white/5">
                    {isReadyToClaim ? (
                      <button
                        onClick={() => {
                          if (onClaimBadge) {
                            const res = onClaimBadge(b.id);
                            setClaimedToast(res.message);
                            setTimeout(() => setClaimedToast(null), 3000);
                          }
                        }}
                        className="w-full py-1.5 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] font-display font-black text-[10px] uppercase shadow-[0_0_12px_rgba(200,255,46,0.3)] hover:brightness-110 press-scale"
                      >
                        Claim Reward
                      </button>
                    ) : b.claimed ? (
                      <span className="text-[10px] font-bold text-[#3DDC84] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Claimed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#6F7B71] uppercase">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
