import React, { useState } from 'react';
import { ArrowLeft, Star, Heart, MapPin, Clock, ShieldCheck, Share2, Check, ArrowRight, Sparkles } from 'lucide-react';
import { Venue } from '../../mock/types';
import { Button } from '../../design-system/components/Button';
import { APP_CONFIG } from '../../config/appConfig';

interface VenueDetailScreenProps {
  venue: Venue;
  onBack: () => void;
  onBookNow: () => void;
}

export const VenueDetailScreen: React.FC<VenueDetailScreenProps> = ({
  venue,
  onBack,
  onBookNow,
}) => {
  const [isFav, setIsFav] = useState(venue.isFavorite ?? false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const gallery = [
    venue.image,
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
  ];

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-32 select-none">
      {/* 1. Photo Carousel with Parallax Feel & Gradient Overlay */}
      <div className="relative w-full h-72 overflow-hidden bg-[#1C241E]">
        <img
          src={gallery[photoIndex]}
          alt={venue.name}
          className="w-full h-full object-cover transition-all duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C] via-transparent to-black/40 pointer-events-none" />

        {/* Top Floating Controls */}
        <div className="absolute top-4 inset-x-5 z-20 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsFav(!isFav)}
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              isFav ? 'bg-[#FF8FC7] text-[#0B0F0C]' : 'bg-black/50 text-white'
            }`}
          >
            <Heart className="w-5 h-5" fill={isFav ? '#0B0F0C' : 'none'} />
          </button>
        </div>

        {/* Photo Carousel Pagination Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {gallery.map((_, i) => (
            <button
              key={i}
              onClick={() => setPhotoIndex(i)}
              className={`transition-all ${
                i === photoIndex ? 'w-6 h-1.5 rounded-full bg-[#C8FF2E]' : 'w-1.5 h-1.5 rounded-full bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-6">
        {/* 2. Venue Identity & Tags */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold text-[10px] uppercase tracking-wider">
              {venue.surface}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#1C241E] text-white text-[10px] font-semibold border border-white/10">
              {venue.isIndoor ? 'Indoor Facility' : 'Outdoor Grounds'}
            </span>
            <span className="flex items-center gap-1 text-xs text-[#C8FF2E] font-bold ml-auto">
              <Star className="w-3.5 h-3.5 fill-[#C8FF2E]" />
              {venue.rating} ({venue.reviewCount} reviews)
            </span>
          </div>

          <h1 className="font-display font-black text-2xl text-[#F4F7F0] leading-tight">
            {venue.name}
          </h1>
          <p className="flex items-center gap-1 text-xs text-[#A5B0A6] mt-1">
            <MapPin className="w-3.5 h-3.5 text-[#C8FF2E]" />
            {venue.address} • {venue.distanceMiles} miles from your location
          </p>
        </div>

        {/* 3. Opening Hours & Amenities */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-white/5">
            <div className="flex items-center gap-2 text-[#A5B0A6]">
              <Clock className="w-4 h-4 text-[#C8FF2E]" />
              <span>Opening Hours:</span>
            </div>
            <span className="font-bold text-[#F4F7F0]">07:00 – 22:30 Daily</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block mb-2">
              Facility Amenities
            </span>
            <div className="flex flex-wrap gap-1.5">
              {venue.amenities.map((am) => (
                <span
                  key={am}
                  className="px-2.5 py-1 rounded-full bg-[#1C241E] text-[11px] text-[#F4F7F0] border border-white/5 flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-[#C8FF2E]" />
                  {am}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 4. "Reserve Your Court" Glass Card (Ref C) */}
        <div className="p-5 rounded-3xl bg-[#141A15]/90 backdrop-blur-xl border border-white/10 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#A5B0A6] block">
                Standard Hourly Rate
              </span>
              <span className="font-display font-black text-2xl text-[#C8FF2E] tabular-nums">
                {APP_CONFIG.currency}{venue.pricePerHour}
              </span>
              <span className="text-xs text-[#A5B0A6]"> / 60 min session</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-[#3DDC84] bg-[#3DDC84]/15 px-2.5 py-1 rounded-full border border-[#3DDC84]/30">
                {venue.courtsCount} Courts Available
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="pill-arrow"
              onClick={onBookNow}
            >
              Reserve Court Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
