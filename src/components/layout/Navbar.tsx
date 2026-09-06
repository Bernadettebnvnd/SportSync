'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMonkeyStore } from '@/lib/store';
import {
  Compass,
  Zap,
  Flame,
  ShieldCheck,
  Home,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const { currentUser, toggleRole, payments } = useMonkeyStore();
  const pendingReceiptCount = payments.filter((p) => p.status === 'pending').length;
  const isOrganizer = currentUser.role === 'organizer';

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Courts', icon: Compass },
    { href: '/sessions/sess_friday_smash', label: 'Live Queue', icon: Zap },
    { href: '/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E5DF] bg-[#FAF8F5]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand: Clean Logo + Name only */}
        <Link href="/" className="flex items-center gap-2 select-none shrink-0">
          <MatchiLogo size={32} />
          <span className="text-lg font-black tracking-tight text-[#1A241E]">
            Match<span className="text-[#2D724E]">i</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
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

        {/* Right Side: Desktop full metrics, Mobile single compact badge */}
        <div className="flex items-center gap-2">
          {/* Desktop-only pills */}
          <div className="hidden sm:flex items-center gap-2">
            <div
              title={`Win streak: ${currentUser.win_streak}`}
              className="flex items-center gap-1 rounded-full bg-[#FBF0E6] px-2.5 py-1 text-xs font-bold text-[#A35C2B]"
            >
              <Flame className="w-3 h-3 fill-[#C87D43] text-[#C87D43]" />
              <span>{currentUser.win_streak}</span>
            </div>

            <Link
              href="/profile"
              title="Banana points"
              className="flex items-center gap-1 rounded-full bg-[#EBF4EE] px-2.5 py-1 text-xs font-bold text-[#1E4A32]"
            >
              <span>🍌</span>
              <span>{currentUser.banana_points}</span>
            </Link>
          </div>

          {/* Mode toggle (Compact on mobile) */}
          <button
            type="button"
            onClick={toggleRole}
            title={isOrganizer ? 'Switch to Player Mode' : 'Switch to Organizer Mode'}
            className={cn(
              'relative flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold border transition-all min-h-[34px]',
              isOrganizer
                ? 'bg-[#1E4A32] text-white border-[#1E4A32]'
                : 'bg-white text-[#1A241E] border-[#E8E5DF] hover:border-[#2D724E]'
            )}
          >
            {isOrganizer ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-[#E9C46A]" />
                <span className="text-[11px] font-extrabold">Ops</span>
                {pendingReceiptCount > 0 && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#C87D43] text-[9px] font-black text-white">
                    {pendingReceiptCount}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#2D724E]" />
                <span className="text-[11px] font-extrabold">Player</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
