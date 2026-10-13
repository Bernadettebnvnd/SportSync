import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Share2,
  Star,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Flame,
  Coins,
  TrendingUp,
  Zap,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { TeamCrest } from '../../illustrations/TeamCrests';
import { Match, UserPredictionWager } from '../../mock/types';
import { MomentumChart } from '../../design-system/components/MomentumChart';
import { PitchLineup } from '../../design-system/components/PitchLineup';
import { Button } from '../../design-system/components/Button';
import { ChatBubble, ChatMessage } from '../../design-system/components/ChatBubble';

interface MatchCenterScreenProps {
  match: Match;
  poll?: Match['prediction'];
  userProfile?: any;
  userWagers?: UserPredictionWager[];
  onBack: () => void;
  onWatchLive?: () => void;
  onPlaceWager?: (params: {
    matchId: string;
    matchTitle: string;
    pollQuestion: string;
    optionId: string;
    optionLabel: string;
    stakeXp: number;
    odds: number;
  }) => { success: boolean; message: string };
  onResolvePoll?: (matchId: string, winningOptionId: string) => { won: boolean; message: string };
}

export const MatchCenterScreen: React.FC<MatchCenterScreenProps> = ({
  match,
  poll,
  userProfile,
  userWagers = [],
  onBack,
  onWatchLive,
  onPlaceWager,
  onResolvePoll,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'lineups' | 'timeline' | 'chat'>('overview');
  const [wagerMode, setWagerMode] = useState<'free' | 'wager'>('free');
  const [stakeAmount, setStakeAmount] = useState<number>(50);
  const [selectedPredictionOption, setSelectedPredictionOption] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  const activePoll = poll || match.prediction;
  const matchWagers = userWagers.filter((w) => w.matchId === match.id);
  const activeWager = matchWagers.find((w) => w.status === 'active');

  const matchChatMessages: ChatMessage[] = [
    { id: 'c1', senderName: 'Marcus Bell', avatarId: 'marcus', text: 'What a strike by Varga into the top bin!', time: '14\'' },
    { id: 'c2', senderName: 'Elena Rostova', avatarId: 'elena', text: 'Riverside pressing hard down the right wing now.', time: '28\'' },
    { id: 'c3', senderName: 'Alex Rivera', avatarId: 'alex', text: 'Second half momentum is completely shifting.', time: '55\'', isMe: true },
  ];

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Header with back button & stream action */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
          {match.leagueName}
        </span>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141A15] border border-white/10 text-xs text-[#A5B0A6]">
          <span className="w-2 h-2 rounded-full bg-[#3DDC84]" />
          <span>Verified Match</span>
        </div>
      </div>

      {/* 2. Hero Scoreboard Container */}
      <div className="mx-5 my-2 p-5 rounded-3xl bg-[#141A15] border border-white/10 shadow-xl">
        <div className="flex items-center justify-between text-xs text-[#A5B0A6] mb-3">
          <span>{match.matchday} • {match.venueName}</span>
          {match.status === 'LIVE' && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30 font-bold text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-live-pulse" />
              LIVE {match.minute}'
            </span>
          )}
        </div>

        <div className="grid grid-cols-7 items-center justify-between">
          {/* Home */}
          <div className="col-span-2 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#1C241E] p-2 flex items-center justify-center mb-1.5 border border-white/10 shadow-sm">
              <TeamCrest id={match.homeTeam.crestId} size={36} />
            </div>
            <span className="font-display font-bold text-sm text-[#F4F7F0] truncate max-w-[85px]">
              {match.homeTeam.shortName}
            </span>
          </div>

          {/* Score */}
          <div className="col-span-3 flex flex-col items-center text-center">
            <div className="font-display font-black text-4xl text-[#C8FF2E] tabular-nums tracking-tighter">
              {match.homeScore ?? 0} : {match.awayScore ?? 0}
            </div>
            <span className="text-[11px] text-[#A5B0A6] mt-0.5 font-medium">HT 45' (+3)</span>
          </div>

          {/* Away */}
          <div className="col-span-2 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#1C241E] p-2 flex items-center justify-center mb-1.5 border border-white/10 shadow-sm">
              <TeamCrest id={match.awayTeam.crestId} size={36} />
            </div>
            <span className="font-display font-bold text-sm text-[#F4F7F0] truncate max-w-[85px]">
              {match.awayTeam.shortName}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs (Overview, Stats, Lineups, Timeline, Chat) */}
      <div className="px-5 py-2">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#141A15] border border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'stats', label: 'Stats' },
            { id: 'lineups', label: 'Lineups' },
            { id: 'timeline', label: 'Timeline' },
            { id: 'chat', label: 'Fan Chat' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[70px] py-2 px-2 text-xs font-semibold rounded-xl text-center transition-all ${
                  isActive
                    ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm'
                    : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Content */}
      <div className="px-5 pt-3">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Smooth Lime Momentum Chart (Ref A) */}
            <MomentumChart
              data={match.momentumData}
              homeName={match.homeTeam.shortName}
              awayName={match.awayTeam.shortName}
            />

            {/* Match Possession Bar */}
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-[#C8FF2E]">{match.possession?.home ?? 56}%</span>
                <span className="text-[#A5B0A6] uppercase tracking-wider text-[10px]">Possession</span>
                <span className="text-[#FF8FC7]">{match.possession?.away ?? 44}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
                <div
                  style={{ width: `${match.possession?.home ?? 56}%` }}
                  className="h-full bg-[#C8FF2E]"
                />
                <div
                  style={{ width: `${match.possession?.away ?? 44}%` }}
                  className="h-full bg-[#FF8FC7]"
                />
              </div>
            </div>

            {/* Shots & Targets Comparison */}
            <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A5B0A6]">
                Key Metrics
              </h4>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#F4F7F0]">{match.shots?.home ?? 13}</span>
                <span className="text-[#6F7B71]">Total Shots</span>
                <span className="font-bold text-[#F4F7F0]">{match.shots?.away ?? 8}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#F4F7F0]">{match.shotsOnTarget?.home ?? 6}</span>
                <span className="text-[#6F7B71]">Shots on Target</span>
                <span className="font-bold text-[#F4F7F0]">{match.shotsOnTarget?.away ?? 4}</span>
              </div>
            </div>

            {/* Interactive Playmaker Prediction & XP Wagering Console (Phase 2) */}
            <div className="p-4 rounded-3xl bg-[#141A15] border border-[#C8FF2E]/30 space-y-3.5 shadow-lg relative overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#C8FF2E]/10 blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#C8FF2E]" />
                  <h4 className="text-xs font-display font-bold uppercase tracking-wider text-[#F4F7F0]">
                    Playmaker Prediction
                  </h4>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0F2A22] border border-[#C8FF2E]/40 text-[#C8FF2E] text-[10px] font-bold">
                  <Flame className="w-3 h-3 fill-[#C8FF2E]" />
                  <span>1.5x Streak Boost</span>
                </div>
              </div>

              {/* Question & Balance */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-[#F4F7F0]">
                  {activePoll?.question || 'Next team to score before 75’?'}
                </p>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[#A5B0A6] block leading-none">Your Balance</span>
                  <span className="text-xs font-bold text-[#C8FF2E] font-mono">
                    {userProfile?.xp ?? 7240} XP
                  </span>
                </div>
              </div>

              {/* Wager Mode Toggle (Free Vote vs XP Stake) */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#0B0F0C] border border-white/5">
                <button
                  type="button"
                  onClick={() => setWagerMode('free')}
                  className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
                    wagerMode === 'free'
                      ? 'bg-[#1C241E] text-[#C8FF2E] shadow-sm'
                      : 'text-[#A5B0A6] hover:text-white'
                  }`}
                >
                  Free Vote (+75 XP)
                </button>
                <button
                  type="button"
                  onClick={() => setWagerMode('wager')}
                  className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
                    wagerMode === 'wager'
                      ? 'bg-[#C8FF2E] text-[#0B0F0C] shadow-sm'
                      : 'text-[#A5B0A6] hover:text-white'
                  }`}
                >
                  Wager Playmaker XP
                </button>
              </div>

              {/* Stake Amount Selector (If in Wager Mode) */}
              {wagerMode === 'wager' && (
                <div className="p-3 rounded-2xl bg-[#1C241E] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#A5B0A6] font-medium">Select Stake Amount:</span>
                    <span className="text-[#C8FF2E] font-bold font-mono">{stakeAmount} XP</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[25, 50, 100, 250].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setStakeAmount(amt)}
                        className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                          stakeAmount === amt
                            ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                            : 'bg-[#141A15] text-[#A5B0A6] border-white/5 hover:border-white/10'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Options List with Dynamic Percentages and Odds */}
              <div className="space-y-2 pt-1">
                {(activePoll?.options || [
                  { id: 'opt1', label: match.homeTeam.name, percentage: 58, odds: 1.72 },
                  { id: 'opt2', label: match.awayTeam.name, percentage: 34, odds: 2.45 },
                  { id: 'opt3', label: 'Draw / Stalemate', percentage: 8, odds: 6.50 },
                ]).map((opt) => {
                  const isChosen = selectedPredictionOption === opt.id;
                  const isLockedWager = activeWager?.optionId === opt.id;
                  const odds = opt.odds || 2.0;
                  const potentialWin =
                    wagerMode === 'wager'
                      ? Math.round(stakeAmount * odds * (userProfile?.streakMultiplier || 1.5))
                      : 75;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedPredictionOption(opt.id);
                        setFeedbackMessage(null);
                      }}
                      className={`relative w-full p-3 rounded-2xl border text-left transition-all overflow-hidden ${
                        isLockedWager
                          ? 'border-[#C8FF2E] bg-[#C8FF2E]/15'
                          : isChosen
                          ? 'border-[#C8FF2E] bg-[#C8FF2E]/10'
                          : 'border-white/5 bg-[#1C241E] hover:border-white/15'
                      }`}
                    >
                      {/* Animated vote distribution background fill */}
                      <div
                        style={{ width: `${opt.percentage}%` }}
                        className={`absolute inset-y-0 left-0 opacity-15 transition-all duration-700 ${
                          isChosen || isLockedWager ? 'bg-[#C8FF2E]' : 'bg-white'
                        }`}
                      />

                      <div className="relative flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              isChosen || isLockedWager ? 'text-[#C8FF2E] font-bold' : 'text-[#F4F7F0]'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-[#0B0F0C] border border-white/10 text-[10px] font-bold text-[#A5B0A6]">
                            {odds}x
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isLockedWager && (
                            <span className="text-[10px] font-bold text-[#3DDC84] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Locked
                            </span>
                          )}
                          <span className="font-mono text-xs tabular-nums text-[#C8FF2E]">
                            {opt.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Potential Payout preview when selected */}
                      {isChosen && !isLockedWager && (
                        <div className="relative mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#A5B0A6]">
                          <span>
                            {wagerMode === 'wager' ? 'Potential Return (1.5x Streak):' : 'Free Reward:'}
                          </span>
                          <span className="font-bold text-[#C8FF2E] font-mono">
                            +{potentialWin} XP
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Button: Lock In / Wager */}
              {selectedPredictionOption && (
                <div className="pt-1">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      const selectedOptObj = activePoll?.options.find((o) => o.id === selectedPredictionOption);
                      if (!selectedOptObj) return;

                      if (onPlaceWager) {
                        const result = onPlaceWager({
                          matchId: match.id,
                          matchTitle: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
                          pollQuestion: activePoll?.question || 'Match prediction',
                          optionId: selectedOptObj.id,
                          optionLabel: selectedOptObj.label,
                          stakeXp: wagerMode === 'wager' ? stakeAmount : 0,
                          odds: selectedOptObj.odds || 2.0,
                        });
                        setFeedbackMessage(result.message);
                      } else {
                        setFeedbackMessage('Prediction locked in! +75 Playmaker XP awarded.');
                      }
                    }}
                    className="bg-[#C8FF2E] text-[#0B0F0C] font-display font-black text-xs py-2.5 rounded-xl shadow-md press-scale"
                  >
                    {wagerMode === 'wager'
                      ? `Lock In Wager (${stakeAmount} XP Stake)`
                      : 'Lock In Free Prediction (+75 XP)'}
                  </Button>
                </div>
              )}

              {/* Feedback Message */}
              {feedbackMessage && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#3DDC84] font-medium pt-1 animate-fadeIn bg-[#0F2A22] p-2.5 rounded-xl border border-[#3DDC84]/30">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{feedbackMessage}</span>
                </div>
              )}

              {/* Active Wagers status chip */}
              {activeWager && !feedbackMessage && (
                <div className="flex items-center justify-between text-[11px] bg-[#0F2A22] p-2.5 rounded-xl border border-[#C8FF2E]/30 text-[#F4F7F0]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C8FF2E]" />
                    <span>
                      Active: <strong className="text-[#C8FF2E]">{activeWager.optionLabel}</strong>
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#C8FF2E]">
                    +{activeWager.potentialWinXp || 120} XP Return
                  </span>
                </div>
              )}

              {/* Simulator Dropdown (Interactive test runner for resolving predictions) */}
              <div className="pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowSimulator(!showSimulator)}
                  className="w-full text-[10px] uppercase font-bold tracking-wider text-[#6F7B71] hover:text-[#C8FF2E] flex items-center justify-between"
                >
                  <span>⚡ Match Event Simulator</span>
                  <span>{showSimulator ? 'Hide ▲' : 'Simulate Outcome ▼'}</span>
                </button>

                {showSimulator && (
                  <div className="mt-2 p-2.5 rounded-2xl bg-[#0B0F0C] border border-white/10 space-y-2 text-xs">
                    <span className="text-[10px] text-[#A5B0A6] block">
                      Trigger a live match event to settle this prediction and test the payout celebration:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(activePoll?.options || []).slice(0, 2).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            if (onResolvePoll) {
                              const res = onResolvePoll(match.id, opt.id);
                              setFeedbackMessage(res.message);
                            }
                          }}
                          className="p-2 rounded-xl bg-[#1C241E] hover:bg-[#263028] border border-white/5 text-[11px] font-semibold text-[#F4F7F0] text-center"
                        >
                          Settle: {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3 text-xs">
            <h4 className="font-bold text-[#F4F7F0]">Detailed Match Statistics</h4>
            <div className="divide-y divide-white/5 space-y-2">
              <div className="flex justify-between py-1">
                <span>Pass Accuracy</span>
                <span className="text-[#C8FF2E] font-bold">88% vs 82%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Fouls Committed</span>
                <span className="text-[#A5B0A6]">8 vs 11</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Corner Kicks</span>
                <span className="text-[#A5B0A6]">6 vs 3</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Offsides</span>
                <span className="text-[#A5B0A6]">2 vs 1</span>
              </div>
            </div>
          </div>
        )}

        {/* LINEUPS TAB */}
        {activeTab === 'lineups' && (
          <div className="space-y-4">
            <PitchLineup
              teamName={match.homeTeam.name}
              players={match.lineupHome as any}
            />
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A5B0A6]">
              Key Match Events
            </h4>
            {match.events?.map((ev, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/5 last:border-none">
                <span className="font-display font-bold text-[#C8FF2E] tabular-nums w-8">
                  {ev.minute}'
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] uppercase font-bold text-[#F4F7F0]">
                  {ev.type.replace('_', ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-[#F4F7F0] block truncate">{ev.player}</span>
                  {ev.detail && <span className="text-[11px] text-[#A5B0A6]">{ev.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="space-y-2">
            {matchChatMessages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
