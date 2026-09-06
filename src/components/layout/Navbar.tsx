'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMonkeyStore } from '@/lib/store';
import {
  Compass,
  Zap,
  Flame,
  UserCheck,
  ShieldCheck,
  Home,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MatchiLogo({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-sm transition-transform hover:scale-105"
    >
      {/* Tarzan (1999) Deep Jungle Hexagon / Rounded Pebble Badge */}
      <rect x="2" y="2" width="40" height="40" rx="12" fill="#1E4A32" />
      <rect x="3" y="3" width="38" height="38" rx="11" stroke="#E9C46A" strokeWidth="1.5" strokeOpacity="0.4" />

      {/* Jungle Vines curve */}
      <path
        d="M6 34 C12 28, 16 38, 24 30 C30 24, 34 32, 38 22"
        stroke="#2D724E"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Dynamic athletic monkey silhouette / Tarzan spearhead 'M' mark */}
      <path
        d="M12 30 L16 14 L22 23 L28 14 L32 30"
        stroke="#E9C46A"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Earth Ochre Accent Leaf / Racket head dot */}
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
    { href: '/explore', label: 'Explore Courts', icon: Compass },
    { href: '/sessions/sess_friday_smash', label: 'Live Queue', icon: Zap },
    { href: '/profile', label: 'Mascot & Stats', icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E5DF] bg-[#FAF8F5]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand Logo - Matchi */}
        <Link href="/" className="flex items-center gap-2.5 group select-none">
          <MatchiLogo size={38} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-[#1A241E]">
                Match<span className="text-[#2D724E]">i</span>
              </span>
              <span className="rounded-full bg-[#C87D43]/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#A35C2B]">
                Open Play
              </span>
            </div>
            <p className="hidden text-[10px] font-medium text-[#65756B] sm:block">
              Constant movement. Play freely.
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors',
                  isActive
                    ? 'bg-[#2D724E]/10 text-[#2D724E]'
                    : 'text-[#65756B] hover:text-[#1A241E] hover:bg-white/80'
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Player Streak, Banana Points, Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Win Streak Pill */}
          <div
            title={`Active Win Streak: ${currentUser.win_streak} matches`}
            className="flex items-center gap-1 rounded-full bg-[#FBF0E6] border border-[#C87D43]/30 px-2.5 py-1 text-xs font-bold text-[#A35C2B]"
          >
            <Flame className="w-3.5 h-3.5 fill-[#C87D43] text-[#C87D43]" />
            <span>{currentUser.win_streak}</span>
          </div>

          {/* Banana Points Pill */}
          <Link
            href="/profile"
            title="Banana Points for Mascot Gear"
            className="flex items-center gap-1 rounded-full bg-[#EBF4EE] border border-[#2D724E]/30 px-2.5 py-1 text-xs font-bold text-[#1E4A32] transition-transform hover:scale-105"
          >
            <span>🍌</span>
            <span>{currentUser.banana_points}</span>
          </Link>

          {/* Dual-Mode Role Switcher (Player <-> Organizer) */}
          <button
            type="button"
            onClick={toggleRole}
            title={
              isOrganizer
                ? 'Switch back to Player Mode'
                : 'Switch to Organizer Live Ops Mode'
            }
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm min-h-[36px]',
              isOrganizer
                ? 'bg-[#1E4A32] text-white border-[#1E4A32] hover:bg-[#153423]'
                : 'bg-white text-[#1A241E] border-[#E8E5DF] hover:border-[#2D724E] hover:text-[#2D724E]'
            )}
          >
            {isOrganizer ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-[#E9C46A]" />
                <span className="hidden sm:inline">Organizer Ops</span>
                <span className="sm:hidden">Ops</span>
                {pendingReceiptCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#C87D43] text-[9px] font-black text-white">
                    {pendingReceiptCount}
                  </span>
                )}
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 text-[#2D724E]" />
                <span className="hidden sm:inline">Player View</span>
                <span className="sm:hidden">Player</span>
              </>
            )}
          </button>

          {/* Quick Organizer Jump if Organizer Mode */}
          {isOrganizer && (
            <Link
              href="/organizer"
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#C87D43] hover:bg-[#A35C2B] text-white text-xs font-bold shadow-sm transition-all"
            >
              Live Desk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
