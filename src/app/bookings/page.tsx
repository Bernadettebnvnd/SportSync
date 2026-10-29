'use client';

import React from 'react';
import Link from 'next/link';
import { useMatchiStore } from '@/lib/store';
import { getSportDisplayName, formatCurrency } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Compass,
  Navigation,
} from 'lucide-react';

export default function BookingsPage() {
  const { currentUser, bookings } = useMatchiStore();

  const userBookings = bookings.filter((b) => b.user_id === currentUser.id);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black text-[#F4F7F0] tracking-tight font-display">
          My Bookings
        </h1>
        <p className="text-xs sm:text-sm text-[#A5B0A6] mt-0.5">
          Active reservations, court access passes, and schedule receipts.
        </p>
      </div>

      {/* Bookings List or Empty State */}
      {userBookings.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[#141A15] p-8 sm:p-14 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1C241E] text-[#C8FF2E] flex items-center justify-center mx-auto shadow-sm">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-black text-[#F4F7F0]">
              No upcoming reservations
            </h2>
            <p className="text-xs text-[#A5B0A6] max-w-sm mx-auto">
              You haven&apos;t reserved any courts yet. Explore verified facilities across the Philippines and lock in your hourly slot.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C] text-xs font-black shadow-sm transition-all press-scale"
            >
              <Compass className="w-4 h-4" />
              <span>Find a Court</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {userBookings.map((booking) => {
            const isConfirmed = booking.status === 'confirmed';
            const isPending = booking.status === 'pending';

            return (
              <div
                key={booking.id}
                className="rounded-3xl border border-white/10 bg-[#141A15] p-5 sm:p-6 shadow-sm space-y-4 hover:border-[#C8FF2E]/40 transition-all"
              >
                {/* Top Row: Sport, Status, Reference */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-[#C8FF2E] bg-[#1C241E] border border-white/10 px-2.5 py-1 rounded-lg">
                      {getSportDisplayName(booking.sport)}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#A5B0A6] bg-[#1C241E] px-2 py-0.5 rounded-md border border-white/10">
                      Ref: {booking.booking_reference}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isConfirmed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#C8FF2E] bg-[#C8FF2E]/10 border border-[#C8FF2E]/20 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmed</span>
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#FFC247] bg-[#FFC247]/10 border border-[#FFC247]/20 px-2.5 py-1 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Payment Pending</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#A5B0A6] capitalize">
                        {booking.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-black text-[#F4F7F0]">
                      {booking.court?.name || 'Sports Court'}
                    </h3>
                    {booking.venue && (
                      <p className="text-xs text-[#A5B0A6] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
                        <span>{booking.venue.name} &bull; {booking.venue.address}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-[#F4F7F0] font-medium pt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[#A5B0A6]">
                        <Calendar className="w-3.5 h-3.5 text-[#C8FF2E]" />
                        <strong className="text-[#F4F7F0]">{booking.booking_date}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#A5B0A6]">
                        <Clock className="w-3.5 h-3.5 text-[#C8FF2E]" />
                        <strong className="text-[#F4F7F0]">{booking.start_time} - {booking.end_time}</strong>
                      </span>
                      <span className="text-[#A5B0A6]">({booking.duration_minutes} mins)</span>
                    </div>
                  </div>

                  {/* Financials & Actions */}
                  <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-base sm:text-lg font-black text-[#C8FF2E]">
                      {formatCurrency(booking.total_amount_cents)}
                    </span>
                    <div className="flex items-center gap-2">
                      {booking.venue && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${booking.venue.latitude},${booking.venue.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-[#F4F7F0] hover:bg-[#1C241E] inline-flex items-center gap-1 transition-colors"
                        >
                          <Navigation className="w-3 h-3 text-[#C8FF2E]" />
                          <span>Directions</span>
                        </a>
                      )}
                      {booking.venue_id && (
                        <Link
                          href={`/venues/${booking.venue_id}`}
                          className="px-3 py-1.5 rounded-xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C] text-xs font-bold transition-colors inline-flex items-center gap-1"
                        >
                          <span>Venue Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
