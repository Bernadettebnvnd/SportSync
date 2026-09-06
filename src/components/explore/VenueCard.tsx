'use client';

import React from 'react';
import Link from 'next/link';
import { Venue } from '@/types';
import { getSportEmoji, getSportDisplayName } from '@/lib/utils';
import { Star, MapPin, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

interface VenueCardProps {
  venue: Venue;
  onLocateOnMap?: () => void;
}

export function VenueCard({ venue, onLocateOnMap }: VenueCardProps) {
  return (
    <div className="group flex flex-col rounded-2xl border border-[#EBEBE6] bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Image Banner */}
      <div className="relative h-48 w-full overflow-hidden bg-[#E5E7EB]">
        {venue.images && venue.images[0] ? (
          <img
            src={venue.images[0]}
            alt={venue.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#1F9D55]/10 text-3xl">
            🏸
          </div>
        )}

        {/* Rating Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-[#171717] shadow-sm backdrop-blur-sm">
          <Star className="w-3.5 h-3.5 fill-[#FF9F43] text-[#FF9F43]" />
          <span>{venue.rating}</span>
          <span className="text-[#6B7280] font-normal">({venue.review_count})</span>
        </div>

        {/* Verified GCash badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-[#1F9D55] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
          <ShieldCheck className="w-3 h-3" />
          <span>GCash Verified</span>
        </div>

        {/* Sport Pills overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap">
          {venue.featured_sports.map((sport) => (
            <span
              key={sport}
              className="inline-flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[11px] font-semibold text-white"
            >
              <span>{getSportEmoji(sport)}</span>
              <span>{getSportDisplayName(sport)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-lg text-[#171717] group-hover:text-[#1F9D55] transition-colors leading-snug">
            {venue.name}
          </h3>
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#6B7280]">
          <MapPin className="w-3.5 h-3.5 text-[#1F9D55] shrink-0" />
          <span className="truncate">{venue.address}</span>
        </p>

        <p className="mt-3 text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
          {venue.description}
        </p>

        {/* Operating hours & Amenities */}
        <div className="mt-4 pt-3 border-t border-[#EBEBE6] flex items-center justify-between text-xs text-[#6B7280]">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#1F9D55]" />
            <span>{venue.operating_hours.mon_sun || 'Open daily'}</span>
          </div>

          {onLocateOnMap && (
            <button
              type="button"
              onClick={onLocateOnMap}
              className="text-[#1F9D55] font-semibold hover:underline"
            >
              Show on Map
            </button>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="mt-4 pt-3 flex items-center gap-2">
          <Link
            href={`/venues/${venue.id}`}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
          >
            <span>Book Court & Join Open Play</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
