'use client';

import React, { useState } from 'react';
import { QueueEntry, Session, MatchFormat } from '@/types';
import { useMatchiStore } from '@/lib/store';
import { formatTimeAgo } from '@/lib/utils';
import {
  Users,
  User,
  Clock,
  LogOut,
  UserPlus,
  Flame,
  CheckCircle,
} from 'lucide-react';

interface LiveQueueBoardProps {
  session: Session;
  queues: QueueEntry[];
}

export function LiveQueueBoard({ session, queues }: LiveQueueBoardProps) {
  const { currentUser, joinQueue, leaveQueue } = useMatchiStore();
  const [partnerInput, setPartnerInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('doubles');
  const [needsPartner, setNeedsPartner] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const sessionQueues = queues.filter((q) => q.session_id === session.id);
  const myQueueEntry = sessionQueues.find((q) => q.user_id === currentUser.id);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const partners = partnerInput
      ? partnerInput.split(',').map((p) => p.trim()).filter(Boolean)
      : [];
    joinQueue(session.id, partners, selectedFormat, needsPartner);
    setPartnerInput('');
    setIsJoining(false);
  };

  return (
    <div className="rounded-3xl border border-[#E8E5DF] bg-white p-4 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5DF] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-[#1A241E]">
              Live Queue &amp; Rotation
            </h2>
            <span className="rounded-full bg-[#2D724E]/10 px-2.5 py-0.5 text-xs font-bold text-[#2D724E]">
              {sessionQueues.length} in line
            </span>
          </div>
          <p className="text-xs text-[#65756B] mt-0.5">
            Format: <strong className="text-[#1A241E]">{session.rotation_format}</strong> &bull; Supports Doubles &amp; Singles
          </p>
        </div>

        {/* Join / Leave Queue Button */}
        <div>
          {myQueueEntry ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#2D724E] bg-[#EBF4EE] px-3 py-2 rounded-xl flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>
                  #{myQueueEntry.queue_number}{' '}
                  {myQueueEntry.status === 'on_court'
                    ? '— Playing on Court'
                    : `(~${myQueueEntry.estimated_wait_minutes}m wait)`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => leaveQueue(myQueueEntry.id)}
                className="p-2 rounded-xl text-[#DC2626] hover:bg-[#FEE2E2] transition-colors min-h-[40px]"
                title="Leave Queue"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsJoining(!isJoining)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-black shadow-sm transition-all active:scale-95 min-h-[44px]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Join Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Join Inline Form with Doubles & Singles selector */}
      {isJoining && !myQueueEntry && (
        <form
          onSubmit={handleJoin}
          className="rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] p-4 space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#1A241E]">Select Queue Format</span>
            <div className="flex gap-1 bg-white border border-[#E8E5DF] p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedFormat('doubles')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedFormat === 'doubles'
                    ? 'bg-[#2D724E] text-white'
                    : 'text-[#65756B]'
                }`}
              >
                Doubles (2v2)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFormat('singles');
                  setNeedsPartner(false);
                  setPartnerInput('');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedFormat === 'singles'
                    ? 'bg-[#2D724E] text-white'
                    : 'text-[#65756B]'
                }`}
              >
                Singles (1v1)
              </button>
            </div>
          </div>

          {selectedFormat === 'doubles' ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={partnerInput}
                  onChange={(e) => {
                    setPartnerInput(e.target.value);
                    if (e.target.value) setNeedsPartner(false);
                  }}
                  placeholder="Partner's name (leave blank if looking for auto-pair)..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-xs focus:ring-2 focus:ring-[#2D724E] focus:outline-none min-h-[42px]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#2D724E] text-white text-xs font-black shadow-sm hover:bg-[#1E4A32] min-h-[42px]"
                >
                  Join
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#65756B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={needsPartner}
                  onChange={(e) => {
                    setNeedsPartner(e.target.checked);
                    if (e.target.checked) setPartnerInput('');
                  }}
                  className="rounded border-[#E8E5DF] text-[#2D724E] focus:ring-[#2D724E]"
                />
                <span>I don&apos;t have a partner yet &mdash; auto-pair me with the next solo player!</span>
              </label>
            </div>
          ) : (
            <div className="flex gap-2">
              <span className="flex-1 text-xs text-[#65756B] flex items-center bg-white border border-[#E8E5DF] px-3 py-2 rounded-xl">
                Ready for 1v1 Singles challenge on next rotation
              </span>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#2D724E] text-white text-xs font-black shadow-sm hover:bg-[#1E4A32] min-h-[42px]"
              >
                Join Queue
              </button>
            </div>
          )}
        </form>
      )}

      {/* Queue Entries List */}
      <div className="space-y-2.5">
        {sessionQueues.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#65756B]">
            <p className="font-black text-sm text-[#1A241E]">Queue is wide open!</p>
            <p className="mt-1">Be the first to step onto the court for the next match.</p>
          </div>
        ) : (
          sessionQueues.map((entry) => {
            const isMe = entry.user_id === currentUser.id;
            const isOnCourt = entry.status === 'on_court';
            const isWarmingUp = entry.status === 'warming_up';
            const isDoubles = entry.match_format === 'doubles' || entry.group_size > 1;

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between rounded-2xl border p-3 sm:p-4 transition-all ${
                  isMe
                    ? 'border-[#2D724E] bg-[#EBF4EE]/70 shadow-sm'
                    : isOnCourt
                    ? 'border-[#2D724E]/30 bg-white'
                    : 'border-[#E8E5DF] bg-white hover:border-[#D4CEBE]'
                }`}
              >
                {/* Position + Player/Doubles Info */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div
                    className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-xs font-black shrink-0 ${
                      isOnCourt
                        ? 'bg-[#2D724E] text-white'
                        : isWarmingUp
                        ? 'bg-[#C87D43] text-white'
                        : 'bg-[#FAF8F5] text-[#65756B] border border-[#E8E5DF]'
                    }`}
                  >
                    #{entry.queue_number}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-[#1A241E]">
                        {entry.user?.full_name || 'Player'}
                      </span>

                      {/* Doubles / Singles Tag */}
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#FAF8F5] border border-[#E8E5DF] px-1.5 py-0.5 text-[9px] font-bold text-[#65756B]">
                        {isDoubles ? (
                          <>
                            <Users className="w-2.5 h-2.5 text-[#2D724E]" />
                            <span>Doubles</span>
                          </>
                        ) : (
                          <>
                            <User className="w-2.5 h-2.5 text-[#C87D43]" />
                            <span>Singles</span>
                          </>
                        )}
                      </span>

                      {isMe && (
                        <span className="rounded-full bg-[#2D724E] px-1.5 py-0.2 text-[9px] font-black text-white">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Partner display */}
                    {isDoubles && (
                      <p className="text-[11px] text-[#65756B] flex items-center gap-1 mt-0.5">
                        {entry.partner_names && entry.partner_names.length > 0 ? (
                          <span>with {entry.partner_names.join(', ')}</span>
                        ) : entry.needs_partner ? (
                          <span className="text-[#C87D43] font-bold">Looking for partner</span>
                        ) : null}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Status badge & Wait time */}
                <div className="text-right flex items-center gap-2 sm:gap-3 shrink-0">
                  <div>
                    {isOnCourt ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF4EE] px-2.5 py-0.5 text-[11px] font-black text-[#1E4A32]">
                        <Flame className="w-3 h-3 text-[#C87D43]" />
                        <span>{entry.court_name || 'On Court'}</span>
                      </span>
                    ) : isWarmingUp ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF0E6] px-2.5 py-0.5 text-[11px] font-black text-[#A35C2B]">
                        Next Up
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] border border-[#E8E5DF] px-2 py-0.5 text-[11px] font-bold text-[#65756B]">
                        <Clock className="w-3 h-3 text-[#2D724E]" />
                        ~{entry.estimated_wait_minutes}m
                      </span>
                    )}
                    <span className="block text-[9px] text-[#8C877D] mt-0.5">
                      {formatTimeAgo(entry.joined_at)}
                    </span>
                  </div>

                  {isMe && (
                    <button
                      type="button"
                      onClick={() => leaveQueue(entry.id)}
                      className="text-xs text-[#DC2626] hover:underline font-bold min-h-[36px] flex items-center"
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
