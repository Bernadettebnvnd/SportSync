import React, { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  Share2,
  MessageCircle,
  Edit3,
  Trash2,
  Crown,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ClayPitchScene } from '../../illustrations/Scenes';
import { UserAvatar } from '../../illustrations/Avatars';
import { AvatarStack } from '../../design-system/components/AvatarStack';
import { Button } from '../../design-system/components/Button';
import { TagBadge } from '../../design-system/components/Chip';
import { CommunityGame } from '../../mock/types';
import { APP_CONFIG } from '../../config/appConfig';
import { EditGameModal } from '@/components/community/EditGameModal';
import { DeleteGameConfirmationDialog } from '@/components/community/DeleteGameConfirmationDialog';

interface MatchDetailScreenProps {
  game: CommunityGame | null;
  onBack: () => void;
  onJoin: () => void;
  onOpenChat: () => void;
  isHost?: boolean;
  onEditGame?: (updatedData: {
    title: string;
    sport: string;
    date: string;
    time: string;
    locationName: string;
    skillLevel: 'Beginner' | 'Casual' | 'Intermediate' | 'Competitive';
    spotsTotal: number;
    pricePerPlayer: number;
    notes?: string;
    coordinates?: [number, number];
  }) => Promise<void> | void;
  onDeleteGame?: () => Promise<void> | void;
}

