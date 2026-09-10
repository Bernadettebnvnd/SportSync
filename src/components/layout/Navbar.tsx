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
  const { currentUser, activeMode, setActiveMode, payments } = useMatchiStore();
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length;
  const isOwner = currentUser.role === 'venue_owner' || currentUser.role === 'organizer' || currentUser.role === 'admin';
  const isManageMode = activeMode === 'manage';

  const playerNavLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/bookings', label: 'Bookings', icon: Calendar },
    { href: '/profile', label: 'Profile', icon: UserIcon },
  ];

  const manageNavLinks = [
    { href: '/organizer', label: 'Facility Dashboard', icon: Building2 },
    { href: '/explore', label: 'Explore Marketplace', icon: Compass },
    { href: '/profile', label: 'Account', icon: UserIcon },
  ];

  const currentNavLinks = isManageMode ? manageNavLinks : playerNavLinks;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#E8E5DF] bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
          {/* Brand Logo & Tagline */}
          <Link href="/" className="flex items-center gap-2 select-none shrink-0">
            <MatchiLogo size={32} />
            <div>
              <span className="text-lg font-black tracking-tight text-[#1A241E]">
                Match<span className="text-[#2D724E]">i</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold text-[#65756B] uppercase tracking-wider">
                Sports Marketplace
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {currentNavLinks.map((link) => {
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
            })}
          </nav>

          {/* Right Side: Mode Switcher & User Profile */}
          <div className="flex items-center gap-2">
            {/* Mode Switcher Pill (PLAY / MANAGE) */}
            <div className="flex items-center bg-[#E8E5DF]/70 p-0.5 rounded-xl border border-[#E8E5DF]">
              <button
                type="button"
                onClick={() => setActiveMode('play')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1',
                  !isManageMode
                    ? 'bg-white text-[#1A241E] shadow-xs'
                    : 'text-[#65756B] hover:text-[#1A241E]'
                )}
              >
                <span>Play</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isOwner) {
                    setActiveMode('manage');
                  } else {
                    setIsOwnerModalOpen(true);
                  }
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1',
                  isManageMode
                    ? 'bg-[#1E4A32] text-white shadow-xs'
                    : 'text-[#65756B] hover:text-[#1A241E]'
                )}
                title={isOwner ? 'Switch to Facility Management' : 'List a Sports Facility'}
              >
                <span>Manage</span>
                {pendingPaymentsCount > 0 && isManageMode && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#C87D43] text-[9px] font-black text-white">
                    {pendingPaymentsCount}
                  </span>
                )}
              </button>
            </div>

            {/* User Quick Info & Auth Status */}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-xl bg-white border border-[#E8E5DF] hover:border-[#2D724E] transition-all cursor-pointer"
              title="Account & Authentication Session"
            >
              <img
                src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt={currentUser.full_name}
                className="w-6 h-6 rounded-full object-cover border border-[#2D724E]"
              />
              <span className="hidden sm:inline text-xs font-bold text-[#1A241E] max-w-[80px] truncate">
                {currentUser.nickname || currentUser.full_name}
              </span>
            </button>
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
