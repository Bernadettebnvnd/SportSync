'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { UserAvatar } from '../../illustrations/Avatars';
import { CommunityGame } from '../../mock/types';
import { APP_CONFIG } from '../../config/appConfig';

interface InvitationLandingScreenProps {
  inviteCode: string;
  game: CommunityGame | null;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  currentUserName?: string;
  currentUserId?: string;
  isAuthenticated?: boolean;
  onAccept: () => Promise<void> | void;
  onDecline: () => void;
  onRequireAuth: (actionName: string, message: string, pendingAction?: () => void) => boolean;
  onGoHome: () => void;
  onOpenMatch: (game: CommunityGame) => void;
}

export const InvitationLandingScreen: React.FC<InvitationLandingScreenProps> = ({
  inviteCode,
  game,
  isLoading = false,
  isError = false,
  errorMessage,
  currentUserName,
  currentUserId,
  isAuthenticated = false,
  onAccept,
  onDecline,
  onRequireAuth,
  onGoHome,
  onOpenMatch,
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const isRosterFull = Boolean(game && game.spotsJoined >= game.spotsTotal);
  const isCancelled = Boolean(game && (game as any).status === 'cancelled');

  const handleAcceptClick = async () => {
    setActionError(null);
    if (!isAuthenticated) {
      onRequireAuth(
        'Sign in to Accept Invitation',
        'Create an account or sign in to confirm your spot in this invite-only match.',
        async () => {
          setIsAccepting(true);
          try {
            await onAccept();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to accept invitation';
            setActionError(msg);
          } finally {
            setIsAccepting(false);
          }
        }
      );
      return;
    }

    setIsAccepting(true);
    try {
      await onAccept();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept invitation';
      setActionError(msg);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineClick = () => {
    setIsDeclined(true);
    onDecline();
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[540px] flex flex-col items-center justify-center p-6 text-center bg-[#0B0F0C] text-[#F4F7F0] select-none space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/30 text-[#C8FF2E] flex items-center justify-center animate-pulse shadow-[0_0_24px_rgba(200,255,46,0.2)]">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-display font-bold text-base text-[#F4F7F0]">
            Loading Event Invitation
          </h2>
          <p className="text-xs text-[#A5B0A6] mt-1">
            Validating private access code: {inviteCode}
          </p>
        </div>
      </div>
    );
  }

  if (isError || !game) {
    return (
      <div className="w-full min-h-[540px] flex flex-col justify-between p-5 bg-[#0B0F0C] text-[#F4F7F0] select-none">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <button
            type="button"
            onClick={onGoHome}
            className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
            title="Go home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
            Invitation
          </span>
          <div className="w-9" />
        </div>

        <div className="p-6 rounded-3xl bg-[#141A15] border border-white/10 text-center space-y-4 max-w-sm mx-auto my-auto">
          <div className="w-14 h-14 rounded-full bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 text-[#FF5C5C] flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-[#F4F7F0]">
              Invitation Not Found
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-1.5 leading-relaxed">
              {errorMessage || 'The invitation link is invalid, has expired, or the match is no longer available.'}
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-[0_0_24px_rgba(200,255,46,0.3)]"
              onClick={onGoHome}
            >
              Browse Public Matches
            </Button>
          </div>
        </div>

        <div className="text-center text-[11px] text-[#6F7B71] pb-2">
          SportSync Naga City Private Matchmaking
        </div>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="w-full min-h-[540px] flex flex-col justify-between p-5 bg-[#0B0F0C] text-[#F4F7F0] select-none">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <button
            type="button"
            onClick={onGoHome}
            className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
            Invitation Expired
          </span>
          <div className="w-9" />
        </div>

        <div className="p-6 rounded-3xl bg-[#141A15] border border-white/10 text-center space-y-4 max-w-sm mx-auto my-auto">
          <div className="w-14 h-14 rounded-full bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 text-[#FF5C5C] flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-[#F4F7F0]">
              Invitation Expired or Revoked
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-1.5 leading-relaxed">
              This match has ended or was cancelled by the organizer.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-[0_0_24px_rgba(200,255,46,0.3)]"
              onClick={onGoHome}
            >
              Find Active Matches
            </Button>
          </div>
        </div>

        <div className="text-center text-[11px] text-[#6F7B71] pb-2">
          SportSync Naga City Private Matchmaking
        </div>
      </div>
    );
  }

  if (isDeclined) {
    return (
      <div className="w-full min-h-[540px] flex flex-col justify-between p-5 bg-[#0B0F0C] text-[#F4F7F0] select-none">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <button
            type="button"
            onClick={onGoHome}
            className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
            Invitation
          </span>
          <div className="w-9" />
        </div>

        <div className="p-6 rounded-3xl bg-[#141A15] border border-white/10 text-center space-y-4 max-w-sm mx-auto my-auto">
          <div className="w-14 h-14 rounded-full bg-[#1C241E] text-[#A5B0A6] border border-white/10 flex items-center justify-center mx-auto">
            <X className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-[#F4F7F0]">
              Invitation Declined
            </h2>
            <p className="text-xs text-[#A5B0A6] mt-1.5 leading-relaxed">
              You have declined the invitation to join <span className="text-[#F4F7F0] font-semibold">{game.title}</span>. You have not been added to the roster and no spot was reserved.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-[0_0_24px_rgba(200,255,46,0.3)]"
              onClick={onGoHome}
            >
              Explore Public Games
            </Button>
            <button
              type="button"
              onClick={() => setIsDeclined(false)}
              className="text-xs text-[#A5B0A6] hover:text-[#C8FF2E] transition-colors underline pt-1 block mx-auto"
            >
              Review invitation again
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-[#6F7B71] pb-2">
          SportSync Naga City Private Matchmaking
        </div>
      </div>
    );
  }

  const spotsLeft = Math.max(0, game.spotsTotal - game.spotsJoined);

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-28 select-none">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/5 shrink-0 bg-[#0B0F0C]">
        <button
          type="button"
          onClick={onGoHome}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
          title="Back to discovery"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <span className="font-display font-black text-xs uppercase tracking-wider text-[#C8FF2E] block">
            Event Invitation
          </span>
          <span className="text-[10px] text-[#A5B0A6]">
            Private Match Preview
          </span>
        </div>

        <div className="px-2.5 py-1 rounded-full bg-[#141A15] border border-[#C8FF2E]/40 text-[#C8FF2E] text-[10px] font-bold flex items-center gap-1">
          <Lock className="w-3 h-3 text-[#C8FF2E]" />
          <span>Invite Only</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {actionError && (
          <div className="p-3 rounded-2xl bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 text-[#FF5C5C] text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {isAlreadyMember && (
          <div className="p-3.5 rounded-2xl bg-[#141A15] border border-[#C8FF2E]/40 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#C8FF2E] shrink-0" />
            <div>
              <span className="font-display font-bold text-xs text-[#F4F7F0] block">
                You are on this roster
              </span>
              <span className="text-[10px] text-[#A5B0A6]">
                You have already accepted this invitation and reserved your spot.
              </span>
            </div>
          </div>
        )}

        {isRosterFull && !isAlreadyMember && (
          <div className="p-3.5 rounded-2xl bg-[#141A15] border border-[#FF5C5C]/40 flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#FF5C5C] shrink-0" />
            <div>
              <span className="font-display font-bold text-xs text-[#F4F7F0] block">
                Match Roster Full
              </span>
              <span className="text-[10px] text-[#A5B0A6]">
                All {game.spotsTotal} spots for this private match have already been claimed.
              </span>
            </div>
          </div>
        )}

        <div className="p-5 rounded-3xl bg-[#141A15] border border-[#C8FF2E]/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-black text-xs uppercase tracking-wider">
              {game.sport} • {game.format}
            </span>
            <span className="text-xs font-bold text-[#3DDC84]">
              {game.skillLevel}
            </span>
          </div>

          <div>
            <h1 className="font-display font-black text-xl sm:text-2xl text-[#F4F7F0] leading-tight">
              {game.title}
            </h1>
          </div>

          <div className="p-3 rounded-2xl bg-[#0B0F0C] border border-white/5 flex items-center gap-3">
            <UserAvatar id={game.hostAvatar} name={game.hostName} size={42} />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#A5B0A6] block">
                Organizer
              </span>
              <span className="font-display font-bold text-sm text-[#F4F7F0] truncate block">
                {game.hostName}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#1C241E] text-[10px] font-bold text-[#C8FF2E] border border-[#C8FF2E]/20">
              Host
            </span>
          </div>

          <div className="space-y-2 pt-1 border-t border-white/5 text-xs text-[#A5B0A6]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C8FF2E] shrink-0" />
              <span className="text-[#F4F7F0] font-medium">{game.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C8FF2E] shrink-0" />
              <span className="text-[#F4F7F0] font-medium">{game.time}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#C8FF2E] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-[#F4F7F0] font-medium block truncate">
                  {game.locationName}
                </span>
                <span className="text-[11px] text-[#6F7B71]">
                  {game.distance}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
            <div className="p-3 rounded-2xl bg-[#0B0F0C] border border-white/5">
              <span className="text-[10px] text-[#A5B0A6] block uppercase tracking-wider font-semibold">
                Roster Status
              </span>
              <div className="font-display font-bold text-sm text-[#F4F7F0] mt-0.5">
                {game.spotsJoined} / {game.spotsTotal}
              </div>
              <span className="text-[10px] text-[#3DDC84]">
                {spotsLeft} spot{spotsLeft === 1 ? '' : 's'} open
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#0B0F0C] border border-white/5">
              <span className="text-[10px] text-[#A5B0A6] block uppercase tracking-wider font-semibold">
                Player Fee
              </span>
              <div className="font-display font-bold text-sm text-[#C8FF2E] mt-0.5">
                {game.pricePerPlayer > 0 ? `${APP_CONFIG.currency}${game.pricePerPlayer}` : 'Free'}
              </div>
              <span className="text-[10px] text-[#6F7B71]">
                {game.pricePerPlayer > 0 ? 'Court cost split' : 'No venue fee'}
              </span>
            </div>
          </div>

          {game.notes && (
            <div className="p-3 rounded-2xl bg-[#0B0F0C] border border-white/5 space-y-1">
              <span className="text-[10px] font-bold text-[#C8FF2E] uppercase tracking-wider block">
                Host Instructions
              </span>
              <p className="text-xs text-[#A5B0A6] leading-relaxed">
                {game.notes}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2.5 pt-2">
          {isAlreadyMember ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full font-display font-bold text-base shadow-[0_0_24px_rgba(200,255,46,0.3)] min-h-[48px]"
              onClick={() => onOpenMatch(game)}
            >
              Open Match Details &amp; Roster
            </Button>
          ) : isRosterFull ? (
            <Button
              variant="secondary"
              size="lg"
              className="w-full font-bold min-h-[48px]"
              onClick={onGoHome}
            >
              Roster Full • Explore Public Games
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="lg"
                className="w-full font-display font-bold text-base shadow-[0_0_24px_rgba(200,255,46,0.3)] min-h-[48px]"
                onClick={handleAcceptClick}
                isLoading={isAccepting}
              >
                Accept Invitation
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full text-xs font-semibold hover:border-white/20 min-h-[44px]"
                onClick={handleDeclineClick}
                disabled={isAccepting}
              >
                Decline
              </Button>
            </>
          )}

          <p className="text-center text-[10px] text-[#6F7B71] px-4 pt-1">
            Accepting reserves your roster spot in this private Naga City match.
          </p>
        </div>
      </div>
    </div>
  );
};