export const MatchDetailScreen: React.FC<MatchDetailScreenProps> = ({
  game,
  onBack,
  onJoin,
  onOpenChat,
  isHost = false,
  onEditGame,
  onDeleteGame,
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleJoinClick = () => {
    setIsJoined(!isJoined);
    onJoin();
  };

  const handleSaveEdits = async (updatedData: any) => {
    if (!onEditGame) return;
    try {
      await onEditGame(updatedData);
      setFeedbackMessage({ type: 'success', text: 'Game details updated successfully!' });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to update game.' });
      setTimeout(() => setFeedbackMessage(null), 4000);
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDeleteGame) return;
    try {
      await onDeleteGame();
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to delete game.' });
      setTimeout(() => setFeedbackMessage(null), 4000);
      throw err;
    }
  };

  if (!game) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center p-6 text-center space-y-4 bg-[#0B0F0C] text-[#F4F7F0]">
        <p className="text-sm text-[#A5B0A6]">No match selected or match has ended.</p>
        <Button onClick={onBack} variant="secondary">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-32 select-none relative">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[700] w-11/12 max-w-sm p-3.5 rounded-2xl bg-[#141A15] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200">
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#C8FF2E] shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#FF5C5C] shrink-0" />
          )}
          <span className="text-xs font-semibold text-[#F4F7F0] flex-1">
            {feedbackMessage.text}
          </span>
        </div>
      )}

      {/* 1. Illustrated Header with Sport Badge (Ref B) */}
      <div className="relative w-full h-56 rounded-b-[36px] bg-[#0F2A22] overflow-hidden border-b border-white/10 shadow-xl">
        <ClayPitchScene className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C] via-transparent to-black/30 pointer-events-none" />

        {/* Top Floating Actions */}
        <div className="absolute top-4 inset-x-5 z-20 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            title="Go back"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {/* Host Edit & Delete Quick Actions in Top Bar */}
            {isHost && (
              <>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-[#C8FF2E] hover:bg-[#C8FF2E] hover:text-[#0B0F0C] flex items-center justify-center transition-all press-scale"
                  title="Edit Hosted Game"
                  aria-label="Edit Hosted Game"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-[#FF5C5C] hover:bg-[#FF5C5C] hover:text-white flex items-center justify-center transition-all press-scale"
                  title="Delete Hosted Game"
                  aria-label="Delete Hosted Game"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                isLiked ? 'bg-[#FF8FC7] text-[#0B0F0C]' : 'bg-black/50 text-white'
              }`}
              aria-label="Favorite game"
            >
              <Heart className="w-5 h-5" fill={isLiked ? '#0B0F0C' : 'none'} />
            </button>
            <button
              onClick={onOpenChat}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-[#C8FF2E] flex items-center justify-center hover:bg-black/70"
              aria-label="Open team chat"
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
          {isHost && (
            <span className="px-2.5 py-1 rounded-full bg-[#1C241E]/80 backdrop-blur-md text-xs font-bold text-[#C8FF2E] border border-[#C8FF2E]/30 flex items-center gap-1">
              <Crown className="w-3 h-3" /> Host
            </span>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-5">
        {/* Host Management Controls (Prominently displayed when user is host) */}
        {isHost && (
          <div className="p-4 rounded-3xl bg-[#141A15] border border-[#C8FF2E]/30 space-y-3 shadow-[0_0_20px_rgba(200,255,46,0.12)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#C8FF2E]" />
                <span className="font-display font-bold text-xs uppercase tracking-wider text-[#C8FF2E]">
                  Host Game Management
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1C241E] text-[#C8FF2E] font-semibold border border-[#C8FF2E]/20">
                Created by You
              </span>
            </div>
            <p className="text-xs text-[#A5B0A6] leading-relaxed">
              As host, you can edit the match schedule, sport, location, slots, or delete this match for all players.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="h-11 rounded-xl bg-[#1C241E] hover:bg-[#253028] border border-[#C8FF2E]/40 text-[#C8FF2E] font-bold text-xs flex items-center justify-center gap-2 transition-all press-scale shadow-sm cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Game Details</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="h-11 rounded-xl bg-[#1C241E] hover:bg-[#FF5C5C]/15 border border-[#FF5C5C]/40 text-[#FF5C5C] font-bold text-xs flex items-center justify-center gap-2 transition-all press-scale shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Game</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Match Title & Host Profile Card (Ref B) */}
        <div>
          <h1 className="font-display font-black text-2xl text-[#F4F7F0] leading-tight">
            {game.title}
          </h1>

          <div className="mt-3 p-3.5 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserAvatar id={game.hostAvatar} name={game.hostName} size={36} />
              <div>
                <span className="text-[10px] text-[#A5B0A6] uppercase tracking-wider block">
                  Hosted by
                </span>
                <span className="font-display font-bold text-xs text-[#F4F7F0]">
                  {game.hostName} {isHost && '(You)'}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-bold text-[#C8FF2E] bg-[#C8FF2E]/10 px-2.5 py-1 rounded-full border border-[#C8FF2E]/20">
              {isHost ? 'Your Match' : 'Verified Host'}
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
                Date &amp; Kickoff
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
                {game.locationName} {game.distance && `(${game.distance})`}
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
                {game.pricePerPlayer === 0
                  ? 'Free to join'
                  : `${APP_CONFIG.currency}${game.pricePerPlayer} per player`}
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
              {Math.max(0, game.spotsTotal - game.spotsJoined)} spots left
            </span>
          </div>

          <div className="flex items-center gap-3">
            <AvatarStack
              avatars={game.members.map((m) => m.avatar)}
              size={34}
              maxVisible={5}
            />
            <span className="text-xs font-semibold text-[#F4F7F0]">
              {game.members.length > 1
                ? `${game.members[0].name} and ${game.members.length - 1} other players`
                : '1 squad player ready'}
            </span>
          </div>
        </div>

        {/* 5. "Bring Your Boots" Notes */}
        <div className="p-4 rounded-2xl bg-[#1C241E] border border-white/10 space-y-1">
          <span className="text-[11px] font-bold text-[#C8FF2E] uppercase tracking-wider block">
            Host Notes • Bring Your Boots
          </span>
          <p className="text-xs text-[#A5B0A6] leading-relaxed">
            {game.notes || 'Organized via SportSync Matchmaking. Wear appropriate sports attire.'}
          </p>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="sticky bottom-0 w-full z-40 p-4 bg-[#0B0F0C]/95 backdrop-blur-2xl border-t border-white/10 flex items-center gap-3 mt-6">
        <button
          onClick={() => setIsLiked(!isLiked)}
          className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all press-scale shrink-0 ${
            isLiked
              ? 'bg-[#FF8FC7] text-[#0B0F0C] border-[#FF8FC7]'
              : 'bg-[#1C241E] text-white border-white/10 hover:border-white/20'
          }`}
          aria-label="Favorite game"
        >
          <Heart className="w-5 h-5" fill={isLiked ? '#0B0F0C' : 'none'} />
        </button>

        {isHost ? (
          <div className="flex-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 h-14 rounded-2xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C] font-display font-bold text-sm shadow-[0_0_24px_rgba(200,255,46,0.3)] transition-all press-scale flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Hosted Game</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-14 h-14 rounded-2xl bg-[#1C241E] hover:bg-[#FF5C5C]/20 border border-[#FF5C5C]/40 text-[#FF5C5C] flex items-center justify-center transition-all press-scale shrink-0"
              title="Delete Game"
              aria-label="Delete Game"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Button
            variant={isJoined ? 'secondary' : 'primary'}
            size="lg"
            onClick={handleJoinClick}
            className="flex-1 h-14 font-display font-bold text-base shadow-[0_0_24px_rgba(200,255,46,0.3)]"
          >
            {isJoined ? 'Joined • Open Team Chat' : 'Join Match Now'}
          </Button>
        )}
      </div>

      {/* Edit Game Modal */}
      {isHost && (
        <EditGameModal
          isOpen={isEditModalOpen}
          game={game}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEdits}
        />
      )}

      {/* Delete Game Confirmation Dialog */}
      {isHost && (
        <DeleteGameConfirmationDialog
          isOpen={isDeleteModalOpen}
          game={game}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};
