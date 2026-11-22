'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Search,
  Users,
  Crown,
  ChevronRight,
  MapPin,
  Calendar,
  Sparkles,
  Plus,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';
import { CommunityGame } from '../../mock/types';
import { UserAvatar, AvatarId } from '../../illustrations/Avatars';
import { ChatMessage } from '../../design-system/components/ChatBubble';
import {
  fetchGameMessages,
  isUserAuthorizedForChat,
  getUserGameRole,
  markGameChatAsRead,
} from '../../lib/services/chat';
import { getUnreadChatNotificationsCount } from '../../lib/notifications';

interface ConversationsListScreenProps {
  games: CommunityGame[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: AvatarId;
  unreadByGame?: Record<string, number>;
  onBack: () => void;
  onSelectGame: (game: CommunityGame) => void;
  onExploreMatches?: () => void;
  onCreateMatch?: () => void;
}

interface ConversationItemData {
  game: CommunityGame;
  role: 'host' | 'joined';
  latestMessage: ChatMessage | null;
  lastActivityTime: number; // For sorting
  displayTime: string;
  unreadCount: number;
}

export const ConversationsListScreen: React.FC<ConversationsListScreenProps> = ({
  games,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  unreadByGame,
  onBack,
  onSelectGame,
  onExploreMatches,
  onCreateMatch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'hosted' | 'joined' | 'unread'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [latestMessagesMap, setLatestMessagesMap] = useState<Record<string, ChatMessage>>({});
  const [syncVersion, setSyncVersion] = useState(0);

  const currentFilter = useMemo(() => {
    return currentUserId || currentUserName
      ? { id: currentUserId, name: currentUserName }
      : undefined;
  }, [currentUserId, currentUserName]);

  // 1. Strict authorization: ONLY show games the user has hosted or joined
  const authorizedGames = useMemo(() => {
    return games.filter((g) => isUserAuthorizedForChat(g, currentUserId, currentUserName));
  }, [games, currentUserId, currentUserName]);

  // Load latest message for each game (from localStorage cache first, then API)
  const loadLatestMessages = useCallback(async () => {
    if (authorizedGames.length === 0) return;

    const initialCache: Record<string, ChatMessage> = {};

    // A. Read from local storage immediately for zero-flicker preview
    if (typeof window !== 'undefined') {
      for (const g of authorizedGames) {
        const canonicalKey = g.sessionId || g.id;
        try {
          const raw =
            localStorage.getItem(`sportsync_chat_${canonicalKey}`) ||
            (g.id !== canonicalKey ? localStorage.getItem(`sportsync_chat_${g.id}`) : null);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const last = parsed[parsed.length - 1];
              if (last && last.text) {
                initialCache[g.id] = last;
                if (g.sessionId) initialCache[g.sessionId] = last;
              }
            }
          }
        } catch {}
      }
    }

    setLatestMessagesMap((prev) => ({ ...initialCache, ...prev }));

    // B. Fetch fresh messages from API for games
    const fetchPromises = authorizedGames.map(async (g) => {
      const canonicalKey = g.sessionId || g.id;
      try {
        const msgs = await fetchGameMessages(canonicalKey, g.id, {
          hostId: g.hostId,
          hostName: g.hostName,
        });
        if (msgs && msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          return { key: g.id, sessionKey: g.sessionId, message: last };
        }
      } catch {
        // Silently preserve cached message
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);
    setLatestMessagesMap((prev) => {
      const next = { ...prev };
      for (const res of results) {
        if (res && res.message) {
          next[res.key] = res.message;
          if (res.sessionKey) next[res.sessionKey] = res.message;
        }
      }
      return next;
    });
  }, [authorizedGames]);

  useEffect(() => {
    loadLatestMessages();
  }, [loadLatestMessages, syncVersion]);

  // Listen for storage, chat read, and incoming message events
  useEffect(() => {
    const handleStorageChange = () => {
      loadLatestMessages();
    };

    const handleChatRead = () => {
      setSyncVersion((v) => v + 1);
    };

    const handleChatMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      if (detail?.message && detail?.gameId) {
        setLatestMessagesMap((prev) => ({
          ...prev,
          [detail.gameId]: detail.message,
        }));
      } else if (detail?.gameId) {
        loadLatestMessages();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sportsync:chat_read', handleChatRead);
    window.addEventListener('sportsync:notification-received', handleChatRead);
    window.addEventListener('sportsync:notification-change', handleChatRead);
    window.addEventListener('sportsync:chat_message', handleChatMessage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sportsync:chat_read', handleChatRead);
      window.removeEventListener('sportsync:notification-received', handleChatRead);
      window.removeEventListener('sportsync:notification-change', handleChatRead);
      window.removeEventListener('sportsync:chat_message', handleChatMessage);
    };
  }, [loadLatestMessages]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadLatestMessages();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Build structured conversation item list
  const conversationItems: ConversationItemData[] = useMemo(() => {
    const normUser = currentUserName?.trim().toLowerCase();

    return authorizedGames.map((game) => {
      const role = getUserGameRole(game, currentUserId, currentUserName) || 'joined';
      const lastMsg = latestMessagesMap[game.id] || (game.sessionId ? latestMessagesMap[game.sessionId] : null);

      // Calculate unread count
      const fromHook =
        ((unreadByGame && unreadByGame[game.id]) || 0) ||
        (game.sessionId && unreadByGame ? unreadByGame[game.sessionId] || 0 : 0);
      const fromNotif = getUnreadChatNotificationsCount(
        [game.id, game.sessionId].filter(Boolean) as string[],
        game.title,
        currentFilter
      );
      const totalUnread = Math.max(fromHook, fromNotif);

      // Determine sorting timestamp & display time
      let lastActivityTime = 0;
      let displayTime = '';

      if (lastMsg) {
        displayTime = lastMsg.time || 'Recent';
        // Approximate time sorting from message time or fallback to now
        lastActivityTime = Date.now();
      } else {
        displayTime = game.date ? `${game.date}` : 'Upcoming';
        lastActivityTime = 0;
      }

      return {
        game,
        role,
        latestMessage: lastMsg,
        lastActivityTime,
        displayTime,
        unreadCount: totalUnread,
      };
    });
  }, [
    authorizedGames,
    currentUserId,
    currentUserName,
    latestMessagesMap,
    unreadByGame,
    currentFilter,
  ]);

  // Filter & Search
  const filteredConversations = useMemo(() => {
    let list = conversationItems;

    // Filter tab
    if (filterTab === 'hosted') {
      list = list.filter((c) => c.role === 'host');
    } else if (filterTab === 'joined') {
      list = list.filter((c) => c.role === 'joined');
    } else if (filterTab === 'unread') {
      list = list.filter((c) => c.unreadCount > 0);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => {
        const titleMatch = c.game.title.toLowerCase().includes(q);
        const sportMatch = (c.game.sport || '').toLowerCase().includes(q);
        const locMatch = (c.game.locationName || '').toLowerCase().includes(q);
        const hostMatch = (c.game.hostName || '').toLowerCase().includes(q);
        const memberMatch =
          Array.isArray(c.game.members) &&
          c.game.members.some((m) => (m.name || '').toLowerCase().includes(q));
        const msgMatch = c.latestMessage?.text?.toLowerCase().includes(q);
        return titleMatch || sportMatch || locMatch || hostMatch || memberMatch || msgMatch;
      });
    }

    // Sort: Unread first, then games with recent messages, then upcoming games
    return list.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      if (a.latestMessage && !b.latestMessage) return -1;
      if (b.latestMessage && !a.latestMessage) return 1;
      return 0;
    });
  }, [conversationItems, filterTab, searchQuery]);

  const totalUnreadCount = useMemo(() => {
    return conversationItems.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);
  }, [conversationItems]);

