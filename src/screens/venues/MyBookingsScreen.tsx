import React, { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, MoreVertical, X } from 'lucide-react';
import { VENUES } from '../../mock/mockData';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { APP_CONFIG } from '../../config/appConfig';

interface MyBookingsScreenProps {
  onBack: () => void;
  onViewPass: (bookingId: string) => void;
}

export const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({
  onBack,
  onViewPass,
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [sheetBooking, setSheetBooking] = useState<{ id: string; venueName: string } | null>(null);

  const upcomingBookings = [
    {
      id: 'BK-89421',
      venue: VENUES[0],
      court: 'Court 2 (Clay)',
      date: 'Sat, 17 Oct',
      time: '10:00 – 11:30 AM',
      price: 54,
    },
    {
      id: 'BK-88930',
      venue: VENUES[1],
      court: 'Pitch 4 (3G Turf)',
      date: 'Wed, 21 Oct',
      time: '19:00 – 20:00',
      price: 55,
    },
  ];

  const pastBookings = [
    {
      id: 'BK-84102',
      venue: VENUES[2],
      court: 'Dome Court 1',
      date: 'Sat, 10 Oct',
      time: '14:00 – 15:30',
      price: 48,
    },
  ];

  const list = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

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
          Upcoming ({upcomingBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'past'
              ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm'
              : 'text-[#A5B0A6]'
          }`}
        >
          Past Sessions ({pastBookings.length})
        </button>
      </div>

      {/* 3. Cards List */}
      <div className="space-y-3">
        {list.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-[#C8FF2E]/15 text-[#C8FF2E] font-display font-bold text-[10px] uppercase">
                {item.id}
              </span>
              <button
                onClick={() => setSheetBooking({ id: item.id, venueName: item.venue.name })}
                className="text-[#6F7B71] hover:text-white p-1"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="font-display font-bold text-base text-[#F4F7F0]">
                {item.venue.name}
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
              {activeTab === 'upcoming' && (
                <button
                  onClick={() => setSheetBooking({ id: item.id, venueName: item.venue.name })}
                  className="text-xs text-[#A5B0A6] hover:text-white"
                >
                  Manage
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

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
              alert('Reschedule calendar opened');
              setSheetBooking(null);
            }}
          >
            Reschedule Date or Time
          </Button>

          <Button
            variant="ghost"
            className="w-full text-xs text-[#FF5C5C] hover:bg-[#FF5C5C]/10"
            onClick={() => {
              alert('Booking cancelled. Refund issued to wallet.');
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
