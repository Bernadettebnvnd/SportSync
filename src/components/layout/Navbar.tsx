'use client';
/* eslint-disable react-hooks/set-state-in-effect */

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
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme';
import { OwnerOnboardingModal } from '@/components/onboarding/OwnerOnboardingModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { SportSyncBrandLogo } from '@/components/ui/SportSyncBrandLogo';
import { APP_CONFIG } from '@/config/appConfig';

export function SportSyncLogo({ size = 32 }: { size?: number }) {
  return <SportSyncBrandLogo variant="wordmark" size={size} />;
}

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, logoutUser } = useMatchiStore();
  const { isLightMode, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sportsync_logged_out', 'true');
      const authKeys = [
        'sportsync_user_id',
        'matchi_user_id',
        'sportsync_user_email',
        'sportsync_user_role',
        'matchi_user_role',
        'sportsync_user_name',
        'matchi_user_name',
        'sportsync_user_nickname',
        'matchi_user_nickname',
        'sportsync_user_profile',
        'sideline_user_profile',
        'sportsync_auth_user',
        'sportsync_pending_onboarding',
        'sportsync_onboarding_completed',
        'matchi_onboarding_completed',
        'sportsync_facility_venue_id',
        'sportsync_notifications',
        'sportsync_sent_notifications',
        'sportsync-auth-token',
        'sb-access-token',
      ];
      authKeys.forEach((k) => localStorage.removeItem(k));
      const dynamicKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('sportsync_venue_id_') ||
            key.startsWith('sportsync_chat_') ||
            key.startsWith('sb-') ||
            key.startsWith('supabase.'))
        ) {
          dynamicKeys.push(key);
        }
      }
      dynamicKeys.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    }
    await logoutUser();
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    if (typeof window !== 'undefined') {
      window.location.href = '/?auth=signin';
    }
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isFacilityView = pathname.startsWith('/organizer');
  const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('sportsync_logged_out') === 'true';
  const storedRole = typeof window !== 'undefined' && !isLoggedOut ? localStorage.getItem('sportsync_user_role') : null;
  const storedUserId = typeof window !== 'undefined' && !isLoggedOut ? localStorage.getItem('sportsync_user_id') : null;
  const storedUserEmail = typeof window !== 'undefined' && !isLoggedOut ? localStorage.getItem('sportsync_user_email') : null;
  const storedUserName = typeof window !== 'undefined' && !isLoggedOut ? localStorage.getItem('sportsync_user_name') : null;
  const isAuthenticated = !isLoggedOut && (
    Boolean(currentUser.id && currentUser.id !== 'usr_guest_01' && currentUser.email) ||
    Boolean(storedUserId && storedUserId !== 'usr_guest_01') ||
    Boolean(storedUserEmail) ||
    Boolean(storedRole)
  );
  const resolvedDisplayName =
    currentUser.nickname ||
    (currentUser.full_name && !['Guest', 'Guest Player'].includes(currentUser.full_name) ? currentUser.full_name : '') ||
    (storedUserName && !['Guest', 'Guest Player'].includes(storedUserName) ? storedUserName : '') ||
    (currentUser.email ? currentUser.email.split('@')[0] : '') ||
    (storedUserEmail ? storedUserEmail.split('@')[0] : '') ||
    'Player';
  const isOnboarded = Boolean(currentUser.onboarding_completed || currentUser.has_completed_onboarding);
  const isOwnerOrAdmin =
    currentUser.role === 'venue_owner' ||
    currentUser.role === 'organizer' ||
    currentUser.role === 'admin' ||
    (currentUser.role as string) === 'facility_owner' ||
    storedRole === 'venue_owner' ||
    storedRole === 'facility_owner' ||
    storedRole === 'organizer';

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
            <Link href={isOwnerOrAdmin ? '/organizer' : '/'} className="flex items-center gap-2.5 select-none shrink-0 group">
              <SportSyncBrandLogo variant="wordmark" imgClassName="h-7 sm:h-8" />
              {isFacilityView && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1C241E] text-[#C8FF2E] px-2 py-0.5 rounded-md border border-[#C8FF2E]/30">
                  Facility Console
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {!isOwnerOrAdmin ? (
              <>
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

                <Link
                  href="/onboarding"
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                    pathname === '/onboarding'
                      ? 'bg-[#1C241E] text-[#C8FF2E] border border-[#C8FF2E]/20'
                      : 'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#141A15]'
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Profile Setup</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/organizer"
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                    pathname === '/organizer'
                      ? 'bg-[#1C241E] text-[#C8FF2E] border border-[#C8FF2E]/20'
                      : 'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#141A15]'
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/organizer?tab=games"
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                    'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#141A15]'
                  )}
                >
                  <span>Games</span>
                </Link>
                <Link
                  href="/organizer?tab=courts"
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                    'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#141A15]'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Courts</span>
                </Link>
                <Link
                  href="/organizer?tab=bookings"
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                    'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#141A15]'
                  )}
                >
                  <span>Bookings</span>
                </Link>
                <Link
                  href="/organizer?tab=payments"
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                    'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#141A15]'
                  )}
                >
                  <span>Payment Desk</span>
                </Link>
                <Link
                  href="/organizer?tab=profile"
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5',
                    'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-[#141A15]'
                  )}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </Link>
              </>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOwnerModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#0B0F0C] bg-[#C8FF2E] hover:bg-[#b8f022] transition-all press-scale flex items-center gap-1.5 shadow-[0_0_14px_rgba(200,255,46,0.25)] cursor-pointer"
                  title="Configure Facility & Courts Setup" 
                >
                  <Building2 className="w-3.5 h-3.5 text-[#0B0F0C]" />
                  <span>Facility Setup</span>
                </button>
                {/* Quick Log Out Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all press-scale flex items-center gap-1.5 cursor-pointer"
                  title="Log Out of Facility Account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>

                {/* Facility Profile Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-[#141A15] border border-white/10 hover:border-[#C8FF2E]/40 transition-all cursor-pointer shadow-sm"
                    title="Facility Account & Menu"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-black text-[10px]">
                      {currentUser.nickname?.[0] || currentUser.full_name?.[0] || 'F'}
                    </div>
                    <span className="hidden sm:inline text-xs font-bold text-[#F4F7F0] max-w-[120px] truncate">
                      {currentUser.nickname || currentUser.full_name || 'Facility Partner'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A5B0A6]" />
                  </button>

                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#141A15] border border-white/10 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-3 border-b border-white/5 space-y-1">
                        <div className="text-xs font-bold text-[#F4F7F0] truncate">
                          {currentUser.full_name || 'Facility Partner'}
                        </div>
                        <div className="text-[11px] text-[#A5B0A6] truncate">
                          {currentUser.email || 'facility@sportsync.ph'}
                        </div>
                        <div className="pt-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-[#C8FF2E] bg-[#C8FF2E]/10 border border-[#C8FF2E]/30 px-2 py-0.5 rounded-md inline-block">
                            Verified Facility
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/organizer?tab=profile"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/5 transition-colors"
                        >
                          <UserIcon className="w-4 h-4 text-[#C8FF2E]" />
                          <span>Facility Profile &amp; Account</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            setIsOwnerModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/5 transition-colors text-left"
                        >
                          <Building2 className="w-4 h-4 text-[#C8FF2E]" />
                          <span>Facility &amp; Courts Setup</span>
                        </button>
                      </div>

                      <div className="pt-1 border-t border-white/5">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-400" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {isOwnerOrAdmin && (
                  <Link
                    href="/organizer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#C8FF2E] bg-[#1C241E] border border-[#C8FF2E]/30 hover:bg-[#263028] transition-all"
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
                      {resolvedDisplayName[0]?.toUpperCase() || 'S'}
                    </div>
                    <span className="hidden sm:inline text-xs font-bold text-[#F4F7F0] max-w-[100px] truncate">
                      {resolvedDisplayName}
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
