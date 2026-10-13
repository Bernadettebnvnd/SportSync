import React, { useState } from 'react';
import { Link } from 'lucide-react';
import { MobileApp, ScreenId } from '../MobileApp';
import { APP_CONFIG } from '../config/appConfig';
import { Sparkles, Trophy, Smartphone, ArrowRight, Layers, Eye } from 'lucide-react';

export const ShowcasePage: React.FC = () => {
  const [activeFlow, setActiveFlow] = useState<string>('all');

  const flows = [
    {
      id: 'onboarding',
      title: '01 • Onboarding & Personalization Flow',
      subtitle: 'Ref B poster art meets Ref C glass cards with tailored sport preference engine',
      screens: [
        { id: 'splash' as ScreenId, name: '01. Splash Gateway' },
        { id: 'carousel' as ScreenId, name: '02. 3-Step Value Carousel' },
        { id: 'auth' as ScreenId, name: '03. Sign In & Social Auth' },
        { id: 'personalization' as ScreenId, name: '04. Multi-Sport & Skill Setup' },
      ],
    },
    {
      id: 'home',
      title: '02 • Home & Discover Hub',
      subtitle: 'Editorial Sora/Serif typography with solid lime notch card & tucking match row',
      screens: [
        { id: 'home' as ScreenId, name: '05. Discover Feed & Notch Hero' },
        { id: 'notifications' as ScreenId, name: '25. Notifications Center' },
        { id: 'search' as ScreenId, name: '26. Global Multi-Category Search' },
      ],
    },
    {
      id: 'scores',
      title: '03 • Live Scores & Tactical Match Center',
      subtitle: 'Ref A floodlight dark foundation, real-time momentum curve, lineups, and stream',
      screens: [
        { id: 'scores' as ScreenId, name: '06. Live Scores Date Strip' },
        { id: 'match-center' as ScreenId, name: '07. Tactical Match Center' },
        { id: 'live-video' as ScreenId, name: '08. Live Broadcast & Fan Predict' },
        { id: 'standings' as ScreenId, name: '09. Standings & Golden Boot' },
        { id: 'team-profile' as ScreenId, name: '10. Club Profile & Radar Chart' },
      ],
    },
    {
      id: 'community',
      title: '04 • Community Pickup Games (Ref B Energy)',
      subtitle: 'Lime & Pink big action banners, 4-step wizard with confetti, and live group chat',
      screens: [
        { id: 'social-home' as ScreenId, name: '11. Social Hub & Action Tiles' },
        { id: 'create-match' as ScreenId, name: '12. 4-Step Match Wizard' },
        { id: 'find-games' as ScreenId, name: '13. Find Games Map & List' },
        { id: 'match-detail' as ScreenId, name: '14. Match Detail & Roster' },
        { id: 'match-chat' as ScreenId, name: '15. Group Chat & Live Poll' },
        { id: 'post-match' as ScreenId, name: '16. Post-Match MVP & Story' },
      ],
    },
    {
      id: 'venues',
      title: '05 • Venues & Court Reservation (Ref C Energy)',
      subtitle: 'Light-surface venue cards on dark canvas, circular date chips, and perforated QR pass',
      screens: [
        { id: 'venues-list' as ScreenId, name: '17. Light Venue Cards List' },
        { id: 'venue-detail' as ScreenId, name: '18. Court Venue Specs' },
        { id: 'booking-flow' as ScreenId, name: '19. Date & Slot Reservation' },
        { id: 'payment' as ScreenId, name: '20. One-Touch Checkout' },
        { id: 'booking-confirmation' as ScreenId, name: '21. Digital Ticket QR Pass' },
        { id: 'my-bookings' as ScreenId, name: '22. Active & Past Bookings' },
      ],
    },
    {
      id: 'profile',
      title: '06 • Player Profile, Podium & System States',
      subtitle: 'Ref B Playmaker level, XP ring, 3-tier podium, dark/light theme, and skeletons',
      screens: [
        { id: 'profile' as ScreenId, name: '23. Playmaker Profile & Stats' },
        { id: 'leaderboard' as ScreenId, name: '24. 3-Tier Friends Podium' },
        { id: 'settings' as ScreenId, name: '27. Settings & Dark/Light Theme' },
        { id: 'system-states' as ScreenId, name: '28. Empty State & Skeletons' },
      ],
    },
  ];

  const filteredFlows = activeFlow === 'all' ? flows : flows.filter((f) => f.id === activeFlow);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#090D0A] via-[#0F1E16] to-[#070A08] text-[#F4F7F0] overflow-x-hidden selection:bg-[#C8FF2E] selection:text-[#0B0F0C]">
      {/* Top Dribbble Presentation Bar */}
      <header className="px-6 lg:px-16 py-8 border-b border-white/10 backdrop-blur-md bg-black/40 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8FF2E] shadow-[0_0_12px_#C8FF2E]" />
            <span className="font-display font-black text-xs text-[#C8FF2E] uppercase tracking-widest">
              Dribbble & Behance Master Showcase
            </span>
          </div>
          <h1 className="font-display font-black text-3xl text-white tracking-tight">
            {APP_CONFIG.appName} <span className="font-editorial text-4xl text-[#C8FF2E] font-normal">Mobile Prototype</span>
          </h1>
          <p className="text-xs text-[#A5B0A6] mt-0.5">
            28 Interactive Screens • Live 390×844 Hardware Frames • Complete Design System
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/styleguide"
            className="h-10 px-4 rounded-full bg-[#1C241E] hover:bg-[#263028] border border-white/10 text-xs font-semibold text-[#F4F7F0] flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-4 h-4 text-[#C8FF2E]" />
            <span>Design Tokens & Styleguide</span>
          </a>

          <a
            href="/"
            className="h-10 px-5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(200,255,46,0.3)] transition-all hover:bg-[#bbee26]"
          >
            <Smartphone className="w-4 h-4 stroke-[2.5]" />
            <span>Single Screen Mode</span>
          </a>
        </div>
      </header>

      {/* Filter Chips by Flow */}
      <div className="px-6 lg:px-16 py-4 border-b border-white/5 bg-black/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveFlow('all')}
          className={`h-9 px-4 rounded-full text-xs font-bold shrink-0 transition-all border ${
            activeFlow === 'all'
              ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
              : 'bg-[#141A15] text-[#A5B0A6] border-white/5 hover:text-white'
          }`}
        >
          All 28 Screens (Complete Canvas)
        </button>
        {flows.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFlow(f.id)}
            className={`h-9 px-4 rounded-full text-xs font-semibold shrink-0 transition-all border ${
              activeFlow === f.id
                ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
                : 'bg-[#141A15] text-[#A5B0A6] border-white/5 hover:text-white'
            }`}
          >
            {f.title.split('•')[1]}
          </button>
        ))}
      </div>

      {/* Main Flow Canvas */}
      <main className="px-6 lg:px-16 py-12 space-y-24">
        {filteredFlows.map((flow) => (
          <section key={flow.id} className="space-y-8">
            {/* Flow Header */}
            <div className="max-w-2xl">
              <span className="font-display font-bold text-xs uppercase tracking-widest text-[#C8FF2E]">
                {flow.title}
              </span>
              <h2 className="font-display font-black text-2xl lg:text-3xl text-[#F4F7F0] mt-1">
                {flow.title.split('•')[1]}
              </h2>
              <p className="text-sm text-[#A5B0A6] mt-1 leading-relaxed">
                {flow.subtitle}
              </p>
            </div>

            {/* Presentation Showcase Row with Faded Ghost Phones (Ref C Presentation Trick) */}
            <div className="relative">
              {/* Top Faded Ghost Reflection Row */}
              <div className="flex items-center gap-8 overflow-hidden opacity-20 filter blur-sm scale-95 pointer-events-none -mb-28 z-0">
                {flow.screens.map((scr, idx) => (
                  <div key={`ghost-top-${idx}`} className="w-[390px] shrink-0">
                    <MobileApp initialScreen={scr.id} inPhoneFrame={true} />
                  </div>
                ))}
              </div>

              {/* HERO INTERACTIVE PHONE ROW */}
              <div className="relative z-10 flex items-start gap-8 overflow-x-auto no-scrollbar py-6 px-2">
                {flow.screens.map((scr) => (
                  <div key={scr.id} className="flex flex-col items-center shrink-0">
                    {/* Screen Title Pill */}
                    <div className="mb-4 px-3.5 py-1 rounded-full bg-[#141A15] border border-white/10 text-xs font-display font-bold text-[#C8FF2E] shadow-md flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF2E]" />
                      <span>{scr.name}</span>
                    </div>

                    {/* Live Interactive Phone Frame */}
                    <MobileApp initialScreen={scr.id} inPhoneFrame={true} />
                  </div>
                ))}
              </div>

              {/* Bottom Faded Ghost Reflection Row */}
              <div className="flex items-center gap-8 overflow-hidden opacity-20 filter blur-sm scale-95 pointer-events-none -mt-28 z-0">
                {flow.screens.map((scr, idx) => (
                  <div key={`ghost-bottom-${idx}`} className="w-[390px] shrink-0">
                    <MobileApp initialScreen={scr.id} inPhoneFrame={true} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>

      {/* Showcase Footer */}
      <footer className="px-6 lg:px-16 py-12 border-t border-white/10 bg-black/40 text-center text-xs text-[#A5B0A6] space-y-2">
        <p className="font-display font-bold text-sm text-[#F4F7F0]">
          {APP_CONFIG.appName} Mobile Product Architecture
        </p>
        <p>
          Crafted for high-fidelity interactive demonstration. Rename configured via single constant in <code className="text-[#C8FF2E]">src/config/appConfig.ts</code>.
        </p>
      </footer>
    </div>
  );
};
