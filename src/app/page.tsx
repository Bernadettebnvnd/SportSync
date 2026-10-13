'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MobileApp, ScreenId } from '@/MobileApp';
import { APP_CONFIG } from '@/config/appConfig';
import { Sparkles, Layers, Menu, X, Compass } from 'lucide-react';
import '@/design-system/index.css';

const screenOptions: Array<{ id: ScreenId; label: string; group: string }> = [
  // Onboarding
  { id: 'splash', label: '1. Splash Screen', group: 'Onboarding' },
  { id: 'carousel', label: '2. 3-Slide Carousel', group: 'Onboarding' },
  { id: 'auth', label: '3. Sign In / Auth', group: 'Onboarding' },
  { id: 'personalization', label: '4. Personalization', group: 'Onboarding' },

  // Home
  { id: 'home', label: '5. Home / Discover', group: 'Home' },

  // Live & Scores
  { id: 'scores', label: '6. Scores Hub', group: 'Scores' },
  { id: 'match-center', label: '7. Match Center', group: 'Scores' },
  { id: 'live-video', label: '8. Live Video Stream', group: 'Scores' },
  { id: 'standings', label: '9. Standings & Tables', group: 'Scores' },
  { id: 'team-profile', label: '10. Team & Player Profile', group: 'Scores' },

  // Community
  { id: 'social-home', label: '11. Social Hub (Ref B)', group: 'Community' },
  { id: 'create-match', label: '12. Create Match Wizard', group: 'Community' },
  { id: 'find-games', label: '13. Find Pickup Games', group: 'Community' },
  { id: 'match-detail', label: '14. Match Detail', group: 'Community' },
  { id: 'match-chat', label: '15. Match Group Chat', group: 'Community' },
  { id: 'post-match', label: '16. Post-Match & Story', group: 'Community' },

  // Venues
  { id: 'venues-list', label: '17. Venues List (Ref C)', group: 'Venues' },
  { id: 'venue-detail', label: '18. Venue Detail', group: 'Venues' },
  { id: 'booking-flow', label: '19. Booking Flow', group: 'Venues' },
  { id: 'payment', label: '20. Payment Checkout', group: 'Venues' },
  { id: 'booking-confirmation', label: '21. Digital QR Ticket', group: 'Venues' },
  { id: 'my-bookings', label: '22. My Reservations', group: 'Venues' },

  // Profile & Utility
  { id: 'profile', label: '23. Player Profile (Ref B)', group: 'Profile' },
  { id: 'leaderboard', label: '24. Podium Leaderboard', group: 'Profile' },
  { id: 'notifications', label: '25. Notifications', group: 'Profile' },
  { id: 'search', label: '26. Global Search', group: 'Profile' },
  { id: 'settings', label: '27. Settings & Dark/Light', group: 'Profile' },
  { id: 'system-states', label: '28. System States', group: 'Profile' },
];

export default function RootHomePage() {
  const [selectedScreen, setSelectedScreen] = useState<ScreenId>('home');
  const [showScreenDrawer, setShowScreenDrawer] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F0C] via-[#0E1A13] to-[#070A08] text-[#F4F7F0] flex flex-col items-center justify-between p-3 sm:p-6 lg:p-8 select-none">
      {/* Top Navbar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-2 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-base shadow-[0_0_16px_rgba(200,255,46,0.3)]">
            {APP_CONFIG.appName.slice(0, 2)}
          </div>
          <div>
            <h1 className="font-display font-black text-lg text-[#F4F7F0] leading-none">
              {APP_CONFIG.appName}
            </h1>
            <span className="text-[10px] text-[#A5B0A6]">
              Mobile Experience (390×844)
            </span>
          </div>
        </div>

        {/* Quick Route Switches */}
        <div className="flex items-center gap-2">
          {/* Screen Jumper Dropdown Trigger */}
          <button
            onClick={() => setShowScreenDrawer(!showScreenDrawer)}
            className="h-10 px-3.5 rounded-full bg-[#1C241E] hover:bg-[#263028] border border-white/10 text-xs font-semibold text-[#C8FF2E] flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">Jump Screen (28)</span>
          </button>

          <Link
            href="/showcase"
            className="h-10 px-4 rounded-full bg-[#1C241E] hover:bg-[#263028] border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#FF8FC7]" />
            <span className="hidden sm:inline">Showcase Canvas</span>
          </Link>

          <Link
            href="/styleguide"
            className="h-10 px-4 rounded-full bg-[#1C241E] hover:bg-[#263028] border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
          >
            <Layers className="w-4 h-4 text-[#C8FF2E]" />
            <span className="hidden sm:inline">Styleguide</span>
          </Link>

          <Link
            href="/explore"
            className="h-10 px-3.5 rounded-full bg-[#141A15] hover:bg-[#1C241E] border border-white/10 text-xs text-[#A5B0A6] hover:text-white flex items-center gap-1.5 transition-all"
            title="Browse Web Portal"
          >
            <Compass className="w-4 h-4" />
            <span className="hidden md:inline">Web Portal</span>
          </Link>
        </div>
      </header>

      {/* Center Phone Chassis Canvas */}
      <main className="relative my-auto flex flex-col items-center justify-center w-full">
        <MobileApp initialScreen={selectedScreen} inPhoneFrame={true} />
      </main>

      {/* Screen Jumper Drawer Modal */}
      {showScreenDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg max-h-[85vh] rounded-3xl bg-[#141A15] border border-white/10 p-5 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <h3 className="font-display font-bold text-base text-[#F4F7F0]">
                Jump to any of 28 Prototype Screens
              </h3>
              <button
                onClick={() => setShowScreenDrawer(false)}
                className="w-8 h-8 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto no-scrollbar py-3 space-y-4 flex-1">
              {['Onboarding', 'Home', 'Scores', 'Community', 'Venues', 'Profile'].map((group) => (
                <div key={group}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8FF2E] block mb-1.5">
                    {group} Flow
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {screenOptions
                      .filter((s) => s.group === group)
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setSelectedScreen(s.id);
                            setShowScreenDrawer(false);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition-all truncate ${
                            selectedScreen === s.id
                              ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-bold'
                              : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:text-white hover:border-white/20'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="w-full max-w-5xl py-4 mt-4 sm:mt-6 text-center text-xs text-[#A5B0A6] flex flex-wrap items-center justify-between border-t border-white/5 gap-2">
        <span>Active Screen: <strong className="text-[#C8FF2E]">{selectedScreen}</strong></span>
        <span>Tap buttons inside phone frame to navigate freely • Fully interactive</span>
      </footer>
    </div>
  );
}
