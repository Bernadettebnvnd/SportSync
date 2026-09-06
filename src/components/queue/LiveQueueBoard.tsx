'use client';

import React, { useState } from 'react';
import { QueueEntry, Session } from '@/types';
import { useMonkeyStore } from '@/lib/store';
import { formatTimeAgo } from '@/lib/utils';
import {
  Users,
  Clock,
  LogOut,
  UserPlus,
  Flame,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface LiveQueueBoardProps {
  session: Session;
  queues: QueueEntry[];
}

export function LiveQueueBoard({ session, queues }: LiveQueueBoardProps) {
  const { currentUser, joinQueue, leaveQueue } = useMonkeyStore();
  const [partnerInput, setPartnerInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const sessionQueues = queues.filter((q) => q.session_id === session.id);
  const myQueueEntry = sessionQueues.find((q) => q.user_id === currentUser.id);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const partners = partnerInput
      ? partnerInput.split(',').map((p) => p.trim()).filter(Boolean)
      : [];
    joinQueue(session.id, partners);
    setPartnerInput('');
    setIsJoining(false);
  };

  return (
    <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EBEBE6] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#171717]">Live Queue & Rotation</h2>
            <span className="rounded-full bg-[#1F9D55]/10 px-2.5 py-0.5 text-xs font-bold text-[#1F9D55]">
              {sessionQueues.length} in line
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Format: <strong className="text-[#171717]">{session.rotation_format}</strong>
          </p>
        </div>

        {/* Join / Leave Queue Button */}
        <div>
          {myQueueEntry ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1F9D55] bg-[#E9F8EE] px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>
                  Position #{myQueueEntry.queue_number}{' '}
                  {myQueueEntry.status === 'on_court'
                    ? '— Playing on Court'
                    : `(~${myQueueEntry.estimated_wait_minutes}m wait)`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => leaveQueue(myQueueEntry.id)}
                className="p-2 rounded-xl text-[#EF4444] hover:bg-[#FEE2E2] transition-colors"
                title="Leave Queue"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsJoining(!isJoining)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Hop into Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Join Drawer / Inline form */}
      {isJoining && !myQueueEntry && (
        <form
          onSubmit={handleJoin}
          className="rounded-2xl bg-[#FAFAF7] border border-[#EBEBE6] p-4 space-y-3 animate-in fade-in"
        >
          <div className="text-xs font-bold text-[#171717]">
            Join Queue with Partners (Optional)
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={partnerInput}
              onChange={(e) => setPartnerInput(e.target.value)}
              placeholder="Partner name(s), comma separated..."
              className="flex-1 px-3 py-2 rounded-xl border border-[#EBEBE6] bg-white text-xs focus:ring-2 focus:ring-[#1F9D55] focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#1F9D55] text-white text-xs font-bold shadow-sm hover:bg-[#147A40]"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setIsJoining(false)}
              className="px-3 py-2 rounded-xl text-xs text-[#6B7280] hover:bg-[#EBEBE6]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Queue Entries List */}
      <div className="space-y-3">
        {sessionQueues.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6B7280]">
            <p className="font-bold text-sm text-[#171717]">Queue is wide open!</p>
            <p className="mt-1">Be the first to step up and call the next rally.</p>
          </div>
        ) : (
          sessionQueues.map((entry, index) => {
            const isMe = entry.user_id === currentUser.id;
            const isOnCourt = entry.status === 'on_court';
            const isWarmingUp = entry.status === 'warming_up';

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                  isMe
                    ? 'border-[#1F9D55] bg-[#E9F8EE]/60 shadow-sm'
                    : isOnCourt
                    ? 'border-[#1F9D55]/30 bg-white'
                    : 'border-[#EBEBE6] bg-white hover:border-[#D1D5DB]'
                }`}
              >
                {/* Left: Position & Avatar & Names */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black ${
                      isOnCourt
                        ? 'bg-[#1F9D55] text-white'
                        : isWarmingUp
                        ? 'bg-[#FF9F43] text-white'
                        : 'bg-[#FAFAF7] text-[#6B7280] border border-[#EBEBE6]'
                    }`}
                  >
                    #{entry.queue_number}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-[#171717]">
                        {entry.user?.full_name || 'Player'}
                      </span>
                      {isMe && (
                        <span className="rounded-full bg-[#1F9D55] px-1.5 py-0.2 text-[10px] font-bold text-white">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Partner names if any */}
                    {entry.partner_names && entry.partner_names.length > 0 && (
                      <p className="text-[11px] text-[#6B7280] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#1F9D55]" />
                        <span>with {entry.partner_names.join(', ')}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Status badge & Wait time */}
                <div className="text-right flex items-center gap-3">
                  <div>
                    {isOnCourt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F8EE] px-2.5 py-0.5 text-xs font-bold text-[#147A40]">
                        <Flame className="w-3 h-3 text-[#FF9F43]" />
                        {entry.court_name || 'On Court'}
                      </span>
                    ) : isWarmingUp ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5EA] px-2.5 py-0.5 text-xs font-bold text-[#E68529]">
                        🔥 Next Up
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FAFAF7] border border-[#EBEBE6] px-2.5 py-0.5 text-xs font-semibold text-[#6B7280]">
                        <Clock className="w-3 h-3 text-[#1F9D55]" />
                        ~{entry.estimated_wait_minutes} mins
                      </span>
                    )}
                    <span className="block text-[10px] text-[#9CA3AF] mt-0.5">
                      Joined {formatTimeAgo(entry.joined_at)}
                    </span>
                  </div>

                  {isMe && (
                    <button
                      type="button"
                      onClick={() => leaveQueue(entry.id)}
                      className="text-xs text-[#EF4444] hover:underline font-semibold"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
