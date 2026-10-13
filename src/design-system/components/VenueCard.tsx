import React, { useState } from 'react';
import { Star, Heart, MapPin, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Venue } from '../../mock/types';
import { APP_CONFIG } from '../../config/appConfig';
import { SportIcon } from '../../illustrations/SportIcons';

interface VenueCardProps {
  venue: Venue;
  onClick?: () => void;
  className?: string;
  variant?: 'standard' | 'compact' | 'featured';
}

export const VenueCard: React.FC<VenueCardProps> = ({
  venue,
  onClick,
  className = '',
  variant = 'standard',
}) => {
  const [isFav, setIsFav] = useState(venue.isFavorite ?? false);

  // Availability calculation
  const hasSlots = venue.availableSlots && venue.availableSlots.length > 0;
  const isBooked = venue.availableSlots && venue.availableSlots.length === 0;

  return (
    <div
      onClick={onClick}
      className={`group w-full rounded-[24px] bg-[#F5F7F2] text-[#0B0F0C] overflow-hidden p-3 transition-all duration-200 press-scale cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.35)] select-none hover:shadow-[0_16px_36px_rgba(0,0,0,0.45)] ${className}`}
    >
      {/* Photo with Overlay & Badges */}
      <div className={`relative w-full ${variant === 'featured' ? 'h-48' : 'h-40'} rounded-[18px] overflow-hidden bg-[#1C241E]`}>
        <img
          src={venue.image}
          alt={venue.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Dark subtle gradient bottom to top for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />

        {/* Favorite Heart Button Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFav(!isFav);
          }}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all press-scale ${
            isFav
              ? 'bg-[#FF8FC7] text-[#0B0F0C]'
              : 'bg-black/40 text-white hover:bg-black/60'
          }`}
        >
          <Heart className="w-4 h-4" fill={isFav ? '#0B0F0C' : 'none'} strokeWidth={2} />
        </button>

        {/* Top Left Badges: Sport + Surface */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[80%]">
          {/* Sport Badge with Vector SportIcon */}
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0B0F0C]/85 text-[#C8FF2E] backdrop-blur-md text-[10px] font-bold uppercase tracking-wider border border-white/10">
            <SportIcon sport={venue.sport} size={11} color="#C8FF2E" />
            {venue.sport}
          </span>

          <span className="px-2 py-0.5 rounded-full bg-white/90 text-[#0B0F0C] backdrop-blur-md text-[10px] font-semibold">
            {venue.surface}
          </span>

          <span className="px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md text-[10px] font-medium hidden sm:inline-block">
            {venue.isIndoor ? 'Indoor' : 'Outdoor'}
          </span>
        </div>

        {/* Rating & Distance Bottom Left */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 text-white text-xs">
          <span className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full font-bold">
            <Star className="w-3 h-3 text-[#C8FF2E] fill-[#C8FF2E]" />
            {venue.rating}
          </span>
          <span className="text-[11px] font-medium opacity-90 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full">
            {venue.distanceMiles} mi away
          </span>
        </div>

        {/* Availability Pill Bottom Right */}
        <div className="absolute bottom-2.5 right-2.5">
          {hasSlots ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00E599]/90 text-[#0B0F0C] text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B0F0C] animate-pulse" />
              Available Today
            </span>
          ) : isBooked ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FF3B30]/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Fully Booked
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1C241E]/90 text-[#A5B0A6] text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
              <Clock className="w-2.5 h-2.5 text-[#C8FF2E]" />
              Inquire Desk
            </span>
          )}
        </div>
      </div>

      {/* Details Row (Light Surface #F5F7F2 with Ink Text #0B0F0C) */}
      <div className="p-2 pt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-display font-black text-base text-[#0B0F0C] truncate leading-snug">
              {venue.name}
            </h4>
            {venue.isVerified && (
              <span title="Verified Facility" className="shrink-0 text-[#00E599]">
                <ShieldCheck className="w-4 h-4 fill-[#00E599] text-[#F5F7F2]" />
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-[#526056] truncate mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-[#2A342C] shrink-0" />
            <span className="truncate">{venue.city}</span>
            <span className="text-[#8B988E]">•</span>
            <span className="text-[#526056] font-medium">{venue.courtsCount} {venue.courtsCount === 1 ? 'court' : 'courts'}</span>
          </p>
        </div>

        {/* Verified Price per hour pill */}
        <div className="text-right shrink-0 pl-2">
          <div className="flex items-baseline justify-end gap-0.5">
            <span className="font-display font-black text-lg text-[#0B0F0C] tabular-nums">
              {APP_CONFIG.currency}{venue.pricePerHour}
            </span>
            <span className="text-[11px] text-[#526056]">/hr</span>
          </div>
          <span className="text-[10px] text-[#00A86B] font-bold block -mt-0.5">Verified Rate</span>
        </div>
      </div>
    </div>
  );
};
