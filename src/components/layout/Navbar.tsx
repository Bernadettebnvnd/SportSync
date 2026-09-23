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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OwnerOnboardingModal } from '@/components/onboarding/OwnerOnboardingModal';
import { AuthModal } from '@/components/auth/AuthModal';

export function MatchiLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-sm transition-transform hover:scale-105 shrink-0"
    >
      <rect x="2" y="2" width="40" height="40" rx="12" fill="#1E4A32" />
      <rect x="3" y="3" width="38" height="38" rx="11" stroke="#E9C46A" strokeWidth="1.5" strokeOpacity="0.4" />
      <path
        d="M6 34 C12 28, 16 38, 24 30 C30 24, 34 32, 38 22"
        stroke="#2D724E"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M12 30 L16 14 L22 23 L28 14 L32 30"
        stroke="#E9C46A"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="12" r="3.2" fill="#C87D43" />
      <circle cx="22" cy="12" r="1.4" fill="#FAF8F5" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { currentUser } = useMatchiStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  const isFacilityView = pathname.startsWith('/organizer');
  const isAuthenticated = Boolean(currentUser.id && currentUser.email);
  const isOnboarded = Boolean(currentUser.onboarding_completed || currentUser.has_completed_onboarding);
  const isOwnerOrAdmin = currentUser.role === 'venue_owner' || currentUser.role === 'organizer' || currentUser.role === 'admin';

  const playerNavLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Find a Court', icon: Compass },
    { href: '/bookings', label: 'Bookings', icon: Calendar },
    { href: '/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#E8E5DF] bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
          {/* Brand Logo & Context */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 select-none shrink-0">
              <MatchiLogo size={30} />
              <span className="text-lg font-black tracking-tight text-[#1A241E]">
                Match<span className="text-[#2D724E]">i</span>
              </span>
            </Link>
            {isFacilityView && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1E4A32] text-white px-2 py-0.5 rounded-md">
                Facility Console
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {!isFacilityView && (
              <>
                {(!isAuthenticated || !isOnboarded) ? (
                  // Quick Preview Desktop Navigation
                  <div className="flex items-center gap-1">
                    <Link
                      href="/explore"
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#65756B] hover:text-[#1A241E] hover:bg-white/80 transition-colors"
                    >
                      Find a Court
                    </Link>
                    <Link
                      href="/queue"
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#65756B] hover:text-[#1A241E] hover:bg-white/80 transition-colors"
                    >
                      Find a Game
                    </Link>
                  </div>
                ) : (
                  // Authenticated Player Navigation
                  playerNavLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                          isActive
                            ? 'bg-[#2D724E]/10 text-[#2D724E]'
                            : 'text-[#65756B] hover:text-[#1A241E] hover:bg-white/80'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {link.label}
                      </Link>
                    );
                  })
                )}
              </>
            )}
          </nav>

          {/* Right Side Controls */}
          <div className="flex items-center gap-2">
            {isFacilityView ? (
              <Link
                href="/"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#1A241E] bg-white border border-[#E8E5DF] hover:border-[#2D724E] transition-all"
              >
                Player View
              </Link>
            ) : (
              <>
                {isOwnerOrAdmin && (
                  <Link
                    href="/organizer"
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#2D724E] bg-[#EBF4EE] hover:bg-[#2D724E] hover:text-white transition-all"
                  >
                    Facility Mode
                  </Link>
                )}

                {(!isAuthenticated || !isOnboarded) ? (
                  // Quick Preview Auth CTAs
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#1A241E] hover:bg-white/80 transition-colors"
                    >
                      Sign In
                    </button>
                    <Link
                      href="/onboarding"
                      className="px-3.5 py-1.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Get Started
                    </Link>
                  </div>
                ) : (
                  // Authenticated Player Pill
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-white border border-[#E8E5DF] hover:border-[#2D724E] transition-all cursor-pointer shadow-2xs"
                    title="Account & Authentication Session"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#EBF4EE] text-[#2D724E] flex items-center justify-center font-black text-[10px] border border-[#2D724E]">
                      {currentUser.nickname?.[0] || currentUser.full_name?.[0] || 'P'}
                    </div>
                    <span className="hidden sm:inline text-xs font-bold text-[#1A241E] max-w-[90px] truncate">
                      {currentUser.nickname || currentUser.full_name}
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
      />
    </>
  );
}
