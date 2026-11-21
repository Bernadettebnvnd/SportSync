import React, { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, MoreVertical, X } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { APP_CONFIG } from '../../config/appConfig';

interface MyBookingsScreenProps {
  bookings?: Array<{
    id: string;
    bookingReference?: string;
    venue: any;
    court: string;
    date: string;
    time: string;
    price: number;
    status?: string;
    notes?: string;
    rejectionReason?: string;
  }>;
  onBack: () => void;
  onViewPass: (bookingId: string) => void;
  onCancelBooking?: (bookingId: string) => void;
}

export const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({
  bookings = [],
  onBack,
  onViewPass,
  onCancelBooking,
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [sheetBooking, setSheetBooking] = useState<{ id: string; venueName: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const upcomingList = (bookings || []).filter((b) => b.status !== 'cancelled');
  const pastList: any[] = [];
  const list = activeTab === 'upcoming' ? upcomingList : pastList;

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-28 select-none overflow-y-auto no-scrollbar relative">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[700] w-11/12 max-w-sm p-3.5 rounded-2xl bg-[#141A15] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200">
          <span className="text-xs font-semibold text-[#C8FF2E] flex-1">
            {feedback}
          </span>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="font-display font-black text-base text-[#F4F7F0]">
          My Reservations
        </h1>

        <div className="w-9" />
      </div>

      {/* 2. Upcoming vs Past Switcher */}
      <div className="flex rounded-2xl bg-[#141A15] p-1 border border-white/5 mb-4">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'upcoming'
              ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm'
              : 'text-[#A5B0A6]'
          }`}
        >
          Upcoming ({upcomingList.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'past'
              ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm'
              : 'text-[#A5B0A6]'
          }`}
        >
          Past Sessions ({pastList.length})
        </button>
      </div>

      {/* 3. Cards List or Empty State */}
      {list.length > 0 ? (
        <div className="space-y-3">
          {list.map((item) => {
            const declineReason =
              item.rejectionReason ||
              (item.notes ? item.notes.match(/Declined:\s*(.+)$/i)?.[1]?.trim() : undefined);

            return (
            <div
              key={item.id}
              className={`p-4 rounded-3xl bg-[#141A15] border space-y-3 ${
                item.status === 'rejected' ? 'border-rose-500/30' : 'border-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#F4F7F0] font-display font-bold text-[10px] uppercase font-mono">
                    {item.bookingReference || item.id}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'confirmed' || item.status === 'completed'
                        ? 'bg-[#C8FF2E]/15 text-[#C8FF2E] border border-[#C8FF2E]/30'
                        : item.status === 'rejected'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                    }`}
                  >
                    {item.status === 'confirmed' || item.status === 'completed'
                      ? 'Accepted (Confirmed)'
                      : item.status === 'rejected'
                      ? 'Declined (Rejected)'
                      : 'Pending Approval'}
                  </span>
                </div>
                <button
                  onClick={() => setSheetBooking({ id: item.id, venueName: item.venue?.name || 'Venue' })}
                  className="text-[#6F7B71] hover:text-white p-1"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {item.status === 'rejected' && declineReason && (
                <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-200">
                  <span className="font-bold text-rose-300">Decline Reason: </span>
                  <span>{declineReason}</span>
                </div>
              )}

              <div>
                <h3 className="font-display font-bold text-base text-[#F4F7F0]">
                  {item.venue?.name || 'Venue'}
                </h3>
                <p className="text-xs text-[#A5B0A6] mt-0.5">{item.court}</p>
              </div>

              <div className="p-3 rounded-2xl bg-[#1C241E] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#A5B0A6]">
                  <Clock className="w-4 h-4 text-[#C8FF2E]" />
                  <span>{item.date} • {item.time}</span>
                </div>
                <span className="font-bold text-[#F4F7F0]">
                  {APP_CONFIG.currency}{item.price}
                </span>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  onClick={() => onViewPass(item.id)}
                  className="text-xs font-bold text-[#C8FF2E] underline underline-offset-2"
                >
                  View Entry QR Pass →
                </button>
                {activeTab === 'upcoming' && item.status !== 'rejected' && (
                  <button
                    onClick={() => setSheetBooking({ id: item.id, venueName: item.venue?.name || 'Venue' })}
                    className="text-xs text-[#A5B0A6] hover:text-white"
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-[#141A15] p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1C241E] text-[#C8FF2E] flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#F4F7F0]">No reservations found</h3>
            <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
              {activeTab === 'upcoming'
                ? "You haven't reserved any courts yet. Explore verified facilities and lock in your hourly slot."
                : "You don't have any past reservations."}
            </p>
          </div>
        </div>
      )}

      {/* 4. Reschedule / Cancel Bottom Sheet */}
      <BottomSheet
        isOpen={sheetBooking !== null}
        onClose={() => setSheetBooking(null)}
        title="Manage Reservation"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#A5B0A6]">
            Court: <span className="text-white font-semibold">{sheetBooking?.venueName}</span>
          </p>

          <Button
            variant="secondary"
            className="w-full text-xs font-semibold"
            onClick={() => {
              showFeedback('Reschedule calendar requested for ' + sheetBooking?.venueName);
              setSheetBooking(null);
            }}
          >
            Reschedule Date or Time
          </Button>

          <Button
            variant="ghost"
            className="w-full text-xs text-[#FF5C5C] hover:bg-[#FF5C5C]/10"
            onClick={() => {
              if (sheetBooking) {
                onCancelBooking?.(sheetBooking.id);
              }
              setSheetBooking(null);
            }}
          >
            Cancel Reservation (100% Refundable)
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};
