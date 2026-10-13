import React from 'react';
import { Calendar, MapPin, QrCode, Share2, CheckCircle2 } from 'lucide-react';
import { Venue } from '../../mock/types';
import { APP_CONFIG } from '../../config/appConfig';
import { Button } from './Button';

interface BookingPassProps {
  bookingId?: string;
  venue: Venue;
  courtName?: string;
  dateStr?: string;
  timeSlot?: string;
  durationHours?: number;
  totalPaid?: number;
  onAddToCalendar?: () => void;
  onShare?: () => void;
  onGetDirections?: () => void;
  className?: string;
}

export const BookingPass: React.FC<BookingPassProps> = ({
  bookingId = 'BK-89421',
  venue,
  courtName = 'Court 2 (Clay)',
  dateStr = 'Saturday, 17 Oct',
  timeSlot = '10:00 - 11:30 AM',
  durationHours = 1.5,
  totalPaid = 54,
  onAddToCalendar,
  onShare,
  onGetDirections,
  className = '',
}) => {
  return (
    <div className={`w-full max-w-sm mx-auto select-none ${className}`}>
      {/* Ticket Container */}
      <div className="relative rounded-[28px] bg-[#141A15] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Top Header Section (Forest Green Tint) */}
        <div className="bg-[#0F2A22] p-5 border-b border-white/5 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold text-[10px] uppercase tracking-wider">
              Confirmed Pass
            </span>
            <span className="font-mono text-xs text-[#A5B0A6]">{bookingId}</span>
          </div>

          <h3 className="font-display font-bold text-xl text-[#F4F7F0]">{venue.name}</h3>
          <p className="flex items-center gap-1.5 text-xs text-[#A5B0A6] mt-1">
            <MapPin className="w-3.5 h-3.5 text-[#C8FF2E]" />
            {venue.address}
          </p>
        </div>

        {/* Middle Details Grid */}
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#6F7B71] font-semibold block mb-0.5">
              Court Spec
            </span>
            <span className="font-display font-bold text-sm text-[#F4F7F0]">{courtName}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#6F7B71] font-semibold block mb-0.5">
              Duration
            </span>
            <span className="font-display font-bold text-sm text-[#F4F7F0]">{durationHours} Hours</span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#6F7B71] font-semibold block mb-0.5">
              Date
            </span>
            <span className="font-display font-bold text-sm text-[#C8FF2E]">{dateStr}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#6F7B71] font-semibold block mb-0.5">
              Time Window
            </span>
            <span className="font-display font-bold text-sm text-[#F4F7F0]">{timeSlot}</span>
          </div>
        </div>

        {/* Perforated Serrated Divider Edge (Left & Right Cutout Notches + Dotted Line) */}
        <div className="relative py-2 flex items-center justify-between">
          <div className="w-5 h-5 -ml-2.5 rounded-full bg-[#0B0F0C] border-r border-white/10" />
          <div className="flex-1 border-b-2 border-dashed border-white/15 mx-2" />
          <div className="w-5 h-5 -mr-2.5 rounded-full bg-[#0B0F0C] border-l border-white/10" />
        </div>

        {/* QR Code & Barcode Section */}
        <div className="p-5 flex flex-col items-center text-center bg-[#0D120E]">
          {/* Simulated High-Res SVG QR Code */}
          <div className="p-3 rounded-2xl bg-white shadow-md mb-2">
            <svg viewBox="0 0 100 100" className="w-32 h-32" fill="#0B0F0C">
              {/* Corner markers */}
              <rect x="10" y="10" width="24" height="24" rx="4" fill="#0B0F0C" />
              <rect x="14" y="14" width="16" height="16" rx="2" fill="#FFFFFF" />
              <rect x="18" y="18" width="8" height="8" rx="1" fill="#0B0F0C" />

              <rect x="66" y="10" width="24" height="24" rx="4" fill="#0B0F0C" />
              <rect x="70" y="14" width="16" height="16" rx="2" fill="#FFFFFF" />
              <rect x="74" y="18" width="8" height="8" rx="1" fill="#0B0F0C" />

              <rect x="10" y="66" width="24" height="24" rx="4" fill="#0B0F0C" />
              <rect x="14" y="70" width="16" height="16" rx="2" fill="#FFFFFF" />
              <rect x="18" y="74" width="8" height="8" rx="1" fill="#0B0F0C" />

              {/* Data blocks */}
              <rect x="42" y="14" width="6" height="6" />
              <rect x="52" y="14" width="6" height="6" />
              <rect x="42" y="26" width="6" height="6" />
              <rect x="42" y="38" width="16" height="6" />
              <rect x="14" y="44" width="16" height="6" />
              <rect x="66" y="44" width="20" height="6" />
              <rect x="36" y="52" width="8" height="16" />
              <rect x="52" y="52" width="14" height="8" />
              <rect x="48" y="68" width="18" height="6" />
              <rect x="72" y="66" width="6" height="18" />
              <rect x="84" y="76" width="6" height="8" />
            </svg>
          </div>

          <span className="text-[11px] text-[#A5B0A6] uppercase tracking-wider font-semibold">
            Scan at entry terminal or gate
          </span>
          <span className="text-xs font-bold text-[#C8FF2E] mt-1">
            Total Paid: {APP_CONFIG.currency}{totalPaid}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
        <Button
          variant="primary"
          onClick={onAddToCalendar}
          leftIcon={<Calendar className="w-4 h-4" />}
          className="w-full"
        >
          Add to Apple / Google Calendar
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={onShare}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Invite Friends
          </Button>
          <Button
            variant="secondary"
            onClick={onGetDirections}
            leftIcon={<MapPin className="w-4 h-4" />}
          >
            Get Directions
          </Button>
        </div>
      </div>
    </div>
  );
};
