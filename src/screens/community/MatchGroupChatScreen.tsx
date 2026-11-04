import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Send,
  MapPin,
  Users,
  Share2,
  CheckCircle2,
  Crown,
  Check,
  MessageSquare,
  Calendar,
  Shield,
  ChevronRight,
  UserPlus,
  Lock,
  Loader2,
} from 'lucide-react';
import { ChatBubble, SystemMessage, ChatMessage } from '../../design-system/components/ChatBubble';
import { UserAvatar, AvatarId } from '../../illustrations/Avatars';
import { CommunityGame } from '../../mock/types';
import { shareMatch } from '../../lib/shareUtils';
import {
  fetchGameMessages,
  sendGameMessage,
  subscribeToGameChat,
  broadcastGameMessage,
  fetchGameParticipants,
  getAuthenticatedUserProfile,
  markGameChatAsRead,
  GameParticipant,
  AuthenticatedProfile,
} from '../../lib/services/chat';

interface MatchGroupChatScreenProps {
  onBack: () => void;
  game?: CommunityGame | null;
  currentUserName?: string;
  currentUserId?: string;
  currentUserAvatar?: AvatarId;
  onOpenMatchDetail?: () => void;
  onToast?: (msg: string) => void;
}

export const MatchGroupChatScreen: React.FC<MatchGroupChatScreenProps> = ({
  onBack,
  game,
  currentUserName = 'Player',
  currentUserId,
  currentUserAvatar = 'alex',
  onOpenMatchDetail,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'roster'>('chat');
  const [inputText, setInputText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Authenticated profile loaded directly from Supabase
  const [authProfile, setAuthProfile] = useState<AuthenticatedProfile | null>(null);

  // Messages and participants loaded from Supabase
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
  const [hostParticipant, setHostParticipant] = useState<GameParticipant | null>(null);
  const [joinedPlayers, setJoinedPlayers] = useState<GameParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const showFeedback = (msg: string) => {
    if (onToast) {
      onToast(msg);
    }
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 1. Fetch authenticated user profile directly from Supabase
  useEffect(() => {
    let isMounted = true;
    getAuthenticatedUserProfile().then((profile) => {
      if (isMounted && profile) {
        setAuthProfile(profile);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute effective user identity (prioritizing Supabase authenticated profile)
  const effectiveUserId = authProfile?.id || currentUserId;
  const effectiveUserName = authProfile?.name || currentUserName;
  const effectiveUserAvatar = authProfile?.avatar || currentUserAvatar;

  // 2. Authorization & Access Control Check: Host and joined players only
  const { isHost, isJoined, canAccessChat } = useMemo(() => {
    if (!game) {
      return { isHost: false, isJoined: false, canAccessChat: false };
    }

    const normCurrentName = effectiveUserName.trim().toLowerCase();

    // Check host status
    const matchesHostName = Boolean(
      game.hostName && normCurrentName && game.hostName.trim().toLowerCase() === normCurrentName
    );
    const matchesHostId = Boolean(
      game.hostId && effectiveUserId && game.hostId === effectiveUserId
    );
    const userIsHost = matchesHostName || matchesHostId;

    // Check joined roster status
    const inGameMembers = Boolean(
      game.members &&
        game.members.some(
          (m) =>
            (m.id && effectiveUserId && m.id === effectiveUserId) ||
            (m.name && normCurrentName && m.name.trim().toLowerCase() === normCurrentName)
        )
    );

    const inJoinedList = Boolean(
      joinedPlayers.some(
        (p) =>
          (p.id && effectiveUserId && p.id === effectiveUserId) ||
          (p.name && normCurrentName && p.name.trim().toLowerCase() === normCurrentName)
      )
    );

    const userIsJoined = inGameMembers || inJoinedList;

    return {
      isHost: userIsHost,
      isJoined: userIsJoined,
      canAccessChat: userIsHost || userIsJoined,
    };
  }, [game, effectiveUserId, effectiveUserName, joinedPlayers]);

  // 3. Fetch actual messages and subscribe to real-time updates
  useEffect(() => {
    if (!game?.id) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    // Reset when switching games to keep chats strictly separate
    setMessages([]);
    setLoadingMessages(true);

    let isMounted = true;
    const targetGameId = game.id;
    const hostInfo = { hostId: game.hostId, hostName: game.hostName };

    // Fetch persisted messages from Supabase
    fetchGameMessages(targetGameId, game.sessionId, hostInfo)
      .then((persisted) => {
        if (!isMounted) return;
        setMessages(persisted);
        setLoadingMessages(false);
        markGameChatAsRead(targetGameId);
      })
      .catch((err) => {
        console.warn('[MatchChat] Error loading messages:', err);
        if (isMounted) setLoadingMessages(false);
      });

    // Mark as read immediately on entering chat
    markGameChatAsRead(targetGameId);

    // Subscribe to real-time message changes
    const unsubscribe = subscribeToGameChat(targetGameId, game.sessionId, hostInfo, (incoming) => {
      if (!isMounted) return;

      // When user is actively on this screen, mark incoming messages as read
      markGameChatAsRead(targetGameId);

      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === incoming.id)) {
          return prev;
        }
        return [...prev, incoming];
      });

      scrollToBottom();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [game?.id, game?.sessionId, game?.hostId, game?.hostName]);

  // Stable string signature for members to avoid re-triggering effect when array reference changes
  const membersSignature = useMemo(() => {
    return (game?.members || []).map((m) => `${m.id || ''}:${m.name || ''}`).join('|');
  }, [game?.members]);

  // 4. Fetch actual game participants from Supabase (host and joined players)
  useEffect(() => {
    if (!game?.id) {
      setHostParticipant(null);
      setJoinedPlayers([]);
      setLoadingParticipants(false);
      return;
    }

    setLoadingParticipants(true);
    let isMounted = true;

    fetchGameParticipants({
      gameId: game.id,
      sessionId: game.sessionId,
      hostId: game.hostId,
      hostName: game.hostName,
      hostAvatar: game.hostAvatar,
      existingMembers: game.members || [],
    })
      .then(({ host, joined }) => {
        if (!isMounted) return;
        setHostParticipant(host);
        setJoinedPlayers(joined);
        setLoadingParticipants(false);
      })
      .catch((err) => {
        console.warn('[MatchChat] Error loading participants:', err);
        if (isMounted) {
          setHostParticipant({
            id: game.hostId,
            name: game.hostName || 'Organizer',
            avatar: game.hostAvatar || 'alex',
            role: 'Host',
            isHost: true,
          });
          setJoinedPlayers([]);
          setLoadingParticipants(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [game?.id, game?.sessionId, game?.hostId, game?.hostName, game?.hostAvatar, membersSignature]);

  // Memoize displayed messages to assign isMe cleanly without mutating or re-fetching messages state
  const displayMessages = useMemo(() => {
    const normUser = effectiveUserName.trim().toLowerCase();
    return messages.map((m) => {
      const isMe = Boolean(
        m.isMe ||
          (m.senderId && effectiveUserId && m.senderId === effectiveUserId) ||
          (m.senderName && m.senderName.trim().toLowerCase() === normUser)
      );
      return m.isMe === isMe ? m : { ...m, isMe };
    });
  }, [messages, effectiveUserId, effectiveUserName]);

  // Dynamic spots calculation based on actual host and joined players
  const spotsTotal = game?.spotsTotal || 10;
  const confirmedCount = (hostParticipant ? 1 : 0) + joinedPlayers.length;
  const spotsJoined = Math.min(spotsTotal, Math.max(confirmedCount, game?.spotsJoined || confirmedCount));
  const spotsLeft = Math.max(0, spotsTotal - spotsJoined);
  const matchTitle = game?.title || 'SportSync Match';

  // 5. Send Message Handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !game?.id || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      // If user is host, use game.hostName. If player, use their specific profile name from Supabase.
      const senderDisplayName = isHost && game.hostName ? game.hostName : effectiveUserName;

      const sentMsg = await sendGameMessage({
        gameId: game.id,
        senderId: effectiveUserId,
        senderName: senderDisplayName,
        senderAvatar: effectiveUserAvatar,
        text: textToSend,
        isHost,
      });

      // Optimistic update if not already received via subscription
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, { ...sentMsg, isMe: true }];
      });

      // Broadcast to all peers connected to channel
      await broadcastGameMessage(game.id, sentMsg);
      scrollToBottom();
    } catch (err: any) {
      console.warn('[MatchChat] Failed to send message:', err);
      showFeedback('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInputText(text);
  };

  const handleShareRosterLink = async () => {
    if (!game) return;
    await shareMatch(game, (msg) => {
      setCopiedLink(true);
      showFeedback(msg);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleMentionPlayer = (playerName: string) => {
    setInputText(`@${playerName} `);
    setActiveTab('chat');
    showFeedback(`Mentioning @${playerName}`);
  };

  // Case A: No Game Selected
  if (!game) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0F0C] text-[#F4F7F0] p-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-[#141A15] border border-white/10 flex items-center justify-center text-[#A5B0A6] mb-4">
          <MessageSquare className="w-8 h-8 text-[#A5B0A6]" />
        </div>
        <h2 className="font-display font-black text-xl text-[#F4F7F0] mb-2">No Match Selected</h2>
        <p className="text-xs text-[#A5B0A6] max-w-xs mb-6">
          Please select a match from Discover Games or your matches to access its group chat and roster.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] font-bold text-xs flex items-center gap-2 hover:bg-[#d4ff52] transition-all press-scale"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Return to Matches</span>
        </button>
      </div>
    );
  }

  // Case B: Access Restricted — Only Host and Joined Players allowed
  if (!canAccessChat) {
    return (
      <div className="w-full h-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] select-none relative">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5 bg-[#141A15] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-sm text-[#F4F7F0] truncate max-w-[200px]">
                {matchTitle}
              </h2>
              <span className="text-[11px] text-[#A5B0A6]">Private Match Group</span>
            </div>
          </div>
        </div>

        {/* Access Restricted Lock Card */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-18 h-18 rounded-3xl bg-[#1C241E] border border-white/10 flex items-center justify-center text-[#C8FF2E] mb-5 shadow-[0_0_40px_rgba(200,255,46,0.1)]">
            <Lock className="w-9 h-9 stroke-[2.5]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Chat Restricted</span>
          </div>

          <h3 className="font-display font-black text-xl text-[#F4F7F0] mb-2">
            Match Chat is Private
          </h3>

          <p className="text-xs text-[#A5B0A6] max-w-sm leading-relaxed mb-6">
            This match chat is private and only accessible to the match host and confirmed players in the roster. Join the roster to send and read messages.
          </p>

          <div className="w-full max-w-xs space-y-2.5">
            {onOpenMatchDetail && (
              <button
                onClick={onOpenMatchDetail}
                className="w-full h-12 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#d4ff52] transition-all press-scale shadow-sm"
              >
                <span>View Match Details & Join Roster</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}

            <button
              onClick={onBack}
              className="w-full h-12 rounded-2xl bg-[#141A15] border border-white/10 text-xs font-bold text-[#F4F7F0] hover:bg-[#1C241E] transition-all press-scale flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Matches</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case C: Authorized Host or Joined Player — Full Match Group Chat & Roster
  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#0B0F0C] text-[#F4F7F0] select-none relative">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[700] w-11/12 max-w-sm p-3.5 rounded-2xl bg-[#141A15] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#C8FF2E] shrink-0" />
          <span className="text-xs font-semibold text-[#F4F7F0] flex-1">
            {feedback}
          </span>
        </div>
      )}

      {/* 1. Header with Title & Quick Switcher */}
      <div className="px-4 pt-4 pb-2 border-b border-white/5 bg-[#141A15] shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-sm text-[#F4F7F0] truncate">
                {matchTitle}
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'chat' ? 'roster' : 'chat')}
                className="text-[11px] text-[#C8FF2E] hover:underline font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF2E] animate-pulse" />
                <span>{spotsJoined} of {spotsTotal} players in roster</span>
                <span className="text-[#A5B0A6]">({activeTab === 'chat' ? 'View Roster' : 'Open Chat'})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Share Match Link */}
            <button
              type="button"
              onClick={handleShareRosterLink}
              title="Share Match Link"
              aria-label="Share Match Link"
              className="w-9 h-9 rounded-full bg-[#1C241E] border border-white/10 text-[#C8FF2E] hover:bg-[#C8FF2E] hover:text-[#0B0F0C] flex items-center justify-center transition-all press-scale"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Toggle View Button */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'chat' ? 'roster' : 'chat')}
              className={`h-9 px-3 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all press-scale ${
                activeTab === 'roster'
                  ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                  : 'bg-[#1C241E] text-[#A5B0A6] border-white/10 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Roster</span>
            </button>
          </div>
        </div>

        {/* Segmented View Switcher: Chat vs Roster */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#0B0F0C] border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all press-scale ${
              activeTab === 'chat'
                ? 'bg-[#1C241E] text-[#C8FF2E] shadow-sm'
                : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Match Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all press-scale ${
              activeTab === 'roster'
                ? 'bg-[#1C241E] text-[#C8FF2E] shadow-sm'
                : 'text-[#A5B0A6] hover:text-[#F4F7F0]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Roster ({spotsJoined}/{spotsTotal})</span>
          </button>
        </div>
      </div>

      {/* 2. Main Body: Either Chat Log OR Interactive Roster View */}
      {activeTab === 'chat' ? (
        <>
          {/* Chat Log (Scrollable) */}
          <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-2">
            <SystemMessage
              text={`Match scheduled • ${spotsJoined} spots confirmed • Pitch: ${game.locationName}`}
            />

            {/* Loading Indicator */}
            {loadingMessages && messages.length === 0 && (
              <div className="py-8 flex flex-col items-center justify-center text-[#A5B0A6] space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#C8FF2E]" />
                <span className="text-xs">Connecting to match chat...</span>
              </div>
            )}

            {/* Empty Messages State */}
            {!loadingMessages && messages.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-center text-[#A5B0A6] mb-3">
                  <MessageSquare className="w-6 h-6 text-[#A5B0A6]" />
                </div>
                <h4 className="font-display font-bold text-sm text-[#F4F7F0] mb-1">
                  No messages yet
                </h4>
                <p className="text-xs text-[#A5B0A6] max-w-xs">
                  Coordinate equipment, jerseys, and arrival time with the squad.
                </p>
              </div>
            )}

            {/* Messages list with real sender name, avatar/initials, and host badges */}
            {displayMessages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies & Input Bar */}
          <div className="p-3 bg-[#141A15] border-t border-white/5 space-y-2 shrink-0">
            {/* Quick replies */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {['On my way! 🏃', 'Bringing bibs', 'Pitch 2 right?', '10 mins away'].map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => handleQuickReply(qr)}
                  className="px-2.5 py-1 rounded-full bg-[#1C241E] border border-white/10 text-[11px] text-[#A5B0A6] hover:text-white whitespace-nowrap transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message match group..."
                disabled={isSending}
                className="flex-1 h-11 px-4 rounded-2xl bg-[#1C241E] border border-white/10 text-xs text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none placeholder:text-[#6F7B71]"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all press-scale shrink-0 shadow-sm ${
                  !inputText.trim() || isSending
                    ? 'bg-[#1C241E] text-[#6F7B71] border border-white/5 cursor-not-allowed'
                    : 'bg-[#C8FF2E] text-[#0B0F0C] hover:bg-[#d4ff52]'
                }`}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </form>
          </div>
        </>
      ) : (
        /* FUNCTIONAL CHAT ROSTER VIEW */
        <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-4">
          {/* Roster Capacity Progress Card */}
          <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                  Roster Capacity
                </span>
                <h3 className="font-display font-black text-lg text-[#F4F7F0]">
                  {spotsJoined} / {spotsTotal} Confirmed Players
                </h3>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  spotsLeft === 0
                    ? 'bg-[#3DDC84]/20 text-[#3DDC84] border border-[#3DDC84]/30'
                    : 'bg-[#FF8FC7]/20 text-[#FF8FC7] border border-[#FF8FC7]/30'
                }`}
              >
                {spotsLeft === 0 ? 'Roster Full' : `${spotsLeft} Spots Open`}
              </span>
            </div>

            {/* Capacity Meter */}
            <div className="w-full h-2 rounded-full bg-[#1C241E] overflow-hidden">
              <div
                className="h-full bg-[#C8FF2E] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((spotsJoined / spotsTotal) * 100))}%` }}
              />
            </div>

            {/* Quick Share / Invite Action */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareRosterLink}
                className="flex-1 h-10 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] font-bold text-xs flex items-center justify-center gap-2 transition-all press-scale hover:bg-[#d4ff52]"
              >
                {copiedLink ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Match / Invite Players'}</span>
              </button>

              {onOpenMatchDetail && (
                <button
                  type="button"
                  onClick={onOpenMatchDetail}
                  className="h-10 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs font-bold text-[#F4F7F0] hover:bg-[#253028] transition-all press-scale flex items-center gap-1.5"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Roster Members List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                Confirmed Squad ({confirmedCount})
              </span>
              <span className="text-[10px] text-[#C8FF2E] font-medium">
                Tap player to mention
              </span>
            </div>

            {loadingParticipants ? (
              <div className="p-6 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-center gap-2 text-xs text-[#A5B0A6]">
                <Loader2 className="w-4 h-4 animate-spin text-[#C8FF2E]" />
                <span>Loading match roster...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 1. Host Card */}
                {hostParticipant && (
                  <div
                    key={`host-${hostParticipant.id || hostParticipant.name}`}
                    className="p-3 rounded-2xl bg-[#141A15] border border-[#C8FF2E]/20 flex items-center justify-between hover:border-[#C8FF2E]/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <UserAvatar id={hostParticipant.avatar} name={hostParticipant.name} size={38} />
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center shadow-sm">
                          <Crown className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-xs text-[#F4F7F0] truncate">
                            {hostParticipant.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#C8FF2E]/10 text-[#C8FF2E] font-bold border border-[#C8FF2E]/30">
                            Host
                          </span>
                        </div>
                        <span className="text-[10px] text-[#3DDC84] flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3DDC84]" />
                          Match Organizer
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMentionPlayer(hostParticipant.name)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#1C241E] hover:bg-[#253028] border border-white/10 text-[11px] font-semibold text-[#A5B0A6] hover:text-white transition-colors flex items-center gap-1 press-scale"
                    >
                      <MessageSquare className="w-3 h-3 text-[#C8FF2E]" />
                      <span>Chat</span>
                    </button>
                  </div>
                )}

                {/* 2. Joined Players Cards */}
                {joinedPlayers.map((player, idx) => (
                  <div
                    key={player.id || `${player.name}-${idx}`}
                    className="p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between hover:border-white/15 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar id={player.avatar} name={player.name} size={38} />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-xs text-[#F4F7F0] truncate">
                            {player.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#1C241E] text-[#A5B0A6] font-medium border border-white/5">
                            Player
                          </span>
                        </div>
                        <span className="text-[10px] text-[#3DDC84] flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3DDC84]" />
                          Ready to play
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMentionPlayer(player.name)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#1C241E] hover:bg-[#253028] border border-white/10 text-[11px] font-semibold text-[#A5B0A6] hover:text-white transition-colors flex items-center gap-1 press-scale"
                    >
                      <MessageSquare className="w-3 h-3 text-[#C8FF2E]" />
                      <span>Chat</span>
                    </button>
                  </div>
                ))}

                {/* Empty State when no joined players yet */}
                {joinedPlayers.length === 0 && (
                  <div className="p-4 rounded-2xl bg-[#141A15]/50 border border-dashed border-white/10 text-center">
                    <p className="text-xs text-[#A5B0A6]">
                      No additional players have joined the roster yet.
                    </p>
                    <button
                      type="button"
                      onClick={handleShareRosterLink}
                      className="mt-2 text-xs text-[#C8FF2E] hover:underline font-semibold"
                    >
                      Invite teammates to join &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Open Roster Slots */}
          {spotsLeft > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider px-1 block">
                Open Slots ({spotsLeft})
              </span>
              <div className="space-y-2">
                {Array.from({ length: Math.min(3, spotsLeft) }).map((_, i) => (
                  <div
                    key={`open-slot-${i}`}
                    className="p-3 rounded-2xl bg-[#0B0F0C] border border-dashed border-white/15 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#141A15] border border-dashed border-white/20 flex items-center justify-center text-[#A5B0A6]">
                        <UserPlus className="w-4 h-4 text-[#A5B0A6]" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[#A5B0A6] block">
                          Slot #{spotsJoined + i + 1} Available
                        </span>
                        <span className="text-[10px] text-[#6F7B71]">
                          Invite friends to complete roster
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleShareRosterLink}
                      className="px-3 py-1.5 rounded-xl bg-[#1C241E] hover:bg-[#C8FF2E] hover:text-[#0B0F0C] border border-white/10 text-[11px] font-bold text-[#C8FF2E] transition-all press-scale flex items-center gap-1.5"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Invite</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match Venue & Kickoff Overview */}
          {game && (
            <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                Match Schedule & Venue
              </span>
              <div className="flex items-center gap-2 text-[#F4F7F0]">
                <Calendar className="w-3.5 h-3.5 text-[#C8FF2E]" />
                <span>{game.date} • {game.time}</span>
              </div>
              <div className="flex items-center gap-2 text-[#A5B0A6]">
                <MapPin className="w-3.5 h-3.5 text-[#C8FF2E]" />
                <span className="truncate">{game.locationName}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
