'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MobileApp, ScreenId } from '@/MobileApp';
import { APP_CONFIG } from '@/config/appConfig';
import { Sparkles, Layers, Menu, X, Compass, Building2, Smartphone, Monitor } from 'lucide-react';
import '@/design-system/index.css';

export default function RootHomePage() {
  const [selectedScreen, setSelectedScreen] = useState<ScreenId>('home');
  const [useDeviceChassis, setUseDeviceChassis] = useState(false);
  const [showScreenDrawer, setShowScreenDrawer] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0F0C] text-[#F4F7F0] flex flex-col items-center justify-between select-none">
      {/* Adaptive Desktop Header (Hidden on small mobile screens to keep edge-to-edge native feel) */}
      <header className="hidden md:block w-full border-b border-white/5 bg-[#0B0F0C]/90 backdrop-blur-xl sticky top-0 z-50 px-4 sm:px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-base shadow-[0_0_16px_rgba(200,255,46,0.3)]">
              {APP_CONFIG.appName.slice(0, 2)}
            </div>
            <div>
              <h1 className="font-display font-black text-lg text-[#F4F7F0] leading-none">
                {APP_CONFIG.appName}
              </h1>
              <span className="text-[10px] text-[#A5B0A6]">
                {APP_CONFIG.tagline}
              </span>
            </div>
          </div>

          {/* Quick Route Switches & Portals */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Adaptive View vs Phone Frame */}
            <button
              type="button"
              onClick={() => setUseDeviceChassis(!useDeviceChassis)}
              className="hidden md:flex h-9 px-3 rounded-full bg-[#141A15] hover:bg-[#1C241E] border border-white/10 text-xs text-[#A5B0A6] hover:text-white items-center gap-1.5 transition-all"
              title="Toggle Device Frame"
            >
              {useDeviceChassis ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-[#C8FF2E]" />
                  <span>Adaptive View</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-[#C8FF2E]" />
                  <span>Phone Frame</span>
                </>
              )}
            </button>

            {/* Facility Portal Link */}
            <Link
              href="/organizer"
              className="h-9 px-3.5 rounded-full bg-[#1C241E] hover:bg-[#263028] border border-[#C8FF2E]/30 text-xs font-semibold text-[#C8FF2E] flex items-center gap-1.5 transition-all shadow-sm"
              title="Facility Owner Portal"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Facility Portal</span>
            </Link>

            <Link
              href="/explore"
              className="h-9 px-3 rounded-full bg-[#141A15] hover:bg-[#1C241E] border border-white/10 text-xs text-[#A5B0A6] hover:text-white flex items-center gap-1.5 transition-all"
              title="Browse Facilities"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Venues</span>
            </Link>

            {/* Screen Jumper for QA / Navigation */}
            <button
              type="button"
              onClick={() => setShowScreenDrawer(!showScreenDrawer)}
              className="h-9 px-3 rounded-full bg-[#141A15] hover:bg-[#1C241E] border border-white/10 text-xs text-[#A5B0A6] hover:text-white flex items-center gap-1.5 transition-all"
              title="Quick Screen Navigator"
            >
              <Menu className="w-4 h-4 text-[#C8FF2E]" />
              <span className="hidden lg:inline">Screens</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="w-full flex-1 flex flex-col items-center justify-center">
        {useDeviceChassis ? (
          <div className="py-6 sm:py-8">
            <MobileApp initialScreen={selectedScreen} inPhoneFrame={true} />
          </div>
        ) : (
          <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-h-[calc(100vh-57px)] bg-[#0B0F0C] sm:border-x sm:border-white/5 relative flex flex-col shadow-2xl">
            <MobileApp initialScreen={selectedScreen} inPhoneFrame={false} />
          </div>
        )}
      </main>

      {/* Screen Jumper Drawer Modal for QA verification */}
      {showScreenDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg max-h-[85vh] rounded-3xl bg-[#141A15] border border-white/10 p-5 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <h3 className="font-display font-bold text-base text-[#F4F7F0]">
                SportSync Screen Navigator
              </h3>
              <button
                type="button"
                onClick={() => setShowScreenDrawer(false)}
                className="w-8 h-8 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto no-scrollbar py-3 space-y-4 flex-1">
              {[
                {
                  group: 'Onboarding & Auth',
                  screens: [
                    { id: 'splash', label: '1. Splash Screen' },
                    { id: 'carousel', label: '2. Value Props' },
                    { id: 'auth', label: '3. Authentication & Role' },
                    { id: 'personalization', label: '4. Player Preferences' },
                  ],
                },
                {
                  group: 'Discovery & Home',
                  screens: [{ id: 'home', label: '5. Home / Discover' }],
                },
                {
                  group: 'Play & Matchmaking',
                  screens: [
                    { id: 'social-home', label: '6. Play / Sync Feed' },
                    { id: 'create-match', label: '7. Create Match Wizard' },
                    { id: 'find-games', label: '8. Discover Pickups' },
                    { id: 'match-detail', label: '9. Roster Details' },
                    { id: 'match-chat', label: '10. Match Group Chat' },
                  ],
                },
                {
                  group: 'Scores & Results',
                  screens: [
                    { id: 'scores', label: '11. Scores Hub' },
                    { id: 'match-center', label: '12. Match Center' },
                  ],
                },
                {
                  group: 'Venues & Facility',
                  screens: [
                    { id: 'venues-list', label: '13. Venues & Courts' },
                    { id: 'venue-detail', label: '14. Venue Detail' },
                    { id: 'booking-flow', label: '15. Reserve Court' },
                    { id: 'my-bookings', label: '16. My Bookings' },
                  ],
                },
                {
                  group: 'Profile & Settings',
                  screens: [
                    { id: 'profile', label: '17. Player Profile' },
                    { id: 'leaderboard', label: '18. Achievements' },
                    { id: 'notifications', label: '19. Notifications' },
                    { id: 'settings', label: '20. Settings' },
                  ],
                },
              ].map((section) => (
                <div key={section.group}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8FF2E] block mb-1.5">
                    {section.group}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {section.screens.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedScreen(s.id as ScreenId);
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
    </div>
  );
}
