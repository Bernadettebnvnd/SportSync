import React, { useState } from 'react';
import { ArrowLeft, Heart, Calendar, Clock, MapPin, Users, ShieldCheck, Share2, MessageCircle } from 'lucide-react';
import { ClayPitchScene } from '../../illustrations/Scenes';
import { UserAvatar } from '../../illustrations/Avatars';
import { AvatarStack } from '../../design-system/components/AvatarStack';
import { Button } from '../../design-system/components/Button';
import { TagBadge } from '../../design-system/components/Chip';
import { CommunityGame } from '../../mock/types';
import { APP_CONFIG } from '../../config/appConfig';

interface MatchDetailScreenProps {
  game: CommunityGame;
  onBack: () => void;
  onJoin: () => void;
  onOpenChat: () => void;
}

export const MatchDetailScreen: React.FC<MatchDetailScreenProps> = ({
  game,
  onBack,
  onJoin,
  onOpenChat,
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleJoinClick = () => {
    setIsJoined(!isJoined);
    onJoin();
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-32 select-none">
      {/* 1. Illustrated Header with Sport Badge (Ref B) */}
      <div className="relative w-full h-56 rounded-b-[36px] bg-[#0F2A22] overflow-hidden border-b border-white/10 shadow-xl">
        <ClayPitchScene className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C] via-transparent to-black/30 pointer-events-none" />

        {/* Top Floating Actions */}
        <div className="absolute top-4 inset-x-5 z-20 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                isLiked ? 'bg-[#FF8FC7] text-[#0B0F0C]' : 'bg-black/50 text-white'
              }`}
            >
              <Heart className="w-5 h-5" fill={isLiked ? '#0B0F0C' : 'none'} />
            </button>
            <button
              onClick={onOpenChat}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-[#C8FF2E] flex items-center justify-center hover:bg-black/70"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sport badge over illustrated banner */}
        <div className="absolute bottom-4 left-5 z-10 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-black text-xs uppercase tracking-wider">
            {game.sport} • {game.format}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-semibold text-white">
            {game.skillLevel}
          </span>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-6">
        {/* 2. Match Title & Host Profile Card (Ref B) */}
        <div>
          <h1 className="font-display font-black text-2xl text-[#F4F7F0] leading-tight">
            {game.title}
          </h1>

          <div className="mt-3 p-3.5 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserAvatar id={game.hostAvatar} size={36} />
              <div>
                <span className="text-[10px] text-[#A5B0A6] uppercase tracking-wider block">
                  Hosted by
                </span>
                <span className="font-display font-bold text-xs text-[#F4F7F0]">
                  {game.hostName}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-bold text-[#C8FF2E] bg-[#C8FF2E]/10 px-2.5 py-1 rounded-full border border-[#C8FF2E]/20">
              Verified Host
            </span>
          </div>
        </div>

        {/* 3. Metadata Rows with Icons */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3.5">
          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-[#1C241E] flex items-center justify-center text-[#C8FF2E] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#A5B0A6] block uppercase tracking-wider">
                Date & Kickoff
              </span>
              <span className="font-semibold text-[#F4F7F0]">
                {game.date} • {game.time}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-[#1C241E] flex items-center justify-center text-[#FF8FC7] shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#A5B0A6] block uppercase tracking-wider">
                Pitch Venue
              </span>
              <span className="font-semibold text-[#F4F7F0]">
                {game.locationName} ({game.distance})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-[#1C241E] flex items-center justify-center text-[#3DDC84] shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#A5B0A6] block uppercase tracking-wider">
                Cost Share
              </span>
              <span className="font-semibold text-[#C8FF2E]">
                {APP_CONFIG.currency}{game.pricePerPlayer} per player
              </span>
            </div>
          </div>
        </div>

        {/* 4. Roster Avatar Stack ("8/10 Joined") */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
                Player Lineup
              </h3>
              <span className="text-xs text-[#A5B0A6]">
                {game.spotsJoined} of {game.spotsTotal} spots taken
              </span>
            </div>
            <span className="text-xs font-bold text-[#FF8FC7] bg-[#FF8FC7]/15 px-2.5 py-1 rounded-full border border-[#FF8FC7]/30">
              {game.spotsTotal - game.spotsJoined} spots left
            </span>
          </div>

          <div className="flex items-center gap-3">
            <AvatarStack
              avatars={game.members.map((m) => m.avatar)}
              size={34}
              maxVisible={5}
            />
            <span className="text-xs font-semibold text-[#F4F7F0]">
              +3 other squad players
            </span>
          </div>
        </div>

        {/* 5. "Bring Your Boots" Notes */}
        <div className="p-4 rounded-2xl bg-[#1C241E] border border-white/10 space-y-1">
          <span className="text-[11px] font-bold text-[#C8FF2E] uppercase tracking-wider block">
            Host Notes • Bring Your Boots
          </span>
          <p className="text-xs text-[#A5B0A6] leading-relaxed">
            {game.notes}
          </p>
        </div>
      </div>

      {/* Sticky Bottom Bar with Big Lime "Join Match" CTA + Heart Button (Ref B) */}
      <div className="sticky bottom-0 w-full z-40 p-4 bg-[#0B0F0C]/95 backdrop-blur-2xl border-t border-white/10 flex items-center gap-3 mt-6">
        <button
          onClick={() => setIsLiked(!isLiked)}
          className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all press-scale shrink-0 ${
            isLiked
              ? 'bg-[#FF8FC7] text-[#0B0F0C] border-[#FF8FC7]'
              : 'bg-[#1C241E] text-white border-white/10 hover:border-white/20'
          }`}
        >
          <Heart className="w-5 h-5" fill={isLiked ? '#0B0F0C' : 'none'} />
        </button>

        <Button
          variant={isJoined ? 'secondary' : 'primary'}
          size="lg"
          onClick={handleJoinClick}
          className="flex-1 h-14 font-display font-bold text-base shadow-[0_0_24px_rgba(200,255,46,0.3)]"
        >
          {isJoined ? 'Joined • Open Team Chat' : 'Join Match Now'}
        </Button>
      </div>
    </div>
  );
};
