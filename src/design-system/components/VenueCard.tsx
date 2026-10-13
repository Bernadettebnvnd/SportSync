import React, { useState } from 'react';
import { Star, Heart, MapPin } from 'lucide-react';
import { Venue } from '../../mock/types';
import { APP_CONFIG } from '../../config/appConfig';

interface VenueCardProps {
  venue: Venue;
  onClick?: () => void;
  className?: string;
}

export const VenueCard: React.FC<VenueCardProps> = ({ venue, onClick, className = '' }) => {
  const [isFav, setIsFav] = useState(venue.isFavorite ?? false);

  return (
    <div
      onClick={onClick}
      className={`group w-full rounded-[24px] bg-[#F5F7F2] text-[#0B0F0C] overflow-hidden p-3 transition-all duration-200 press-scale cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.35)] select-none ${className}`}
    >
      {/* Photo with Overlay & Badges */}
      <div className="relative w-full h-40 rounded-[18px] overflow-hidden bg-[#1C241E]">
        <img
          src={venue.image}
          alt={venue.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Dark subtle gradient bottom to top for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Favorite Heart Button Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFav(!isFav);
          }}
          className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all press-scale ${
            isFav
              ? 'bg-[#FF8FC7] text-[#0B0F0C]'
              : 'bg-black/40 text-white hover:bg-black/60'
          }`}
        >
          <Heart className="w-4 h-4" fill={isFav ? '#0B0F0C' : 'none'} strokeWidth={2} />
        </button>

        {/* Surface & Indoor/Outdoor Tag Top Left */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-[#0B0F0C]/80 text-[#C8FF2E] backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
            {venue.surface}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/80 text-[#0B0F0C] backdrop-blur-md text-[10px] font-semibold">
            {venue.isIndoor ? 'Indoor' : 'Outdoor'}
          </span>
        </div>

        {/* Rating & Distance Bottom Left */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 text-white text-xs">
          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full font-bold">
            <Star className="w-3 h-3 text-[#C8FF2E] fill-[#C8FF2E]" />
            {venue.rating}
          </span>
          <span className="text-[11px] font-medium opacity-90">
            {venue.distanceMiles} mi away
          </span>
        </div>
      </div>

      {/* Details Row (Light Surface #F5F7F2 with Ink Text #0B0F0C) */}
      <div className="p-2 pt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-display font-bold text-base text-[#0B0F0C] truncate leading-snug">
            {venue.name}
          </h4>
          <p className="flex items-center gap-1 text-xs text-[#526056] truncate mt-0.5">
            <MapPin className="w-3 h-3 text-[#6F7B71]" />
            {venue.city}
          </p>
        </div>

        {/* Price per hour pill */}
        <div className="text-right shrink-0">
          <span className="font-display font-black text-lg text-[#0B0F0C] tabular-nums">
            {APP_CONFIG.currency}{venue.pricePerHour}
          </span>
          <span className="text-[11px] text-[#526056] block -mt-0.5">/ hour</span>
        </div>
      </div>
    </div>
  );
};
