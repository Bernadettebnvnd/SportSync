'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Calendar,
  Trophy,
  Sparkles,
  X,
  CheckCheck,
  Trash2,
  Users,
  Zap,
  MessageSquare,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { useNotifications, NotificationItem, NotificationType } from '../../lib/notifications';

interface NotificationsScreenProps {
  onBack: () => void;
  onNavigate?: (screenId: string) => void;
  currentUserId?: string;
  currentUserName?: string;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
  onNavigate,
  currentUserId,
  currentUserName,
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    addNotification,
  } = useNotifications(currentUserName || currentUserId ? { id: currentUserId, name: currentUserName } : undefined);

  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayCutoff = startOfToday.getTime();

  const displayedList = notifications.filter((n: NotificationItem) => {
    if (filterType === 'unread') return !n.read;
    return true;
  });

  const todayList = displayedList.filter((n: NotificationItem) => (n.timestamp || 0) >= todayCutoff);
  const earlierList = displayedList.filter((n: NotificationItem) => (n.timestamp || 0) < todayCutoff);

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'booking':
        return <Calendar className="w-4 h-4 text-[#3DDC84]" />;
      case 'match':
        return <Users className="w-4 h-4 text-[#C8FF2E]" />;
      case 'goal':
        return <Trophy className="w-4 h-4 text-[#C8FF2E]" />;
      case 'achievement':
        return <Sparkles className="w-4 h-4 text-[#FF8FC7]" />;
      case 'wager':
        return <Zap className="w-4 h-4 text-[#26CCFF]" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-[#A25AFD]" />;
      case 'system':
      default:
        return <Bell className="w-4 h-4 text-[#A5B0A6]" />;
    }
  };

  const handleCardClick = (item: NotificationItem) => {
    if (!item.read) {
      markAsRead(item.id);
    }
    if (item.linkScreen && onNavigate) {
      onNavigate(item.linkScreen);
    }
  };

  const handleSimulateNotification = () => {
    const samples: Array<{
      type: NotificationType;
      title: string;
      desc: string;
      linkScreen?: string;
      recipientName?: string;
      recipientId?: string;
      senderName?: string;
    }> = [
        {
          type: 'match',
          title: 'Player Joined Your Game',
          desc: 'Alex Johnson joined your game, Sunday Pickup Match.',
          linkScreen: 'social-home',
          recipientName: currentUserName,
          recipientId: currentUserId,
          senderName: 'Alex Johnson',
        },
        {
          type: 'match',
          title: 'Game Details Updated',
          desc: 'The host updated details for Friday Evening Basketball.',
          linkScreen: 'match-detail',
          recipientName: currentUserName,
          recipientId: currentUserId,
          senderName: 'Coach Ryan',
        },
        {
          type: 'booking',
          title: 'Court Booking Confirmed',
          desc: 'Metro Naga Sports Complex: Badminton Court 1 reserved for Saturday 09:00 AM.',
          linkScreen: 'my-bookings',
          recipientName: currentUserName,
          recipientId: currentUserId,
        },
        {
          type: 'achievement',
          title: 'Playmaker Streak Multiplier Active!',
          desc: '3-week playing streak maintained! Enjoy 1.5x XP bonus on your next game.',
          linkScreen: 'leaderboard',
          recipientName: currentUserName,
          recipientId: currentUserId,
        },
      ];

    const pick = samples[Math.floor(Math.random() * samples.length)];
    addNotification({
      type: pick.type,
      title: pick.title,
      desc: pick.desc,
      linkScreen: pick.linkScreen,
      recipientName: pick.recipientName,
      recipientId: pick.recipientId,
      senderName: pick.senderName,
    });
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-4 sm:p-5 pt-3.5 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between mb-3.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="font-display font-black text-base text-[#F4F7F0]">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-black text-[10px] leading-tight shadow-[0_0_10px_rgba(200,255,46,0.3)]">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              title="Mark all as read"
              className="h-8 px-2.5 rounded-xl bg-[#1C241E] hover:bg-[#263028] text-xs text-[#C8FF2E] font-semibold flex items-center gap-1 transition-colors press-scale"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAllNotifications}
              title="Clear all notifications"
              className="w-8 h-8 rounded-xl bg-[#1C241E] hover:bg-[#FF5C5C]/20 hover:text-[#FF5C5C] text-[#A5B0A6] flex items-center justify-center transition-colors press-scale"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Real-Time Status Pill & Filter Pills */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3.5">
          <div className="flex items-center gap-1 bg-[#141A15] p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filterType === 'all'
                  ? 'bg-[#1C241E] text-[#F4F7F0] font-bold shadow-sm'
                  : 'text-[#A5B0A6] hover:text-white'
                }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filterType === 'unread'
                  ? 'bg-[#1C241E] text-[#C8FF2E] font-bold shadow-sm'
                  : 'text-[#A5B0A6] hover:text-white'
                }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[#3DDC84] font-medium bg-[#3DDC84]/10 px-2.5 py-1 rounded-full border border-[#3DDC84]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3DDC84] animate-pulse" />
            <span>Live Stream Active</span>
          </div>
        </div>
      )}

      {/* 3. Notifications List */}
      {displayedList.length > 0 ? (
        <div className="space-y-5">
          {/* TODAY GROUP */}
          {todayList.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6] block mb-2 px-1">
                Today
              </span>
              <div className="space-y-2">
                {todayList.map((item: NotificationItem) => (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer group ${item.read
                        ? 'bg-[#141A15] border-white/5 hover:border-white/15'
                        : 'bg-[#1C241E] border-[#C8FF2E]/30 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:border-[#C8FF2E]/60'
                      }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-[#141A15] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-display font-bold text-xs text-[#F4F7F0] truncate">
                            {item.title}
                          </h4>
                          {!item.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF2E] shrink-0 shadow-[0_0_6px_#C8FF2E]" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#A5B0A6] leading-relaxed mt-0.5 break-words">
                          {item.desc}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-[#6F7B71] font-mono block">
                            {item.time}
                          </span>
                          {(item.senderName || item.meta?.senderName || item.meta?.hostName || item.meta?.joiningPlayerName) && (
                            <span className="text-[10px] text-[#8FA392] bg-[#141A15] border border-white/10 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1">
                              <span>From: {item.senderName || item.meta?.senderName || item.meta?.hostName || item.meta?.joiningPlayerName}</span>
                            </span>
                          )}
                          {item.linkScreen && (
                            <span className="text-[10px] text-[#C8FF2E] font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                              View <ChevronRight className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(item.id);
                      }}
                      title="Dismiss"
                      className="text-[#6F7B71] hover:text-white p-1 rounded-lg hover:bg-white/5 shrink-0 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EARLIER GROUP */}
          {earlierList.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5B0A6] block mb-2 px-1">
                Earlier
              </span>
              <div className="space-y-2">
                {earlierList.map((item: NotificationItem) => (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer group ${item.read
                        ? 'bg-[#141A15] border-white/5 hover:border-white/15'
                        : 'bg-[#1C241E] border-[#C8FF2E]/30 shadow-sm hover:border-[#C8FF2E]/50'
                      }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-[#1C241E] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-display font-semibold text-xs text-[#F4F7F0] truncate">
                            {item.title}
                          </h4>
                          {!item.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF2E] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#A5B0A6] leading-relaxed mt-0.5 break-words">
                          {item.desc}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-[#6F7B71] font-mono block">
                            {item.time}
                          </span>
                          {(item.senderName || item.meta?.senderName || item.meta?.hostName || item.meta?.joiningPlayerName) && (
                            <span className="text-[10px] text-[#8FA392] bg-[#1C241E] border border-white/10 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1">
                              <span>From: {item.senderName || item.meta?.senderName || item.meta?.hostName || item.meta?.joiningPlayerName}</span>
                            </span>
                          )}
                          {item.linkScreen && (
                            <span className="text-[10px] text-[#C8FF2E] font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                              View <ChevronRight className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(item.id);
                      }}
                      title="Dismiss"
                      className="text-[#6F7B71] hover:text-white p-1 rounded-lg hover:bg-white/5 shrink-0 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 4. Real-Time Empty State (No Mock Data) */
        <div className="my-auto py-14 px-4 flex flex-col items-center justify-center text-center">
          <div className="relative w-16 h-16 rounded-3xl bg-[#141A15] border border-white/10 flex items-center justify-center mb-4 text-[#A5B0A6] shadow-[0_0_30px_rgba(200,255,46,0.08)]">
            <Bell className="w-7 h-7 text-[#6F7B71]" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#3DDC84] animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#3DDC84] border-2 border-[#0B0F0C]" />
          </div>

          <h3 className="font-display font-black text-base text-[#F4F7F0]">
            {filterType === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>

          <p className="text-xs text-[#A5B0A6] max-w-xs mt-1.5 leading-relaxed">
            {filterType === 'unread'
              ? 'You are all caught up on your matches and court updates.'
              : 'Your court bookings, pickup match rosters, live score updates, and level progression will appear here.'}
          </p>

          <div className="mt-6 flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={handleSimulateNotification}
              className="h-9 px-4 rounded-full bg-[#1C241E] hover:bg-[#263028] border border-[#C8FF2E]/40 text-xs font-bold text-[#C8FF2E] flex items-center gap-1.5 transition-all press-scale shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate Live Alert</span>
            </button>

            <span className="text-[10px] text-[#6F7B71] flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3DDC84]" />
              Real-time event listener connected
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
