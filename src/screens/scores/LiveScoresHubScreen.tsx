'use client';

import React, { useState } from 'react';
import { useMatchiStore } from '../../lib/store';
import { SportIcon, SportId } from '../../illustrations/SportIcons';
import { Button } from '../../design-system/components/Button';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Calendar,
  Plus,
  Minus,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Lock,
  Trophy,
  Activity,
  RotateCcw,
} from 'lucide-react';

export interface LocalMatchScore {
  id: string;
  gameTitle: string;
  sport: SportId;
  venueName: string;
  date: string;
  status: 'live' | 'completed' | 'upcoming';
  isHost: boolean;
  isAttendee: boolean;
  teamA: {
    name: string;
    score: number;
    subscores?: number[]; // sets or quarters
  };
  teamB: {
    name: string;
    score: number;
    subscores?: number[];
  };
  currentPeriod: string; // "1st Half", "Q3", "Set 2", "Rack 4", etc.
  checkedIn: boolean;
}

const INITIAL_LOCAL_MATCHES: LocalMatchScore[] = [
  {
    id: 'local-1',
    gameTitle: 'Metro Sunset 5v5 Friendly',
    sport: 'Football',
    venueName: 'The Arena BGC • Pitch 1',
    date: 'Today, 6:00 PM',
    status: 'live',
    isHost: true,
    isAttendee: true,
    teamA: { name: 'Green Pinnies', score: 3 },
    teamB: { name: 'Black Pinnies', score: 2 },
    currentPeriod: '2nd Half (38\')',
    checkedIn: true,
  },
  {
    id: 'local-2',
    gameTitle: 'Thursday Doubles Matchup',
    sport: 'Pickleball',
    venueName: 'Prime Pickleball Club • Court 3',
    date: 'Yesterday, 7:00 PM',
    status: 'completed',
    isHost: false,
    isAttendee: true,
    teamA: { name: 'Alex & Marcus', score: 11, subscores: [11, 8, 11] },
    teamB: { name: 'Dave & Jordan', score: 9, subscores: [7, 11, 9] },
    currentPeriod: 'Final (2-1)',
    checkedIn: true,
  },
  {
    id: 'local-3',
    gameTitle: 'Weekly Hoops Run',
    sport: 'Basketball',
    venueName: 'Titan Court Metro',
    date: 'Oct 11',
    status: 'completed',
    isHost: false,
    isAttendee: true,
    teamA: { name: 'Home Squad', score: 54 },
    teamB: { name: 'Visitors', score: 48 },
    currentPeriod: 'Final',
    checkedIn: true,
  },
];

interface LiveScoresHubScreenProps {
  onSelectMatch?: (matchId: string) => void;
  onNavigateToPlay?: () => void;
}

