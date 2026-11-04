import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Loader2,
  Lock,
} from 'lucide-react';
import { ChatBubble, SystemMessage, ChatMessage } from '../../design-system/components/ChatBubble';
import { UserAvatar, AvatarId, toAvatarId } from '../../illustrations/Avatars';
import { CommunityGame } from '../../mock/types';
import { shareMatch } from '../../lib/shareUtils';
import {
  fetchGameChatMessages,
  sendGameChatMessage,
  subscribeToGameChat,
  fetchGameParticipants,
  subscribeToGameParticipants,
  GameParticipant,
} from '../../lib/services/chat';

interface MatchGroupChatScreenProps {
  onBack: () => void;
  game?: CommunityGame | null;
  currentUserName?: string;
  currentUserId?: string;
  onOpenMatchDetail?: () => void;
  onToast?: (msg: string) => void;
}

export const MatchGroupChatScreen: React.FC<MatchGroupChatScreenProps> = ({
  onBack,
  game,
  currentUserName = 'Alex Rivera',
  currentUserId,
  onOpenMatchDetail,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'roster'>('chat');
  const [inputText, setInputText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Real Supabase State (No hardcoded / mock messages or members)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showFeedback = (msg: string) => {
    if (onToast) {
      onToast(msg);
    }
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Compile actual roster members from Supabase participants + host
  const rosterMembers = useMemo(() => {
    const list: Array<{ id?: string; name: string; avatar: AvatarId; role: 'Host' | 'Player'; isHost?: boolean }> = [];
    const seenNames = new Set<string>();

    // 1. Add host first
    if (game?.hostName) {
      list.push({
        id: game.hostId,
        name: game.hostName,
        avatar: toAvatarId(game.hostAvatar),
        role: 'Host',
        isHost: true,
      });
      seenNames.add(game.hostName.trim().toLowerCase());
    }

    // 2. Add fetched participants from Supabase
    for (const p of participants) {
      const lower = p.name.trim().toLowerCase();
      if (!seenNames.has(lower)) {
        list.push({
          id: p.user_id || p.id,
          name: p.name,
          avatar: toAvatarId(p.avatar),
          role: p.role === 'host' ? 'Host' : 'Player',
          isHost: p.role === 'host',
        });
        seenNames.add(lower);
      }
    }

    // 3. Fallback to game.members if present and no duplicate
    if (Array.isArray(game?.members)) {
      for (const m of game.members) {
        const lower = m.name.trim().toLowerCase();
        if (!seenNames.has(lower)) {
          const isH = Boolean(
            (game?.hostName && lower === game.hostName.trim().toLowerCase()) ||
            (game?.hostId && m.id && game.hostId === m.id)
          );
          list.push({
            id: m.id,
            name: m.name,
            avatar: toAvatarId(m.avatar),
            role: isH ? 'Host' : 'Player',
            isHost: isH,
          });
          seenNames.add(lower);
        }
      }
    }

    return list;
  }, [game, participants]);

  const spotsTotal = game?.spotsTotal || 10;
  const spotsJoined = Math.max(rosterMembers.length, game?.spotsJoined || rosterMembers.length);
  const spotsLeft = Math.max(0, spotsTotal - spotsJoined);
  const matchTitle = game?.title || 'Match Group';

  // Strict Chat Access Restriction: Only Host and Confirmed Joined Players can access chat
  const isHost = useMemo(() => {
    if (!game) return false;
    const name = currentUserName?.trim().toLowerCase();
    const id = currentUserId;
    return Boolean(
      (game.hostId && id && game.hostId === id) ||
      (game.hostName && name && game.hostName.trim().toLowerCase() === name)
    );
  }, [game, currentUserName, currentUserId]);

  const isJoinedPlayer = useMemo(() => {
    const name = currentUserName?.trim().toLowerCase();
    const id = currentUserId;
    return rosterMembers.some((m) =>
      !m.isHost && (
        (m.id && id && m.id === id) ||
        (name && m.name.trim().toLowerCase() === name)
      )
    );
  }, [rosterMembers, currentUserName, currentUserId]);

  const hasChatAccess = isHost || isJoinedPlayer;

  // 1. Fetch actual chat messages from Supabase and subscribe to Realtime
  useEffect(() => {
    if (!game?.id) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    fetchGameChatMessages(game.id)
      .then((data) => {
        if (!isMounted) return;
        const normalized = data.map((msg) => ({
          ...msg,
          isMe: Boolean(
            currentUserName && msg.senderName.trim().toLowerCase() === currentUserName.trim().toLowerCase()
          ),
        }));
        setMessages(normalized);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    // Supabase Realtime Subscription for this specific game
    const unsubscribe = subscribeToGameChat(game.id, (incoming) => {
      if (!isMounted) return;
      const isMe = Boolean(
        currentUserName && incoming.senderName.trim().toLowerCase() === currentUserName.trim().toLowerCase()
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) {
          return prev;
        }
        return [...prev, { ...incoming, isMe }];
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [game?.id, currentUserName]);

  // 2. Fetch actual roster participants from Supabase and subscribe to Realtime
  const loadParticipants = useCallback(() => {
    if (!game?.id) {
      setParticipants([]);
      setIsLoadingParticipants(false);
      return;
    }
    setIsLoadingParticipants(true);
    fetchGameParticipants(game.id)
      .then((data) => {
        setParticipants(data);
      })
      .finally(() => {
        setIsLoadingParticipants(false);
      });
  }, [game?.id]);

  useEffect(() => {
    loadParticipants();

    if (!game?.id) return;
    const unsubscribeRoster = subscribeToGameParticipants(game.id, () => {
      loadParticipants();
    });

    return () => {
      unsubscribeRoster();
    };
  }, [game?.id, loadParticipants]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeTab]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !game?.id || isSending) return;

    if (!hasChatAccess) {
      showFeedback('Chat is restricted to confirmed roster participants.');
      return;
    }

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await sendGameChatMessage(game.id, textToSend, {
        id: currentUserId,
        name: currentUserName,
        avatarId: 'alex',
      });

      if (res.success && res.message) {
        const formattedMsg: ChatMessage = {
          ...res.message,
          isMe: true,
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === formattedMsg.id)) return prev;
          return [...prev, formattedMsg];
        });
      } else if (res.error) {
        showFeedback(res.error);
      }
    } catch (err: any) {
      showFeedback(err?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    if (!hasChatAccess) {
      showFeedback('Join game roster to send messages.');
      return;
    }
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
    if (!hasChatAccess) {
      showFeedback('Join match roster to chat.');
      return;
    }
    setInputText(`@${playerName} `);
    setActiveTab('chat');
    showFeedback(`Mentioning @${playerName}`);
  };

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
                <span>{spotsJoined} of {spotsTotal} in roster</span>
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
              onClick={() => setActiveTab(activeTab === 'roster' ? 'chat' : 'roster')}
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

      {/* 2. Main Body: Either Real Chat Log OR Real Roster View */}
      {activeTab === 'chat' ? (
        <>
          {/* Chat Log (Scrollable) */}
          <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-2.5">
            <SystemMessage text={`Match Group • ${spotsJoined} confirmed • Chat restricted to roster`} />

            {isLoadingMessages ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#A5B0A6]">
                <Loader2 className="w-5 h-5 text-[#C8FF2E] animate-spin" />
                <span className="text-xs">Loading live chat messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 px-4">
                <div className="w-12 h-12 rounded-full bg-[#141A15] border border-white/10 flex items-center justify-center text-[#C8FF2E]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F4F7F0]">No messages yet</h4>
                  <p className="text-xs text-[#A5B0A6] max-w-xs mt-1">
                    {hasChatAccess
                      ? 'Say hello to your squad! Coordinate team bibs, gear, and arrival times.'
                      : 'Match chat is restricted to the host and confirmed roster players.'}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Access Control / Input Bar */}
          {hasChatAccess ? (
            <div className="p-3 bg-[#141A15] border-t border-white/5 space-y-2 shrink-0">
              {/* Quick replies */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {['On my way! 🏃', 'Bringing bibs', 'Pitch locked?', '10 mins out'].map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onClick={() => handleQuickReply(qr)}
                    className="px-2.5 py-1 rounded-full bg-[#1C241E] border border-white/10 text-[11px] text-[#A5B0A6] hover:text-white whitespace-nowrap transition-colors press-scale"
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
                  className="w-11 h-11 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-all press-scale shrink-0 shadow-sm"
                  title="Send Message"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0B0F0C]" />
                  ) : (
                    <Send className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Restricted Chat Notice Bar */
            <div className="p-4 bg-[#141A15] border-t border-white/10 flex flex-col items-center text-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 flex items-center justify-center text-[#C8FF2E]">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#F4F7F0] block">
                  Match Chat Restricted
                </span>
                <p className="text-[11px] text-[#A5B0A6] max-w-xs mt-0.5">
                  Only the host and confirmed roster players can participate in this chat.
                </p>
              </div>
              {onOpenMatchDetail && (
                <button
                  type="button"
                  onClick={onOpenMatchDetail}
                  className="px-4 py-2 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] font-bold text-xs hover:bg-[#d4ff52] transition-colors press-scale"
                >
                  View Match & Join Roster
                </button>
              )}
            </div>
          )}
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
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                spotsLeft === 0
                  ? 'bg-[#3DDC84]/20 text-[#3DDC84] border border-[#3DDC84]/30'
                  : 'bg-[#FF8FC7]/20 text-[#FF8FC7] border border-[#FF8FC7]/30'
              }`}>
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

          {/* Roster Members List (Real Confirmed Squad) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider">
                Confirmed Squad ({rosterMembers.length})
              </span>
              {hasChatAccess && (
                <span className="text-[10px] text-[#C8FF2E] font-medium">
                  Tap player to mention
                </span>
              )}
            </div>

            {isLoadingParticipants && rosterMembers.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-[#A5B0A6]">
                <Loader2 className="w-5 h-5 text-[#C8FF2E] animate-spin" />
                <span className="text-xs">Loading roster...</span>
              </div>
            ) : rosterMembers.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 text-center text-xs text-[#A5B0A6]">
                No players on the roster yet.
              </div>
            ) : (
              <div className="space-y-2">
                {rosterMembers.map((member, idx) => {
                  const isMemberHost = member.isHost || idx === 0 || member.name === game?.hostName;
                  return (
                    <div
                      key={member.id || `${member.name}-${idx}`}
                      className="p-3 rounded-2xl bg-[#141A15] border border-white/5 flex items-center justify-between hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <UserAvatar id={member.avatar} name={member.name} size={38} />
                          {isMemberHost && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center shadow-sm">
                              <Crown className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-xs text-[#F4F7F0] truncate">
                              {member.name}
                            </span>
                            {isMemberHost ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#C8FF2E]/10 text-[#C8FF2E] font-bold border border-[#C8FF2E]/30">
                                Host
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#1C241E] text-[#A5B0A6] font-medium border border-white/5">
                                Player
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#3DDC84] flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3DDC84]" />
                            Confirmed in squad
                          </span>
                        </div>
                      </div>

                      {hasChatAccess && (
                        <button
                          type="button"
                          onClick={() => handleMentionPlayer(member.name)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#1C241E] hover:bg-[#253028] border border-white/10 text-[11px] font-semibold text-[#A5B0A6] hover:text-white transition-colors flex items-center gap-1 press-scale"
                        >
                          <MessageSquare className="w-3 h-3 text-[#C8FF2E]" />
                          <span>Chat</span>
                        </button>
                      )}
                    </div>
                  );
                })}
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
