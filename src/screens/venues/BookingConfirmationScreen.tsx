import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, CheckCircle2, Home } from 'lucide-react';
import { BookingPass } from '../../design-system/components/BookingPass';
import { VENUES } from '../../mock/mockData';
import { Venue } from '../../mock/types';
import { Button } from '../../design-system/components/Button';

interface BookingConfirmationScreenProps {
  venue?: Venue;
  onGoHome: () => void;
  onViewMyBookings: () => void;
}

export const BookingConfirmationScreen: React.FC<BookingConfirmationScreenProps> = ({
  venue = VENUES[0],
  onGoHome,
  onViewMyBookings,
}) => {
  useEffect(() => {
    // Celebratory micro-animation confetti in electric lime and cream
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#C8FF2E', '#FF8FC7', '#FFFFFF', '#3DDC84'],
    });
  }, []);

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header */}
      <div className="text-center mb-4">
        <div className="w-14 h-14 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center mx-auto mb-2 shadow-[0_0_24px_rgba(200,255,46,0.35)] animate-scaleUp">
          <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
        </div>
        <span className="text-[11px] font-bold text-[#FF8FC7] uppercase tracking-widest block mb-0.5">
          Court Reserved
        </span>
        <h1 className="font-display font-black text-2xl text-[#F4F7F0]">
          You're Ready to Play!
        </h1>
        <p className="text-xs text-[#A5B0A6] mt-0.5">
          Digital entry pass generated and stored in your wallet.
        </p>
      </div>

      {/* 2. Ticket Pass Component with Perforated Edge & QR */}
      <div className="py-2">
        <BookingPass
          venue={venue}
          courtName="Court 2 (Clay)"
          dateStr="Saturday, 17 Oct"
          timeSlot="10:00 – 11:30 AM"
          totalPaid={54}
          onAddToCalendar={() => alert('Court slot added to calendar!')}
          onShare={() => alert('Invite link copied!')}
          onGetDirections={() => alert('Navigating to venue...')}
        />
      </div>

      {/* 3. Footer Navigation */}
      <div className="pt-6 space-y-2">
        <Button
          variant="secondary"
          size="md"
          onClick={onViewMyBookings}
          className="w-full"
        >
          View All My Bookings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onGoHome}
          leftIcon={<Home className="w-4 h-4" />}
          className="w-full text-xs"
        >
          Return to Discover Hub
        </Button>
      </div>
    </div>
  );
};