export const LiveScoresHubScreen: React.FC<LiveScoresHubScreenProps> = ({
  onSelectMatch,
  onNavigateToPlay,
}) => {
  const { currentUser } = useMatchiStore();
  const [activeTab, setActiveTab] = useState<'live' | 'results' | 'score'>('live');
  const [matches, setMatches] = useState<LocalMatchScore[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sportsync_local_scores');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return INITIAL_LOCAL_MATCHES;
  });

  // State for manual score keeper modal
  const [scoringMatch, setScoringMatch] = useState<LocalMatchScore | null>(null);
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [periodText, setPeriodText] = useState('1st Half');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const saveMatches = (updated: LocalMatchScore[]) => {
    setMatches(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_local_scores', JSON.stringify(updated));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Filter lists based on user attendance authorization
  const liveMatches = matches.filter(
    (m) => m.status === 'live' && (m.isAttendee || m.isHost || m.checkedIn)
  );

  const myResults = matches.filter(
    (m) => m.status === 'completed' && (m.isAttendee || m.isHost)
  );

  const scorables = matches.filter((m) => m.isHost || currentUser.role === 'venue_owner');

  const openScoringModal = (m: LocalMatchScore) => {
    setScoringMatch(m);
    setTeamAScore(m.teamA.score);
    setTeamBScore(m.teamB.score);
    setPeriodText(m.currentPeriod);
  };

  const handleUpdateScore = () => {
    if (!scoringMatch) return;
    const updated = matches.map((m) => {
      if (m.id === scoringMatch.id) {
        return {
          ...m,
          teamA: { ...m.teamA, score: teamAScore },
          teamB: { ...m.teamB, score: teamBScore },
          currentPeriod: periodText,
        };
      }
      return m;
    });
    saveMatches(updated);
    setScoringMatch(null);
    showToast('Score updated successfully!');
  };

  const handleFinalizeMatch = () => {
    if (!scoringMatch) return;
    const updated = matches.map((m) => {
      if (m.id === scoringMatch.id) {
        return {
          ...m,
          teamA: { ...m.teamA, score: teamAScore },
          teamB: { ...m.teamB, score: teamBScore },
          status: 'completed' as const,
          currentPeriod: 'Final',
        };
      }
      return m;
    });
    saveMatches(updated);
    setScoringMatch(null);
    showToast('Match marked Final and archived to Results!');
  };

  const getSportPeriodOptions = (sport: SportId): string[] => {
    switch (sport) {
      case 'Football':
        return ['1st Half', 'Halftime', '2nd Half', 'Extra Time', 'Full Time'];
      case 'Basketball':
        return ['Q1', 'Q2', 'Halftime', 'Q3', 'Q4', 'Overtime', 'Final'];
      case 'Tennis':
        return ['Set 1', 'Set 2', 'Set 3', 'Match Tiebreak', 'Final'];
      case 'Pickleball':
      case 'Badminton':
      case 'Volleyball':
        return ['Game 1', 'Game 2', 'Game 3 (Decider)', 'Final'];
      case 'Billiards':
        return ['Rack 1', 'Rack 2', 'Rack 3', 'Hill-Hill', 'Final'];
      case 'Darts':
        return ['Leg 1', 'Leg 2', 'Leg 3', 'Final'];
      default:
        return ['In Progress', 'Final'];
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl tracking-tight text-[#F4F7F0]">
            Scores Hub
          </h1>
          <p className="text-xs text-[#A5B0A6]">
            Authorized local match tracking & participation results
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141A15] border border-white/5 text-[11px] text-[#A5B0A6]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF2E]" />
          <span>Access Controlled</span>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="mx-5 my-2 p-3 rounded-2xl bg-[#C8FF2E]/15 border border-[#C8FF2E]/30 text-[#C8FF2E] text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3 Categories / Tabs: My Live Matches | My Results | Score a Match */}
      <div className="px-5 py-2">
        <div className="flex rounded-2xl bg-[#141A15] p-1 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'live'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] shadow-sm'
                : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
            }`}
          >
            My Live Matches
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'results'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] shadow-sm'
                : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
            }`}
          >
            My Results
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('score')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'score'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] shadow-sm'
                : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
            }`}
          >
            Score a Match
          </button>
        </div>
      </div>

      {/* Content for Tabs */}
      <div className="px-5 pt-3 space-y-4">
        {/* TAB 1: MY LIVE MATCHES */}
        {activeTab === 'live' && (
          <div className="space-y-3">
            {liveMatches.length > 0 ? (
              liveMatches.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-3xl bg-[#141A15] border border-[#C8FF2E]/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] space-y-3"
                >
                  {/* Top pill bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30] animate-pulse" />
                      <span className="text-[11px] font-bold text-[#FF3B30] uppercase tracking-wider">
                        LIVE NOW • {m.currentPeriod}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#C8FF2E]">
                      <SportIcon sport={m.sport} size={15} color="#C8FF2E" />
                      <span className="font-semibold">{m.sport}</span>
                    </div>
                  </div>

                  {/* Title & Venue */}
                  <div>
                    <h3 className="font-display font-black text-base text-[#F4F7F0]">
                      {m.gameTitle}
                    </h3>
                    <p className="text-xs text-[#A5B0A6] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#6F7B71]" />
                      {m.venueName}
                    </p>
                  </div>

                  {/* Live Score Board */}
                  <div className="p-3.5 rounded-2xl bg-[#0B0F0C] border border-white/5 flex items-center justify-around">
                    <div className="text-center flex-1">
                      <span className="text-xs font-semibold text-[#A5B0A6] block truncate px-1">
                        {m.teamA.name}
                      </span>
                      <span className="font-display font-black text-3xl text-[#F4F7F0]">
                        {m.teamA.score}
                      </span>
                    </div>

                    <div className="text-center px-3">
                      <span className="text-xs font-bold text-[#6F7B71]">VS</span>
                    </div>

                    <div className="text-center flex-1">
                      <span className="text-xs font-semibold text-[#A5B0A6] block truncate px-1">
                        {m.teamB.name}
                      </span>
                      <span className="font-display font-black text-3xl text-[#F4F7F0]">
                        {m.teamB.score}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="inline-flex items-center gap-1 text-[11px] text-[#3DDC84]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Venue Check-in Verified
                    </div>
                    {m.isHost && (
                      <button
                        type="button"
                        onClick={() => openScoringModal(m)}
                        className="px-3 py-1.5 rounded-full bg-[#1C241E] hover:bg-[#263028] border border-white/10 text-xs font-semibold text-[#C8FF2E] transition-all"
                      >
                        Update Score
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-3 my-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1C241E] text-[#A5B0A6] mx-auto flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#A5B0A6]" />
                </div>
                <h3 className="font-display font-bold text-base text-[#F4F7F0]">
                  No Active Matches in Progress
                </h3>
                <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto leading-relaxed">
                  Live scores are restricted to local games you are actively attending or authorized to administer. Join an open game from Play to access live court scorekeeping.
                </p>
                {onNavigateToPlay && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onNavigateToPlay}
                    className="font-bold mt-2"
                  >
                    Discover Local Games
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY RESULTS */}
        {activeTab === 'results' && (
          <div className="space-y-3">
            {myResults.length > 0 ? (
              myResults.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-[#A5B0A6]">
                      <SportIcon sport={m.sport} size={14} color="#A5B0A6" />
                      <span className="font-semibold">{m.sport}</span>
                      <span>•</span>
                      <span>{m.date}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-[#A5B0A6]">
                      FINAL
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
                    {m.gameTitle}
                  </h3>

                  <div className="p-3 rounded-2xl bg-[#0B0F0C] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center justify-between flex-1 pr-3 border-r border-white/5">
                      <span className="text-xs text-[#F4F7F0] font-medium truncate">
                        {m.teamA.name}
                      </span>
                      <span className="font-display font-bold text-base text-[#F4F7F0] ml-2">
                        {m.teamA.score}
                      </span>
                    </div>
                    <div className="flex items-center justify-between flex-1 pl-3">
                      <span className="text-xs text-[#F4F7F0] font-medium truncate">
                        {m.teamB.name}
                      </span>
                      <span className="font-display font-bold text-base text-[#F4F7F0] ml-2">
                        {m.teamB.score}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6F7B71] flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {m.venueName}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-2">
                <Trophy className="w-10 h-10 text-[#6F7B71] mx-auto" />
                <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
                  No Match Results Yet
                </h3>
                <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                  Completed games you participated in will appear here with final scores and attendance records.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCORE A MATCH */}
        {activeTab === 'score' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#0F2A22] border border-[#C8FF2E]/20 text-xs text-[#A5B0A6] space-y-1">
              <span className="font-bold text-[#C8FF2E] block">
                Authorized Scorekeeping
              </span>
              <span>
                Game hosts, designated scorekeepers, and venue operators can manage manual scores for authorized local matches below.
              </span>
            </div>

            {scorables.length > 0 ? (
              scorables.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-3xl bg-[#141A15] border border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-[#C8FF2E]">
                      <SportIcon sport={m.sport} size={15} color="#C8FF2E" />
                      <span className="font-semibold">{m.sport}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#A5B0A6] uppercase">
                      Status: {m.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
                      {m.gameTitle}
                    </h3>
                    <p className="text-xs text-[#A5B0A6]">{m.venueName}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0B0F0C] border border-white/5 flex items-center justify-between text-xs text-[#F4F7F0]">
                    <span>Current: {m.teamA.name} ({m.teamA.score}) vs {m.teamB.name} ({m.teamB.score})</span>
                    <span className="text-[#C8FF2E]">{m.currentPeriod}</span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openScoringModal(m)}
                    className="w-full font-bold"
                  >
                    Launch Scorekeeper Controls
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-2">
                <ShieldAlert className="w-10 h-10 text-[#A5B0A6] mx-auto" />
                <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
                  No Matches to Score
                </h3>
                <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                  You are not currently hosting any active matches. Create or host a game in Play or your Facility Dashboard to record scores.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Sport-Specific Scorekeeping Modal */}
      {scoringMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-[#141A15] border border-white/10 p-5 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-bold text-[#C8FF2E] uppercase tracking-wider block">
                  {scoringMatch.sport} Scorekeeper
                </span>
                <h3 className="font-display font-black text-base text-[#F4F7F0]">
                  {scoringMatch.gameTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setScoringMatch(null)}
                className="w-8 h-8 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Score Adjusters */}
            <div className="grid grid-cols-2 gap-3">
              {/* Team A */}
              <div className="p-3.5 rounded-2xl bg-[#0B0F0C] border border-white/5 text-center space-y-2">
                <span className="text-xs font-semibold text-[#A5B0A6] block truncate">
                  {scoringMatch.teamA.name}
                </span>
                <span className="font-display font-black text-4xl text-[#F4F7F0] block">
                  {teamAScore}
                </span>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTeamAScore((s) => Math.max(0, s - 1))}
                    className="w-9 h-9 rounded-xl bg-[#1C241E] hover:bg-[#263028] text-[#F4F7F0] flex items-center justify-center text-lg font-bold"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamAScore((s) => s + 1)}
                    className="w-9 h-9 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center text-lg font-bold shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Team B */}
              <div className="p-3.5 rounded-2xl bg-[#0B0F0C] border border-white/5 text-center space-y-2">
                <span className="text-xs font-semibold text-[#A5B0A6] block truncate">
                  {scoringMatch.teamB.name}
                </span>
                <span className="font-display font-black text-4xl text-[#F4F7F0] block">
                  {teamBScore}
                </span>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTeamBScore((s) => Math.max(0, s - 1))}
                    className="w-9 h-9 rounded-xl bg-[#1C241E] hover:bg-[#263028] text-[#F4F7F0] flex items-center justify-center text-lg font-bold"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamBScore((s) => s + 1)}
                    className="w-9 h-9 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center text-lg font-bold shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Sport Period / Stage selection */}
            <div>
              <label className="text-[11px] font-semibold text-[#A5B0A6] uppercase tracking-wider block mb-1.5">
                Match Period / Stage
              </label>
              <div className="flex flex-wrap gap-1.5">
                {getSportPeriodOptions(scoringMatch.sport).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setPeriodText(period)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      periodText === period
                        ? 'bg-[#C8FF2E]/10 border-[#C8FF2E] text-[#C8FF2E] font-bold'
                        : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-2.5">
              <Button
                variant="primary"
                size="md"
                onClick={handleUpdateScore}
                className="flex-1 font-bold"
              >
                Save Score
              </Button>
              <button
                type="button"
                onClick={handleFinalizeMatch}
                className="px-4 py-2.5 rounded-2xl bg-[#1C241E] hover:bg-[#263028] border border-white/10 text-xs font-bold text-[#FF8FC7] transition-all"
              >
                Finalize & Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
