import React, { useState } from 'react';
import { ArrowLeft, Heart, Users, Trophy, Award, Shield } from 'lucide-react';
import { TEAMS, PLAYERS, MATCHES } from '../../mock/mockData';
import { TeamCrest } from '../../illustrations/TeamCrests';
import { RadarChart } from '../../design-system/components/RadarChart';
import { UserAvatar } from '../../illustrations/Avatars';
import { Button } from '../../design-system/components/Button';
import { FixtureRow } from '../../design-system/components/FixtureRow';

interface TeamPlayerProfileScreenProps {
  teamId?: string;
  onBack: () => void;
}

export const TeamPlayerProfileScreen: React.FC<TeamPlayerProfileScreenProps> = ({
  teamId = 'northgate',
  onBack,
}) => {
  const [isFollowing, setIsFollowing] = useState(true);
  const team = TEAMS[teamId] || TEAMS.northgate;
  const starPlayer = PLAYERS[0]; // Leo Varga
  const nextMatch = MATCHES.find((m) => m.homeTeam.id === team.id || m.awayTeam.id === team.id) || MATCHES[3];

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      {/* 1. Hero Banner with Crest */}
      <div className="relative w-full h-48 bg-[#0F2A22] p-5 flex flex-col justify-between overflow-hidden">
        {/* Stadium decorative lines */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0F0C]" />

        <div className="relative z-10 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <Button
            variant={isFollowing ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setIsFollowing(!isFollowing)}
            className="text-xs"
          >
            {isFollowing ? 'Following' : '+ Follow Club'}
          </Button>
        </div>

        {/* Club Crest & Title */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#141A15] border-2 border-[#C8FF2E] p-2 flex items-center justify-center shadow-lg">
            <TeamCrest id={team.crestId} size={48} />
          </div>

          <div>
            <h1 className="font-display font-black text-2xl text-[#F4F7F0] leading-tight">
              {team.name}
            </h1>
            <p className="text-xs text-[#A5B0A6]">
              {team.city} • {team.league}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-6">
        {/* 2. Club Form & Stats Row */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#A5B0A6] block mb-1">
              Recent Form
            </span>
            <div className="flex items-center gap-1">
              {team.form.map((f, i) => (
                <span
                  key={i}
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-display font-bold text-[10px] ${
                    f === 'W'
                      ? 'bg-[#3DDC84] text-[#0B0F0C]'
                      : f === 'D'
                      ? 'bg-[#FFC247] text-[#0B0F0C]'
                      : 'bg-[#FF5C5C] text-white'
                  }`}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#A5B0A6] block mb-0.5">
              League Table
            </span>
            <span className="font-display font-black text-base text-[#C8FF2E]">
              Rank #1 (32 Pts)
            </span>
          </div>
        </div>

        {/* 3. Next Match Card */}
        <div>
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6] mb-2.5">
            Next Fixture
          </h3>
          <FixtureRow match={nextMatch} />
        </div>

        {/* 4. Key Player Radar Chart Comparison */}
        <div className="p-5 rounded-3xl bg-[#141A15] border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <UserAvatar id={starPlayer.avatarId} size={36} />
              <div>
                <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                  {starPlayer.name}
                </h4>
                <span className="text-[10px] text-[#A5B0A6]">
                  #{starPlayer.number} • {starPlayer.position}
                </span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-[#C8FF2E]/15 text-[#C8FF2E] font-display font-black text-xs border border-[#C8FF2E]/30">
              {starPlayer.rating} OVR
            </div>
          </div>

          {/* 6-Axis Radar Chart */}
          <RadarChart stats={starPlayer.stats} size={220} className="mx-auto" />
        </div>

        {/* 5. Squad Roster */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6] mb-2">
            First Team Roster
          </h4>
          {PLAYERS.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[#6F7B71] w-4">{p.number}</span>
                <span className="font-semibold text-[#F4F7F0]">{p.name}</span>
                <span className="text-[10px] text-[#A5B0A6]">({p.position.split(' ')[0]})</span>
              </div>
              <span className="font-display font-bold text-[#C8FF2E] tabular-nums">
                {p.rating}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
