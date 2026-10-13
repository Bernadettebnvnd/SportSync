import React, { useState } from 'react';
import { ArrowLeft, Bell, Calendar, Trophy, Sparkles, X, Check } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'goal' | 'invite' | 'booking';
  title: string;
  desc: string;
  time: string;
  read: boolean;
  isToday: boolean;
}

interface NotificationsScreenProps {
  onBack: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      type: 'goal',
      title: 'GOAL! Northgate FC 2 - 1 Riverside',
      desc: 'Leo Varga converts penalty in 49th minute.',
      time: '9m ago',
      read: false,
      isToday: true,
    },
    {
      id: 'n2',
      type: 'invite',
      title: 'Match Invite from Marcus',
      desc: 'You were invited to 5v5: Sunset Game Under Lights.',
      time: '45m ago',
      read: false,
      isToday: true,
    },
    {
      id: 'n3',
      type: 'booking',
      title: 'Court Booking Confirmed',
      desc: 'Clay Court Club Kensington: Court 2 reserved for Sat 10:00.',
      time: '2h ago',
      read: true,
      isToday: true,
    },
    {
      id: 'n4',
      type: 'invite',
      title: 'Post-Match MVP Awarded',
      desc: 'You were voted Match MVP by your teammates!',
      time: 'Yesterday',
      read: true,
      isToday: false,
    },
    {
      id: 'n5',
      type: 'goal',
      title: 'Full Time Result',
      desc: 'Kensington RFC defeated Apex City 2 - 1.',
      time: '2 days ago',
      read: true,
      isToday: false,
    },
  ]);

  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const todayList = notifications.filter((n) => n.isToday);
  const earlierList = notifications.filter((n) => !n.isToday);

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'goal':
        return <Trophy className="w-4 h-4 text-[#C8FF2E]" />;
      case 'invite':
        return <Sparkles className="w-4 h-4 text-[#FF8FC7]" />;
      case 'booking':
        return <Calendar className="w-4 h-4 text-[#3DDC84]" />;
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="font-display font-black text-base text-[#F4F7F0]">
          Notifications
        </h1>

        <button
          onClick={markAllRead}
          className="text-xs text-[#C8FF2E] font-semibold hover:underline"
        >
          Mark all read
        </button>
      </div>

      <div className="space-y-6">
        {/* TODAY GROUP */}
        {todayList.length > 0 && (
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] block mb-2.5">
              Today
            </span>
            <div className="space-y-2.5">
              {todayList.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    item.read
                      ? 'bg-[#141A15] border-white/5'
                      : 'bg-[#1C241E] border-[#C8FF2E]/30 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#141A15] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-display font-bold text-xs text-[#F4F7F0] truncate">
                          {item.title}
                        </h4>
                        {!item.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF2E]" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#A5B0A6] leading-relaxed mt-0.5">
                        {item.desc}
                      </p>
                      <span className="text-[10px] text-[#6F7B71] font-mono mt-1 block">
                        {item.time}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => dismissNotification(item.id)}
                    className="text-[#6F7B71] hover:text-white p-1 shrink-0"
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] block mb-2.5">
              Earlier
            </span>
            <div className="space-y-2.5">
              {earlierList.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#141A15] border border-white/5 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#1C241E] border border-white/5 flex items-center justify-center shrink-0 mt-0.5">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold text-xs text-[#F4F7F0] truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#A5B0A6] leading-relaxed mt-0.5">
                        {item.desc}
                      </p>
                      <span className="text-[10px] text-[#6F7B71] font-mono mt-1 block">
                        {item.time}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => dismissNotification(item.id)}
                    className="text-[#6F7B71] hover:text-white p-1 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
