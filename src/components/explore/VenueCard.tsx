'use client';

import React from 'react';
import Link from 'next/link';
import { Venue } from '@/types';
import { getSportDisplayName } from '@/lib/utils';
import { Star, MapPin, Clock, ArrowRight, CreditCard, Banknote, Users } from 'lucide-react';

interface VenueCardProps {
  venue: Venue;
  onLocateOnMap?: () => void;
}

export function VenueCard({ venue, onLocateOnMap }: VenueCardProps) {
  return (
    <div className="group flex flex-col rounded-3xl border border-[#E8E5DF] bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Image Banner */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-[#E8E5DF]">
        {venue.images && venue.images[0] ? (
          <img
            src={venue.images[0]}
            alt={venue.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#2D724E]/10 font-black text-sm text-[#2D724E]">
            {venue.name}
          </div>
        )}

        {/* Rating Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-black text-[#1A241E] shadow-sm backdrop-blur-sm">
          <Star className="w-3.5 h-3.5 fill-[#E9C46A] text-[#E9C46A]" />
          <span>{venue.rating}</span>
          <span className="text-[#65756B] font-normal">({venue.review_count})</span>
        </div>

        {/* Payment Channels Supported Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-[#1E4A32] px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
          <CreditCard className="w-3 h-3 text-[#E9C46A]" />
          <span>E-Wallets &bull; Banks &bull; Cash</span>
        </div>

        {/* Sport Tags overlay (NO EMOJIS) */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap">
          {venue.featured_sports.map((sport) => (
            <span
              key={sport}
              className="inline-flex items-center rounded-lg bg-black/65 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white tracking-tight"
            >
              {getSportDisplayName(sport)}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#C87D43]/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-white">
            <Users className="w-3 h-3" />
            Doubles &amp; Singles
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-black text-base sm:text-lg text-[#1A241E] group-hover:text-[#2D724E] transition-colors leading-snug">
          {venue.name}
        </h3>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#65756B]">
          <MapPin className="w-3.5 h-3.5 text-[#2D724E] shrink-0" />
          <span className="truncate">{venue.address}</span>
        </p>

        <p className="mt-2.5 text-xs text-[#65756B] line-clamp-2 leading-relaxed">
          {venue.description}
        </p>

        {/* Payment and Hours */}
        <div className="mt-3.5 pt-3 border-t border-[#E8E5DF] flex items-center justify-between text-xs text-[#65756B]">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-[#2D724E]" />
            <span>{venue.operating_hours.mon_sun || 'Open daily'}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-[#2D724E]">
            <Banknote className="w-3.5 h-3.5 text-[#C87D43]" />
            <span>Cash Accepted</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-3.5 pt-1">
          <Link
            href={`/venues/${venue.id}`}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-extrabold shadow-sm transition-all active:scale-[0.98]"
          >
            <span>Book Court &bull; Join Open Play</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
