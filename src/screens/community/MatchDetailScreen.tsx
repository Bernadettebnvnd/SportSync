import React, { useState, useMemo } from 'react';
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
  Lock,
  UserMinus,
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
import { shareMatch, copyToClipboard, getMatchShareUrl } from '../../lib/shareUtils';

interface MatchDetailScreenProps {
  game: CommunityGame | null;
  onBack: () => void;
  onJoin: () => Promise<void> | void;
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
  currentUserName?: string;
  currentUserId?: string;
  onRemovePlayer?: (player: { id?: string; name: string }) => Promise<void> | void;
  onToggleHostParticipation?: (participate: boolean) => Promise<void> | void;
}

export const MatchDetailScreen: React.FC<MatchDetailScreenProps> = ({
  game,
  onBack,
  onJoin,
  onOpenChat,
  isHost = false,
  onEditGame,
  onDeleteGame,
  onRemovePlayer,
  currentUserName,
  currentUserId,
  onToggleHostParticipation,
}) => {
  const [isJoined, setIsJoined] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<{ id?: string; name: string } | null>(null);
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTogglingParticipation, setIsTogglingParticipation] = useState(false);

  const [enteredInviteCode, setEnteredInviteCode] = useState('');
  const [inviteUnlocked, setInviteUnlocked] = useState(false);

  const handleShareMatch = async () => {
    if (!game) return;
    await shareMatch(game, (text) => {
      setFeedbackMessage({ type: 'success', text });
      setTimeout(() => setFeedbackMessage(null), 3500);
    });
  };

  const isAlreadyMember = useMemo(() => {
    if (!game || !Array.isArray(game.members)) return false;
    const name = currentUserName?.trim().toLowerCase();
    const id = currentUserId;
    return game.members.some(
      (m) =>
        (name && m.name?.trim().toLowerCase() === name) ||
        (id && m.id && m.id === id)
    );
  }, [game, currentUserName, currentUserId]);

  const isDirectlyInvited = useMemo(() => {
    if (!game || !Array.isArray(game.invitedPlayers)) return false;
    const name = currentUserName?.trim().toLowerCase();
    const id = currentUserId;
    return game.invitedPlayers.some(
      (p) =>
        (name && p.name?.trim().toLowerCase() === name) ||
        (id && p.id && p.id === id)
    );
  }, [game, currentUserName, currentUserId]);

  const hasUnlockedInviteToken = useMemo(() => {
    if (!game || game.visibility !== 'Invite') return true;
    if (isHost || isAlreadyMember || isDirectlyInvited || inviteUnlocked) return true;
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem('sportsync_unlocked_invites');
      const unlocked: string[] = raw ? JSON.parse(raw) : [];
      return (
        (game.inviteCode ? unlocked.includes(game.inviteCode.toUpperCase()) : false) ||
        unlocked.includes(game.id)
      );
    } catch {
      return false;
    }
  }, [game, isHost, isAlreadyMember, isDirectlyInvited, inviteUnlocked]);

  const effectiveIsJoined = isJoined || isAlreadyMember;

  const lineupCount = Array.isArray(game?.members) ? game.members.length : (game?.spotsJoined || 0);
  const spotsLeft = Math.max(0, (game?.spotsTotal || 10) - lineupCount);

  const isHostParticipating = useMemo(() => {
    if (!isHost || !Array.isArray(game?.members)) return false;
    return game.members.some(
      (m) =>
        (currentUserId && m.id && m.id === currentUserId) ||
        (currentUserName && m.name && m.name.trim().toLowerCase() === currentUserName.trim().toLowerCase()) ||
        (game.hostId && m.id && m.id === game.hostId) ||
        (game.hostName && m.name && m.name.trim().toLowerCase() === game.hostName.trim().toLowerCase())
    );
  }, [isHost, game?.members, game?.hostId, game?.hostName, currentUserId, currentUserName]);

  const handleUnlockWithCode = () => {
    if (!enteredInviteCode.trim()) return;
    const clean = enteredInviteCode.trim().toUpperCase();
    if (game?.inviteCode && game.inviteCode.toUpperCase() === clean) {
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('sportsync_unlocked_invites');
          const unlocked: string[] = raw ? JSON.parse(raw) : [];
          if (!unlocked.includes(clean)) {
            unlocked.push(clean);
            localStorage.setItem('sportsync_unlocked_invites', JSON.stringify(unlocked));
          }
        } catch {}
      }
      setInviteUnlocked(true);
      setFeedbackMessage({ type: 'success', text: 'Invite access unlocked! You can now join this match.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } else {
      setFeedbackMessage({ type: 'error', text: 'Invalid invite code. Please check and try again.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleJoinClick = async () => {
    if (!hasUnlockedInviteToken) {
      setFeedbackMessage({ type: 'error', text: 'This is an invite-only game. You can only join if the host has invited you.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }
    if (effectiveIsJoined) {
      if (onOpenChat) onOpenChat();
      return;
    }
    try {
      await onJoin();
      setIsJoined(true);
    } catch (err: any) {
      console.warn('[MatchDetailScreen] Join click error:', err);
    }
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
              onClick={handleShareMatch}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-[#C8FF2E] flex items-center justify-center hover:bg-black/70 transition-all press-scale"
              aria-label="Share match"
              title="Share match link"
            >
              <Share2 className="w-5 h-5" />
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
          {game.visibility === 'Invite' && (
            <span className="px-2.5 py-1 rounded-full bg-[#141A15]/90 backdrop-blur-md text-xs font-bold text-[#C8FF2E] border border-[#C8FF2E]/40 flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#C8FF2E]" /> Invite Only
            </span>
          )}
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

            <div className="p-3 rounded-2xl bg-[#1C241E] border border-white/5 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#F4F7F0] block">
                  {isHostParticipating ? 'Playing in Game' : 'Hosting Only'}
                </span>
                <span className="text-[11px] text-[#A5B0A6] block">
                  {isHostParticipating
                    ? 'You occupy 1 player slot in the lineup.'
                    : 'You do not occupy a slot. Full roster open to other players.'}
                </span>
              </div>
              <button
                type="button"
                disabled={isTogglingParticipation || (!isHostParticipating && spotsLeft <= 0)}
                onClick={async () => {
                  if (!onToggleHostParticipation) return;
                  setIsTogglingParticipation(true);
                  try {
                    await onToggleHostParticipation(!isHostParticipating);
                  } catch (e: any) {
                    setFeedbackMessage({ type: 'error', text: e?.message || 'Failed to update participation.' });
                  } finally {
                    setIsTogglingParticipation(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all press-scale shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isHostParticipating
                    ? 'bg-[#FF5C5C]/15 hover:bg-[#FF5C5C]/25 text-[#FF5C5C] border border-[#FF5C5C]/30'
                    : 'bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C]'
                }`}
              >
                {isHostParticipating ? 'Leave Game' : 'Join Game'}
              </button>
            </div>


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
              <span className="font-semibold text-[#F4F7F0] block">
                {game.locationName} {game.distance && `(${game.distance})`}
              </span>
              {game.locationDetails && (
                <span className="text-[11px] text-[#A5B0A6] block mt-0.5">
                  {game.locationDetails}
                </span>
              )}
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

        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
                Player Lineup
              </h3>
              <span className="text-xs text-[#A5B0A6]">
                {lineupCount} of {game.spotsTotal} spots taken
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FF8FC7] bg-[#FF8FC7]/15 px-2.5 py-1 rounded-full border border-[#FF8FC7]/30">
                {spotsLeft} spots left
              </span>
              <button
                type="button"
                onClick={handleShareMatch}
                className="px-3 py-1.5 rounded-xl bg-[#1C241E] hover:bg-[#C8FF2E] hover:text-[#0B0F0C] border border-[#C8FF2E]/30 text-xs font-bold text-[#C8FF2E] transition-all press-scale flex items-center gap-1.5 shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Invite</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/5 pt-1">
            {(!game.members || game.members.length === 0) ? (
              <div className="py-4 text-center text-xs text-[#A5B0A6]">
                No players in lineup yet.
              </div>
            ) : (
              game.members.map((member, idx) => {
              const isOrganizer = Boolean(

                (game.hostId && member.id && member.id === game.hostId) ||
                (game.hostName && member.name && member.name.trim().toLowerCase() === game.hostName.trim().toLowerCase())
              );
              return (
                <div key={`${member.id || member.name}-${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar id={member.avatar || 'alex'} name={member.name} size={36} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#F4F7F0] truncate block">
                          {member.name}
                        </span>
                        {isOrganizer && (
                          <span className="px-2 py-0.5 rounded-full bg-[#C8FF2E]/15 border border-[#C8FF2E]/30 text-[#C8FF2E] text-[10px] font-bold shrink-0">
                            Organizer
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#A5B0A6] block truncate">
                        {isOrganizer ? 'Match Host • Confirmed' : 'Joined Participant • Spot Reserved'}
                      </span>
                    </div>
                  </div>

                  {isHost && !isOrganizer && (
                    <button
                      type="button"
                      onClick={() => setPlayerToRemove(member)}
                      className="px-2.5 py-1 rounded-xl bg-[#FF5C5C]/10 hover:bg-[#FF5C5C]/20 text-[#FF5C5C] border border-[#FF5C5C]/20 text-[11px] font-bold transition-all press-scale shrink-0 flex items-center gap-1"
                      title={`Remove ${member.name}`}
                    >
                      <UserMinus className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              );
            }))}
          </div>
        </div>

        {game.visibility === 'Invite' && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-[#C8FF2E]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C8FF2E]" />
                <span className="text-xs font-bold text-[#F4F7F0]">Invite-Only Match</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const url = getMatchShareUrl(game);
                  await copyToClipboard(url);
                  setFeedbackMessage({ type: 'success', text: 'Private invite link copied to clipboard!' });
                  setTimeout(() => setFeedbackMessage(null), 3000);
                }}
                className="text-xs font-bold text-[#C8FF2E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Copy Invite Link
              </button>
            </div>
            <p className="text-[11px] text-[#A5B0A6]">
              This match is private and unlisted from the public discovery feed. Only players with the invite link or direct invitation can join.
            </p>

            {!hasUnlockedInviteToken && (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                  Enter Match Invite Code
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={enteredInviteCode}
                    onChange={(e) => setEnteredInviteCode(e.target.value.toUpperCase())}
                    placeholder="INVITE CODE"
                    maxLength={8}
                    className="flex-1 bg-[#0B0F0C] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#C8FF2E] tracking-wider uppercase focus:outline-none focus:border-[#C8FF2E]"
                  />
                  <button
                    type="button"
                    onClick={handleUnlockWithCode}
                    className="px-4 py-2 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] font-bold text-xs hover:bg-[#d4ff52] transition-colors"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
            variant={effectiveIsJoined ? 'secondary' : 'primary'}
            size="lg"
            onClick={handleJoinClick}
            className="flex-1 h-14 font-display font-bold text-base shadow-[0_0_24px_rgba(200,255,46,0.3)]"
          >
            {effectiveIsJoined
              ? 'Joined • Open Team Chat'
              : !hasUnlockedInviteToken
              ? 'Join Match (Invite Only)'
              : 'Join Match Now'}
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

      {playerToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#141A15] border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 text-[#FF5C5C] flex items-center justify-center mx-auto">
              <UserMinus className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-lg text-[#F4F7F0]">
                Remove Player from Lineup?
              </h3>
              <p className="text-xs text-[#A5B0A6] leading-relaxed">
                Are you sure you want to remove <span className="text-[#F4F7F0] font-semibold">{playerToRemove.name}</span> from the match roster? Their reserved spot will be reopened.
              </p>
  
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1 font-semibold"
                onClick={() => setPlayerToRemove(null)}
                disabled={isRemovingPlayer}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="flex-1 font-bold bg-[#FF5C5C] text-white hover:bg-[#FF5C5C]/90"
                onClick={async () => {
                  if (!playerToRemove) return;
                  setIsRemovingPlayer(true);
                  try {
                    await onRemovePlayer?.(playerToRemove);
                    setPlayerToRemove(null);
                  } catch (e: any) {
                    setFeedbackMessage({ type: 'error', text: e?.message || 'Failed to remove player.' });
                  } finally {
                    setIsRemovingPlayer(false);
                  }
                }}
                isLoading={isRemovingPlayer}
              >
                Remove Player
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
