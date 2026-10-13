import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  Heart,
  MapPin,
  Clock,
  ShieldCheck,
  Share2,
  Check,
  ArrowRight,
  Sparkles,
  Phone,
  Calendar,
  Layers,
  CircleDot,
} from 'lucide-react';
import { Venue } from '../../mock/types';
import { Button } from '../../design-system/components/Button';
import { APP_CONFIG } from '../../config/appConfig';
import { SportIcon } from '../../illustrations/SportIcons';

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
  const [selectedSlot, setSelectedSlot] = useState<string>(venue.availableSlots?.[0] || '10:00');

  const gallery = [
    venue.image,
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
  ];

  const hasSlots = venue.availableSlots && venue.availableSlots.length > 0;
  const opHours = venue.operatingHours || '06:00 AM – 11:00 PM Daily';
  const phoneContact = venue.phone || '0917-888-SYNC';

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] pb-32 select-none min-h-screen">
      {/* 1. Photo Carousel with Parallax Feel & Gradient Overlay */}
      <div className="relative w-full h-72 overflow-hidden bg-[#1C241E]">
        <img
          src={gallery[photoIndex]}
          alt={venue.name}
          className="w-full h-full object-cover transition-all duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C] via-transparent to-black/50 pointer-events-none" />

        {/* Top Floating Controls */}
        <div className="absolute top-4 inset-x-5 z-20 flex items-center justify-between">
          <button
            onClick={onBack}
            aria-label="Back to court list"
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 press-scale"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsFav(!isFav)}
            aria-label={isFav ? 'Remove favorite' : 'Add favorite'}
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all press-scale ${
              isFav ? 'bg-[#FF8FC7] text-[#0B0F0C]' : 'bg-black/50 text-white hover:bg-black/70'
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
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold text-[10px] uppercase tracking-wider">
              <SportIcon sport={venue.sport} size={11} color="#0B0F0C" />
              {venue.sport}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1C241E] text-white text-[10px] font-semibold border border-white/10">
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

          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-2xl text-[#F4F7F0] leading-tight">
              {venue.name}
            </h1>
            {venue.isVerified && (
              <span title="Verified Facility" className="text-[#00E599]">
                <ShieldCheck className="w-5 h-5 fill-[#00E599] text-[#0B0F0C]" />
              </span>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-[#A5B0A6] mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#C8FF2E] shrink-0" />
            <span>{venue.address}</span>
            <span>•</span>
            <span className="text-[#F4F7F0]">{venue.city}</span>
          </p>
        </div>

        {/* 3. Availability Status Ribbon */}
        <div className="p-3.5 rounded-2xl bg-[#141A15] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full ${
                hasSlots ? 'bg-[#00E599] animate-pulse' : 'bg-slate-500'
              }`}
            />
            <div>
              <h4 className="text-xs font-bold text-[#F4F7F0]">
                {hasSlots ? 'Live Availability: Slots Open Today' : 'Contact Facility for Schedule'}
              </h4>
              <p className="text-[10px] text-[#A5B0A6]">
                {hasSlots ? 'Instant court booking supported' : 'Manual desk verification'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#C8FF2E]/10 text-[#C8FF2E] text-[10px] font-bold border border-[#C8FF2E]/20">
            {hasSlots ? 'Instant Book' : 'Call Desk'}
          </span>
        </div>

        {/* 4. Registered Playing Areas / Courts (Supabase Relational Data) */}
        {venue.courts && venue.courts.length > 0 && (
          <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C8FF2E]" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#F4F7F0]">
                  Registered Courts ({venue.courts.length})
                </h3>
              </div>
              <span className="text-[10px] text-[#A5B0A6]">Supabase Records</span>
            </div>

            <div className="space-y-2">
              {venue.courts.map((court: any) => (
                <div
                  key={court.id}
                  className="p-3 rounded-2xl bg-[#1C241E] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-display font-bold text-[#F4F7F0] block">
                      {court.name}
                    </span>
                    <span className="text-[10px] text-[#A5B0A6] block mt-0.5">
                      {court.floor_type || 'Tournament Surface'} • {court.is_indoor ? 'Indoor' : 'Outdoor'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-black text-[#C8FF2E] block">
                      {APP_CONFIG.currency}
                      {court.hourly_rate_cents ? Math.round(court.hourly_rate_cents / 100) : venue.pricePerHour}
                      <span className="text-[10px] text-[#A5B0A6]">/hr</span>
                    </span>
                    <span className="text-[10px] text-[#00E599] font-medium">Available</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Available Schedule Slots */}
        {hasSlots && (
          <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#A5B0A6] tracking-wider block">
                Available Time Slots Today
              </span>
              <span className="text-[10px] text-[#C8FF2E] font-semibold">60 min sessions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {venue.availableSlots.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all border press-scale ${
                      isSelected
                        ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] shadow-sm'
                        : 'bg-[#1C241E] text-[#F4F7F0] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Opening Hours, Contact & Amenities */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-white/5">
            <div className="flex items-center gap-2 text-[#A5B0A6]">
              <Clock className="w-4 h-4 text-[#C8FF2E]" />
              <span>Operating Hours:</span>
            </div>
            <span className="font-bold text-[#F4F7F0] text-right">{opHours}</span>
          </div>

          <div className="flex items-center justify-between text-xs pb-3 border-b border-white/5">
            <div className="flex items-center gap-2 text-[#A5B0A6]">
              <Phone className="w-4 h-4 text-[#C8FF2E]" />
              <span>Direct Desk Line:</span>
            </div>
            <a
              href={`tel:${phoneContact}`}
              className="font-bold text-[#C8FF2E] hover:underline"
            >
              {phoneContact}
            </a>
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

        {/* 7. "Reserve Your Court" Glass Card */}
        <div className="p-5 rounded-3xl bg-[#141A15]/95 backdrop-blur-xl border border-white/10 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#A5B0A6] block">
                Standard Verified Rate
              </span>
              <span className="font-display font-black text-2xl text-[#C8FF2E] tabular-nums">
                {APP_CONFIG.currency}{venue.pricePerHour}
              </span>
              <span className="text-xs text-[#A5B0A6]"> / 60 min session</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-[#00E599] bg-[#00E599]/15 px-2.5 py-1 rounded-full border border-[#00E599]/30">
                {venue.courtsCount} {venue.courtsCount === 1 ? 'Court' : 'Courts'} Available
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