  const hostedCount = useMemo(() => {
    return conversationItems.filter((c) => c.role === 'host').length;
  }, [conversationItems]);

  const joinedCount = useMemo(() => {
    return conversationItems.filter((c) => c.role === 'joined').length;
  }, [conversationItems]);

  const handleSelectConversation = (item: ConversationItemData) => {
    // Explicit authorization check
    if (!isUserAuthorizedForChat(item.game, currentUserId, currentUserName)) {
      return;
    }

    // Mark as read immediately
    markGameChatAsRead(
      item.game.id,
      item.game.sessionId,
      item.game.title,
      currentFilter,
      true
    );

    onSelectGame(item.game);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] select-none relative overflow-hidden">
      {/* 1. Header Bar */}
      <div className="px-4 py-3.5 sm:px-5 border-b border-white/5 bg-[#141A15]/90 backdrop-blur-md shrink-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-base sm:text-lg text-[#F4F7F0] tracking-tight">
              Match Chats
            </h1>
            {totalUnreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#FF3B30] text-white font-display font-black text-[10px] leading-tight shadow-[0_0_10px_rgba(255,59,48,0.5)]">
                {totalUnreadCount} active
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh conversations"
            className={`w-8 h-8 rounded-full bg-[#1C241E] hover:bg-[#263028] text-[#A5B0A6] hover:text-[#C8FF2E] flex items-center justify-center transition-colors press-scale ${
              isRefreshing ? 'animate-spin text-[#C8FF2E]' : ''
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="px-4 pt-3 pb-2.5 sm:px-5 shrink-0 bg-[#0B0F0C] space-y-2.5 z-10 border-b border-white/5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#6F7B71] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search match title, squad, sport, or location..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#141A15] border border-white/10 hover:border-white/20 focus:border-[#C8FF2E]/60 text-xs text-[#F4F7F0] placeholder:text-[#6F7B71] focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6F7B71] hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all press-scale ${
              filterTab === 'all'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm'
                : 'bg-[#141A15] text-[#A5B0A6] hover:text-[#F4F7F0] border border-white/5'
            }`}
          >
            All Chats ({authorizedGames.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('hosted')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all press-scale flex items-center gap-1 ${
              filterTab === 'hosted'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm'
                : 'bg-[#141A15] text-[#A5B0A6] hover:text-[#F4F7F0] border border-white/5'
            }`}
          >
            <Crown className="w-3 h-3 text-amber-400" />
            <span>Hosted ({hostedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('joined')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all press-scale flex items-center gap-1 ${
              filterTab === 'joined'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm'
                : 'bg-[#141A15] text-[#A5B0A6] hover:text-[#F4F7F0] border border-white/5'
            }`}
          >
            <Users className="w-3 h-3 text-[#3DDC84]" />
            <span>Joined ({joinedCount})</span>
          </button>

          {totalUnreadCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all press-scale flex items-center gap-1 ${
                filterTab === 'unread'
                  ? 'bg-[#FF3B30] text-white font-bold shadow-sm'
                  : 'bg-[#141A15] text-[#FF3B30] border border-[#FF3B30]/30'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>Unread ({totalUnreadCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Conversations List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-2.5 pb-24">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((item) => {
            const { game, role, latestMessage, displayTime, unreadCount } = item;
            const isHost = role === 'host';
            const hasUnread = unreadCount > 0;

            // Participant lineup: collect up to 3 player avatars
            const memberList = Array.isArray(game.members) ? game.members : [];
            const displayMembers = memberList.slice(0, 3);
            const extraCount = Math.max(0, memberList.length - 3);

            const isCurrentUserLastSender = Boolean(
              latestMessage &&
                ((currentUserId && latestMessage.senderId === currentUserId) ||
                  (currentUserName &&
                    latestMessage.senderName &&
                    latestMessage.senderName.trim().toLowerCase() === currentUserName.trim().toLowerCase()))
            );

            return (
              <div
                key={game.id || game.sessionId}
                onClick={() => handleSelectConversation(item)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group flex items-start gap-3.5 ${
                  hasUnread
                    ? 'bg-[#1C241E] border-[#C8FF2E]/40 shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:border-[#C8FF2E]/70'
                    : 'bg-[#141A15] border-white/5 hover:border-white/20 hover:bg-[#18201A]'
                }`}
              >
                {/* Left: Avatar Stack & Sport Icon */}
                <div className="relative shrink-0 mt-0.5">
                  <div className="flex items-center -space-x-2">
                    {displayMembers.length > 0 ? (
                      displayMembers.map((m, idx) => (
                        <div
                          key={idx}
                          className="rounded-full ring-2 ring-[#0B0F0C] overflow-hidden bg-[#1C241E]"
                        >
                          <UserAvatar
                            id={(m.avatar || 'alex') as AvatarId}
                            name={m.name || 'Player'}
                            size={32}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="rounded-full ring-2 ring-[#0B0F0C] overflow-hidden bg-[#1C241E]">
                        <UserAvatar
                          id={(game.hostAvatar || 'alex') as AvatarId}
                          name={game.hostName || 'Organizer'}
                          size={32}
                        />
                      </div>
                    )}
                    {extraCount > 0 && (
                      <div className="w-8 h-8 rounded-full bg-[#1C241E] ring-2 ring-[#0B0F0C] border border-white/10 flex items-center justify-center text-[10px] font-bold text-[#A5B0A6]">
                        +{extraCount}
                      </div>
                    )}
                  </div>

                  {/* Sport Badge Pill */}
                  <div className="mt-1 flex items-center justify-center">
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-semibold text-[#A5B0A6] uppercase tracking-wider">
                      {game.sport || 'Match'}
                    </span>
                  </div>
                </div>

                {/* Center: Match Info & Message Preview */}
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Top row: Match Title & Role Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3
                        className={`font-display font-bold text-xs sm:text-sm truncate leading-snug ${
                          hasUnread ? 'text-[#F4F7F0]' : 'text-[#E0E6DD]'
                        }`}
                      >
                        {game.title}
                      </h3>
                      {hasUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF2E] shrink-0 shadow-[0_0_6px_#C8FF2E]" />
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[10px] font-mono text-[#6F7B71] shrink-0 whitespace-nowrap">
                      {displayTime}
                    </span>
                  </div>

                  {/* Role & Location Meta */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isHost ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                        <Crown className="w-2.5 h-2.5" />
                        <span>Host</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#3DDC84]/10 border border-[#3DDC84]/20 text-[#3DDC84] text-[10px] font-bold">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>Joined</span>
                      </span>
                    )}

                    <span className="text-[10px] text-[#A5B0A6] truncate max-w-[170px] inline-flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 shrink-0 text-[#6F7B71]" />
                      <span className="truncate">{game.locationName}</span>
                    </span>

                    <span className="text-[10px] text-[#6F7B71] font-mono">
                      • {memberList.length} players
                    </span>
                  </div>

                  {/* Message Preview */}
                  <div className="pt-0.5">
                    {latestMessage ? (
                      <p
                        className={`text-xs truncate leading-normal ${
                          hasUnread
                            ? 'text-[#F4F7F0] font-semibold'
                            : 'text-[#8FA392]'
                        }`}
                      >
                        <span className="text-[#A5B0A6]">
                          {isCurrentUserLastSender ? 'You: ' : `${latestMessage.senderName}: `}
                        </span>
                        {latestMessage.text}
                      </p>
                    ) : (
                      <p className="text-xs text-[#6F7B71] italic truncate">
                        No messages yet. Say hi to the squad!
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Unread Counter & Action */}
                <div className="shrink-0 flex flex-col items-end justify-between self-stretch pl-1">
                  {hasUnread ? (
                    <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-black text-[10px] flex items-center justify-center shadow-[0_0_8px_rgba(200,255,46,0.6)]">
                      {unreadCount}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#6F7B71] group-hover:text-white transition-colors mt-auto" />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          /* Empty State */
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-[#141A15] border border-white/10 flex items-center justify-center text-[#C8FF2E] mb-4 shadow-[0_0_30px_rgba(200,255,46,0.1)]">
              <MessageSquare className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h3 className="font-display font-black text-lg text-[#F4F7F0] mb-1.5">
              {searchQuery ? 'No matching match chats' : 'No Match Chats Yet'}
            </h3>

            <p className="text-xs text-[#A5B0A6] max-w-xs leading-relaxed mb-6">
              {searchQuery
                ? `No group chats found matching "${searchQuery}". Try another search keyword.`
                : 'Group chats are automatically available for every match you host or join. Join an upcoming match or host one to chat with your squad!'}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
              {onExploreMatches && (
                <button
                  type="button"
                  onClick={onExploreMatches}
                  className="w-full h-11 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#d4ff52] transition-all press-scale shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Discover Matches</span>
                </button>
              )}

              {onCreateMatch && (
                <button
                  type="button"
                  onClick={onCreateMatch}
                  className="w-full h-11 rounded-2xl bg-[#141A15] border border-white/10 text-xs font-bold text-[#F4F7F0] hover:bg-[#1C241E] transition-all press-scale flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Host a Match</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
