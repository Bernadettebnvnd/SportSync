'use client';

import React from 'react';
import Link from 'next/link';
import { Venue } from '@/types';
import { getSportDisplayName, formatCurrency } from '@/lib/utils';
import { Star, MapPin, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

interface VenueCardProps {
  venue: Venue;
  onLocateOnMap?: () => void;
}

export function VenueCard({ venue, onLocateOnMap }: VenueCardProps) {
  void onLocateOnMap;
  const minRateCents =
    venue.courts && venue.courts.length > 0
      ? Math.min(...venue.courts.map((c) => c.hourly_rate_cents))
      : 45000;

  const hasVerifiedRatings = typeof venue.rating === 'number' && venue.review_count > 0;

  return (
    <div className="group flex flex-col rounded-3xl border border-[#E8E5DF] bg-white overflow-hidden shadow-xs hover:shadow-md transition-all">
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

        {/* Rating or Verified Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-black text-[#1A241E] shadow-xs backdrop-blur-sm">
          {hasVerifiedRatings ? (
            <>
              <Star className="w-3.5 h-3.5 fill-[#E9C46A] text-[#E9C46A]" />
              <span>{venue.rating?.toFixed(1)}</span>
              <span className="text-[#65756B] font-normal text-[11px]">({venue.review_count})</span>
            </>
          ) : (
            <span className="text-[10px] font-bold text-[#2D724E] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#2D724E]" />
              <span>Verified Facility</span>
            </span>
          )}
        </div>

        {/* Sport Tags overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap">
          {venue.featured_sports.slice(0, 3).map((sport) => (
            <span
              key={sport}
              className="inline-flex items-center rounded-lg bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white tracking-tight"
            >
              {getSportDisplayName(sport)}
            </span>
          ))}
          {venue.featured_sports.length > 3 && (
            <span className="inline-flex items-center rounded-lg bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white">
              +{venue.featured_sports.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-black text-base sm:text-lg text-[#1A241E] group-hover:text-[#2D724E] transition-colors leading-snug">
            {venue.name}
          </h3>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-[#65756B] block uppercase tracking-wider">From</span>
            <span className="text-sm font-black text-[#2D724E]">
              {formatCurrency(minRateCents)}
              <span className="text-[10px] font-normal text-[#65756B]">/hr</span>
            </span>
          </div>
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#65756B]">
          <MapPin className="w-3.5 h-3.5 text-[#2D724E] shrink-0" />
          <span className="truncate">{venue.address}</span>
        </p>

        <p className="mt-2 text-xs text-[#65756B] line-clamp-2 leading-relaxed">
          {venue.description}
        </p>

        {/* Operating Hours and Booking Type */}
        <div className="mt-3 pt-3 border-t border-[#E8E5DF] flex items-center justify-between text-xs text-[#65756B]">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-[#2D724E]" />
            <span>{venue.operating_hours.mon_sun || 'Open daily 06:00 - 23:00'}</span>
          </div>

          <span className="text-[11px] font-bold text-[#1A241E] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E8E5DF]">
            Instant Booking
          </span>
        </div>

        {/* CTA */}
        <div className="mt-3.5 pt-1">
          <Link
            href={`/venues/${venue.id}`}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-extrabold shadow-xs transition-all active:scale-[0.98]"
          >
            <span>Book Court</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

