import React, { useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { StadiumScene, ClayPitchScene, TennisAerialScene } from '../../illustrations/Scenes';

interface CarouselScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const CarouselScreen: React.FC<CarouselScreenProps> = ({ onComplete, onSkip }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Never miss a moment',
      subtitle: 'Real-time scores, momentum graphs, line-ups, and interactive streams under floodlights.',
      badge: 'Live Sports',
      scene: StadiumScene,
      bgImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Make the game happen',
      subtitle: 'Organize pickup games in seconds. Rally your crew, split pitch costs, and play more.',
      badge: 'Community',
      scene: ClayPitchScene,
      bgImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Book your court',
      subtitle: 'Discover pristine clay, grass, and turf pitches nearby. Instant reservation & digital entry passes.',
      badge: 'Venues',
      scene: TennisAerialScene,
      bgImage: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const slide = slides[currentSlide];
  const SceneComponent = slide.scene;

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#0B0F0C] select-none">
      {/* Background Graphic with gradient overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={slide.bgImage}
          alt={slide.title}
          className="w-full h-full object-cover filter brightness-50 transition-all duration-500 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C] via-[#0B0F0C]/60 to-black/40" />
      </div>

      {/* Top Bar with Skip Link */}
      <div className="relative z-10 pt-8 px-6 flex items-center justify-between">
        <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#C8FF2E] text-xs font-display font-bold uppercase tracking-wider border border-white/10">
          {slide.badge}
        </span>
        <button
          onClick={onSkip}
          className="text-xs font-semibold text-[#A5B0A6] hover:text-white px-3 py-1 rounded-full bg-black/40 backdrop-blur-md transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Center Illustration Scene Showcase */}
      <div className="relative z-10 px-6 my-auto">
        <div className="rounded-3xl overflow-hidden border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
          <SceneComponent className="w-full h-44" />
        </div>
      </div>

      {/* Bottom Frosted Glass Card (Ref C) */}
      <div className="relative z-10 m-4 p-6 rounded-[28px] bg-[#141A15]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        <h2 className="font-display font-black text-2xl text-[#F4F7F0] tracking-tight mb-2">
          {slide.title}
        </h2>
        <p className="text-xs text-[#A5B0A6] leading-relaxed mb-6">
          {slide.subtitle}
        </p>

        {/* Bottom Navigation Row: Pagination Dots + Round Lime Next Button (Ref C) */}
        <div className="flex items-center justify-between">
          {/* Pagination Dots */}
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`transition-all duration-200 ${
                  idx === currentSlide
                    ? 'w-7 h-2 rounded-full bg-[#C8FF2E]'
                    : 'w-2 h-2 rounded-full bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Round Lime Next Button */}
          <button
            onClick={handleNext}
            aria-label="Next onboarding slide"
            className="w-14 h-14 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center shadow-[0_0_24px_rgba(200,255,46,0.35)] transition-all press-scale hover:bg-[#bbee26]"
          >
            <ArrowRight className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
