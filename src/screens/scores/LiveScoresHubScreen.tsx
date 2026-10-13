'use client';

import React, { useState } from 'react';
import { useMatchiStore } from '../../lib/store';
import { SportIcon, SportId } from '../../illustrations/SportIcons';
import { Button } from '../../design-system/components/Button';
import {
  ShieldCheck,
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
import { STANDARDIZED_SPORTS, PrimarySport } from '../../config/sports';

export interface LocalMatchScore {
  id: string;
  gameTitle: string;
  sport: PrimarySport | string;
  venueName: string;
  date: string;
  status: 'live' | 'completed' | 'upcoming';
  isHost: boolean;
  isAttendee: boolean;
  teamA: {
    name: string;
    score: number;
    subscores?: number[];
  };
  teamB: {
    name: string;
    score: number;
    subscores?: number[];
  };
  currentPeriod: string;
  checkedIn: boolean;
}

interface LiveScoresHubScreenProps {
  onSelectMatch?: (matchId: string) => void;
  onNavigateToPlay?: () => void;
  onRequireAuth?: (actionName?: string) => void;
  isGuest?: boolean;
}

export const LiveScoresHubScreen: React.FC<LiveScoresHubScreenProps> = ({
  onSelectMatch,
  onNavigateToPlay,
  onRequireAuth,
  isGuest = false,
}) => {
  const { currentUser } = useMatchiStore();
  const effectiveIsGuest = isGuest || !currentUser.id || !currentUser.email;

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
    // Per Phase 1: ZERO fake matches in production. Clean empty array by default.
    return [];
  });

  // State for manual score keeper modal
  const [scoringMatch, setScoringMatch] = useState<LocalMatchScore | null>(null);
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [periodText, setPeriodText] = useState('1st Half');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Match Score entry form state
  const [newTitle, setNewTitle] = useState('');
  const [newSport, setNewSport] = useState<PrimarySport>('Basketball');
  const [newVenue, setNewVenue] = useState('');
  const [newTeamA, setNewTeamA] = useState('Team A');
  const [newTeamB, setNewTeamB] = useState('Team B');

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

  // Filter lists based on attendance authorization
  const liveMatches = matches.filter(
    (m) => m.status === 'live' && (m.isAttendee || m.isHost || m.checkedIn)
  );

  const myResults = matches.filter(
    (m) => m.status === 'completed' && (m.isAttendee || m.isHost)
  );

  const handleCreateScoredMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveIsGuest) {
      if (onRequireAuth) onRequireAuth('score a match');
      return;
    }

    if (!newTitle.trim()) return;

    const newMatch: LocalMatchScore = {
      id: `score_${Date.now()}`,
      gameTitle: newTitle.trim(),
      sport: newSport,
      venueName: newVenue.trim() || 'Local Court',
      date: 'Today',
      status: 'live',
      isHost: true,
      isAttendee: true,
      checkedIn: true,
      teamA: { name: newTeamA.trim() || 'Team A', score: 0 },
      teamB: { name: newTeamB.trim() || 'Team B', score: 0 },
      currentPeriod: '1st Half',
    };

    const updated = [newMatch, ...matches];
    saveMatches(updated);
    setNewTitle('');
    setNewVenue('');
    setActiveTab('live');
    showToast('Live match score initialized!');
  };

  const handleUpdateLiveScore = (deltaA: number, deltaB: number) => {
    if (!scoringMatch) return;
    const nextA = Math.max(0, scoringMatch.teamA.score + deltaA);
    const nextB = Math.max(0, scoringMatch.teamB.score + deltaB);

    const updated = matches.map((m) => {
      if (m.id === scoringMatch.id) {
        return {
          ...m,
          teamA: { ...m.teamA, score: nextA },
          teamB: { ...m.teamB, score: nextB },
        };
      }
      return m;
    });

    saveMatches(updated);
    setScoringMatch((prev) =>
      prev ? { ...prev, teamA: { ...prev.teamA, score: nextA }, teamB: { ...prev.teamB, score: nextB } } : null
    );
  };

  const handleFinishMatch = (matchId: string) => {
    const updated = matches.map((m) => {
      if (m.id === matchId) {
        return { ...m, status: 'completed' as const, currentPeriod: 'Final' };
      }
      return m;
    });
    saveMatches(updated);
    setScoringMatch(null);
    showToast('Match marked final and recorded in My Results!');
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 inset-x-4 z-50 p-3 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] font-bold text-xs text-center shadow-2xl animate-fadeIn">
          {toastMessage}
        </div>
      )}

      {/* 1. Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-2xl tracking-tight text-[#F4F7F0]">
              Scores &amp; Results
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1C241E] border border-white/10 text-[10px] font-bold text-[#3DDC84]">
              <ShieldCheck className="w-3 h-3" />
              Verified
            </span>
          </div>

          {liveMatches.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-[#FF3B30] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-live-pulse" />
              {liveMatches.length} Live
            </span>
          )}
        </div>
        <p className="text-xs text-[#A5B0A6] mt-0.5">
          Real-time match scoring and historic game records
        </p>
      </div>

      {/* 2. Three Segment Tabs: My Live Matches | My Results | Score a Match */}
      <div className="px-5 pt-2">
        <div className="flex rounded-2xl bg-[#141A15] p-1 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'live' ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold' : 'text-[#A5B0A6] hover:text-white'
            }`}
          >
            My Live Matches ({liveMatches.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'results' ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold' : 'text-[#A5B0A6] hover:text-white'
            }`}
          >
            My Results ({myResults.length})
          </button>
          <button
            type="button"
            onClick={() => {
              if (effectiveIsGuest && onRequireAuth) {
                onRequireAuth('score a match');
                return;
              }
              setActiveTab('score');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'score' ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold' : 'text-[#A5B0A6] hover:text-white'
            }`}
          >
            Score a Match
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Tab 1: My Live Matches */}
        {activeTab === 'live' && (
          <div>
            {liveMatches.length > 0 ? (
              <div className="space-y-3">
                {liveMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-3xl bg-[#141A15] border border-white/10 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <SportIcon sport={m.sport} size={15} color="#C8FF2E" />
                        <span className="font-bold text-[#F4F7F0]">{m.gameTitle}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FF3B30]/20 text-[#FF3B30] text-[10px] font-bold animate-pulse">
                        {m.currentPeriod}
                      </span>
                    </div>

                    {/* Score Board */}
                    <div className="p-3 rounded-2xl bg-[#0F2A22] border border-white/5 flex items-center justify-between">
                      <div className="text-center flex-1">
                        <span className="text-xs text-[#A5B0A6] block truncate">{m.teamA.name}</span>
                        <span className="text-3xl font-black font-display text-[#F4F7F0]">{m.teamA.score}</span>
                      </div>
                      <span className="text-xs text-[#A5B0A6] font-bold px-2">VS</span>
                      <div className="text-center flex-1">
                        <span className="text-xs text-[#A5B0A6] block truncate">{m.teamB.name}</span>
                        <span className="text-3xl font-black font-display text-[#F4F7F0]">{m.teamB.score}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#A5B0A6] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#C8FF2E]" />
                        {m.venueName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setScoringMatch(m)}
                        className="px-3 py-1.5 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] text-xs font-bold hover:bg-[#d4ff52] transition-colors"
                      >
                        Update Score
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1C241E] border border-white/10 flex items-center justify-center mx-auto text-[#A5B0A6]">
                  <Activity className="w-5 h-5 text-[#C8FF2E]" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                    No live matches right now
                  </h4>
                  <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                    You haven't joined a live game yet. Check into a scheduled game on the Play feed to track live scores in real time.
                  </p>
                </div>
                {onNavigateToPlay && (
                  <button
                    type="button"
                    onClick={onNavigateToPlay}
                    className="px-4 py-2 rounded-xl bg-[#1C241E] hover:bg-[#263028] text-xs font-bold text-[#C8FF2E] border border-[#C8FF2E]/30 transition-all"
                  >
                    Browse Community Runs
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Results */}
        {activeTab === 'results' && (
          <div>
            {myResults.length > 0 ? (
              <div className="space-y-2.5">
                {myResults.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <SportIcon sport={m.sport} size={13} color="#C8FF2E" />
                        <span className="font-bold text-[#F4F7F0]">{m.gameTitle}</span>
                      </div>
                      <span className="text-[10px] text-[#A5B0A6]">
                        {m.venueName} • {m.date}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-[#F4F7F0]">
                        {m.teamA.score} - {m.teamB.score}
                      </span>
                      <span className="block text-[10px] text-[#3DDC84] font-semibold">Final</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1C241E] border border-white/10 flex items-center justify-center mx-auto text-[#A5B0A6]">
                  <Trophy className="w-5 h-5 text-[#C8FF2E]" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                    No match results yet
                  </h4>
                  <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                    Completed matches and verified final scores from games you attend will be recorded here.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Score a Match Form (Authorized Users Only) */}
        {activeTab === 'score' && (
          <form onSubmit={handleCreateScoredMatch} className="p-5 rounded-3xl bg-[#141A15] border border-white/5 space-y-3.5">
            <div>
              <span className="text-[11px] font-bold text-[#C8FF2E] uppercase tracking-wider block mb-1">
                Authorized Match Scoring
              </span>
              <h3 className="font-display font-bold text-base text-[#F4F7F0]">
                Record Real-Time Match Score
              </h3>
              <p className="text-xs text-[#A5B0A6]">
                Set up a live scoreboard for your pickup run or tournament fixture.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#A5B0A6] block mb-1">
                Match Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. 5v5 Friendly Run or Championship Match"
                required
                className="w-full h-11 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[#A5B0A6] block mb-1">
                  Sport
                </label>
                <select
                  value={newSport}
                  onChange={(e) => setNewSport(e.target.value as PrimarySport)}
                  className="w-full h-11 px-3 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none cursor-pointer"
                >
                  {STANDARDIZED_SPORTS.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#A5B0A6] block mb-1">
                  Court / Venue
                </label>
                <input
                  type="text"
                  value={newVenue}
                  onChange={(e) => setNewVenue(e.target.value)}
                  placeholder="e.g. Court 1 or The Arena"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[#A5B0A6] block mb-1">
                  Team / Player A
                </label>
                <input
                  type="text"
                  value={newTeamA}
                  onChange={(e) => setNewTeamA(e.target.value)}
                  placeholder="Team A"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#A5B0A6] block mb-1">
                  Team / Player B
                </label>
                <input
                  type="text"
                  value={newTeamB}
                  onChange={(e) => setNewTeamB(e.target.value)}
                  placeholder="Team B"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C] font-bold text-xs transition-colors shadow-sm mt-2"
            >
              Start Live Scoring
            </button>
          </form>
        )}
      </div>

      {/* Live Score Keeper Modal */}
      {scoringMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-[#141A15] border border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                  {scoringMatch.gameTitle}
                </h4>
                <span className="text-[10px] text-[#A5B0A6]">{scoringMatch.venueName}</span>
              </div>
              <button
                type="button"
                onClick={() => setScoringMatch(null)}
                className="w-7 h-7 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Incrementor Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Team A */}
              <div className="p-3 rounded-2xl bg-[#1C241E] text-center space-y-2">
                <span className="text-xs font-bold text-[#F4F7F0] block truncate">
                  {scoringMatch.teamA.name}
                </span>
                <span className="text-4xl font-black font-display text-[#C8FF2E] block">
                  {scoringMatch.teamA.score}
                </span>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateLiveScore(-1, 0)}
                    className="w-9 h-9 rounded-xl bg-[#141A15] text-[#A5B0A6] hover:text-white flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateLiveScore(1, 0)}
                    className="w-9 h-9 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] font-bold flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Team B */}
              <div className="p-3 rounded-2xl bg-[#1C241E] text-center space-y-2">
                <span className="text-xs font-bold text-[#F4F7F0] block truncate">
                  {scoringMatch.teamB.name}
                </span>
                <span className="text-4xl font-black font-display text-[#C8FF2E] block">
                  {scoringMatch.teamB.score}
                </span>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateLiveScore(0, -1)}
                    className="w-9 h-9 rounded-xl bg-[#141A15] text-[#A5B0A6] hover:text-white flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateLiveScore(0, 1)}
                    className="w-9 h-9 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] font-bold flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleFinishMatch(scoringMatch.id)}
                className="flex-1 py-2.5 rounded-xl bg-[#1C241E] hover:bg-[#263028] text-xs font-bold text-[#3DDC84] border border-[#3DDC84]/30"
              >
                Mark Match Final
              </button>
              <button
                type="button"
                onClick={() => setScoringMatch(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
