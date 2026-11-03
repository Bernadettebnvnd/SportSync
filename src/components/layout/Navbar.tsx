'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMatchiStore } from '@/lib/store';
import {
  Compass,
  Calendar,
  Home,
  User as UserIcon,
  Building2,
  Sparkles,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme';
import { OwnerOnboardingModal } from '@/components/onboarding/OwnerOnboardingModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { APP_CONFIG } from '@/config/appConfig';

export function SportSyncLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-xs sm:text-sm shadow-[0_0_14px_rgba(200,255,46,0.35)] shrink-0 select-none"
    >
      SS
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { currentUser } = useMatchiStore();
  const { isLightMode, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isFacilityView = pathname.startsWith('/organizer');
  const isAuthenticated = Boolean(currentUser.id && currentUser.email);
  const isOnboarded = Boolean(currentUser.onboarding_completed || currentUser.has_completed_onboarding);
  const isOwnerOrAdmin = currentUser.role === 'venue_owner' || currentUser.role === 'organizer' || currentUser.role === 'admin';

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const authParam = searchParams.get('auth');
      if (authParam === 'signin' || authParam === 'signup') {
        setAuthModalMode(authParam);
        setIsAuthModalOpen(true);
      }
    }
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#0B0F0C]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* SportSync Brand Logo & Context */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 select-none shrink-0 group">
              <SportSyncLogo size={32} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-[#F4F7F0] font-display leading-none">
                    {APP_CONFIG.appName}
                  </span>
                  {isFacilityView && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1C241E] text-[#C8FF2E] px-2 py-0.5 rounded-md border border-[#C8FF2E]/30">
                      Facility Console
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#A5B0A6] hidden sm:block mt-0.5">
                  {APP_CONFIG.tagline}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                pathname === '/'
                  ? 'bg-[#1C241E] text-[#C8FF2E] border border-[#C8FF2E]/20'
                  : 'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#141A15]'
              )}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Player App</span>
            </Link>

            <Link
              href="/explore"
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                pathname === '/explore'
                  ? 'bg-[#1C241E] text-[#C8FF2E] border border-[#C8FF2E]/20'
                  : 'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#141A15]'
              )}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Find Courts</span>
            </Link>

            {isOwnerOrAdmin && (
              <Link
                href="/organizer"
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                  isFacilityView
                    ? 'bg-[#1C241E] text-[#C8FF2E] border border-[#C8FF2E]/20'
                    : 'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#141A15]'
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Facility Portal</span>
              </Link>
            )}
          </nav>

          {/* Right Side Controls */}
          <div className="flex items-center gap-2">
            {/* Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-xl bg-[#1C241E] text-[#A5B0A6] hover:text-[#F4F7F0] flex items-center justify-center transition-colors press-scale border border-white/5"
              aria-label={mounted && isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              title={mounted && isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              suppressHydrationWarning
            >
              {!mounted ? (
                <span className="w-3.5 h-3.5 rounded-full bg-white/10" />
              ) : isLightMode ? (
                <Moon className="w-3.5 h-3.5 text-[#0F1612]" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-[#C8FF2E]" />
              )}
            </button>

            {isFacilityView ? (
              <Link
                href="/"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#0B0F0C] bg-[#C8FF2E] hover:bg-[#d4ff52] transition-all press-scale shadow-sm"
              >
                Back to Player App
              </Link>
            ) : (
              <>
                {isOwnerOrAdmin && (
                  <Link
                    href="/organizer"
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#C8FF2E] bg-[#1C241E] border border-[#C8FF2E]/30 hover:bg-[#263028] transition-all"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Facility Mode</span>
                  </Link>
                )}

                {!isAuthenticated ? (
                  // Quick Auth CTAs
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalMode('signin');
                        setIsAuthModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#F4F7F0] hover:bg-[#1C241E] transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalMode('signup');
                        setIsAuthModalOpen(true);
                      }}
                      className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#C8FF2E] hover:bg-[#d4ff52] text-[#0B0F0C] text-xs font-bold transition-all shadow-sm shrink-0"
                    >
                      <span>Join<span className="hidden sm:inline"> SportSync</span></span>
                    </button>
                  </div>
                ) : (
                  // Authenticated User Pill
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalMode('signin');
                      setIsAuthModalOpen(true);
                    }}
                    className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-[#141A15] border border-white/10 hover:border-[#C8FF2E]/40 transition-all cursor-pointer shadow-sm"
                    title="Account & Authentication Session"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-black text-[10px]">
                      {currentUser.nickname?.[0] || currentUser.full_name?.[0] || 'S'}
                    </div>
                    <span className="hidden sm:inline text-xs font-bold text-[#F4F7F0] max-w-[100px] truncate">
                      {currentUser.nickname || currentUser.full_name || 'Player'}
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Facility Owner Onboarding Modal */}
      <OwnerOnboardingModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
      />

      {/* Unified Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </>
  );
}
