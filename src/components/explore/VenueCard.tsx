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
    <div className="group flex flex-col rounded-3xl border border-white/10 bg-[#141A15] overflow-hidden shadow-sm hover:border-[#C8FF2E]/40 hover:shadow-lg transition-all h-full justify-between">
      <div>
        {/* Image Banner */}
        <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-[#1C241E]">
          {venue.images && venue.images[0] ? (
            <img
              src={venue.images[0]}
              alt={venue.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#1C241E] font-black text-sm text-[#C8FF2E]">
              {venue.name}
            </div>
          )}

          {/* Rating or Verified Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-[#0B0F0C]/85 px-2.5 py-1 text-xs font-bold text-[#F4F7F0] shadow-sm backdrop-blur-md border border-white/10">
            {hasVerifiedRatings ? (
              <>
                <Star className="w-3.5 h-3.5 fill-[#FFC247] text-[#FFC247]" />
                <span>{venue.rating?.toFixed(1)}</span>
                <span className="text-[#A5B0A6] font-normal text-[11px]">({venue.review_count})</span>
              </>
            ) : (
              <span className="text-[10px] font-bold text-[#C8FF2E] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#C8FF2E]" />
                <span>Verified Facility</span>
              </span>
            )}
          </div>

          {/* Sport Tags overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap">
            {venue.featured_sports.slice(0, 3).map((sport) => (
              <span
                key={sport}
                className="inline-flex items-center rounded-lg bg-black/75 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-[#F4F7F0] border border-white/10"
              >
                {getSportDisplayName(sport)}
              </span>
            ))}
            {venue.featured_sports.length > 3 && (
              <span className="inline-flex items-center rounded-lg bg-black/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-[#A5B0A6] border border-white/10">
                +{venue.featured_sports.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-black text-base sm:text-lg text-[#F4F7F0] group-hover:text-[#C8FF2E] transition-colors leading-snug line-clamp-1">
              {venue.name}
            </h3>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-[#A5B0A6] block uppercase tracking-wider">From</span>
              <span className="text-sm font-black text-[#C8FF2E]">
                {formatCurrency(minRateCents)}
                <span className="text-[10px] font-normal text-[#A5B0A6]">/hr</span>
              </span>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-[#A5B0A6]">
            <MapPin className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
            <span className="truncate">{venue.address}</span>
          </p>

          <p className="text-xs text-[#A5B0A6] line-clamp-2 leading-relaxed">
            {venue.description || 'Verified multi-sport court facility with professional lighting and surfaces.'}
          </p>

          {/* Operating Hours and Booking Type */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-[#A5B0A6]">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[#C8FF2E]" />
              <span>{venue.operating_hours.mon_sun || 'Open daily 06:00 - 23:00'}</span>
            </div>

            <span className="text-[11px] font-bold text-[#C8FF2E] bg-[#1C241E] px-2 py-0.5 rounded-md border border-white/10">
              Instant Booking
            </span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="p-4 sm:p-5 pt-0">
        <Link
          href={`/venues/${venue.id}`}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C] text-xs font-black shadow-sm transition-all press-scale"
        >
          <span>Book Court</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
