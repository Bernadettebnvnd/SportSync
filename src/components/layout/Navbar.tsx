'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMonkeyStore } from '@/lib/store';
import { MonkeyMascot } from '@/components/mascot/MonkeyMascot';
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
    <header className="sticky top-0 z-40 w-full border-b border-[#EBEBE6] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F9D55] p-0.5 shadow-sm transition-transform group-hover:scale-105">
            <MonkeyMascot mood="hype" size="sm" animated={false} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-[#171717]">
                Monkey<span className="text-[#1F9D55]">Sports</span>
              </span>
              <span className="rounded-full bg-[#FF9F43]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E68529]">
                BETA
              </span>
            </div>
            <p className="hidden text-[10px] font-medium text-[#6B7280] sm:block">
              Constant movement. Pure *maligalig* energy.
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
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-[#1F9D55]/10 text-[#1F9D55]'
                    : 'text-[#6B7280] hover:text-[#171717] hover:bg-[#FAFAF7]'
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Player Streak, Banana Points, Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Win Streak Pill */}
          <div
            title={`Active Win Streak: ${currentUser.win_streak} matches!`}
            className="flex items-center gap-1 rounded-full bg-[#FFF5EA] border border-[#FF9F43]/30 px-2.5 py-1 text-xs font-bold text-[#E68529]"
          >
            <Flame className="w-3.5 h-3.5 fill-[#FF9F43] text-[#FF9F43]" />
            <span>{currentUser.win_streak}</span>
          </div>

          {/* Banana Points Pill */}
          <Link
            href="/profile"
            title="Banana Points for Mascot Gear"
            className="flex items-center gap-1.5 rounded-full bg-[#E9F8EE] border border-[#1F9D55]/30 px-2.5 py-1 text-xs font-bold text-[#147A40] transition-transform hover:scale-105"
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
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm',
              isOrganizer
                ? 'bg-[#171717] text-white border-[#171717] hover:bg-[#262626]'
                : 'bg-white text-[#171717] border-[#EBEBE6] hover:border-[#1F9D55] hover:text-[#1F9D55]'
            )}
          >
            {isOrganizer ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF9F43]" />
                <span>Organizer Ops</span>
                {pendingReceiptCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-extrabold text-white">
                    {pendingReceiptCount}
                  </span>
                )}
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 text-[#1F9D55]" />
                <span className="hidden sm:inline">Player View</span>
                <span className="sm:hidden">Player</span>
              </>
            )}
          </button>

          {/* Quick Organizer Jump if Organizer Mode */}
          {isOrganizer && (
            <Link
              href="/organizer"
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FF9F43] hover:bg-[#E68529] text-white text-xs font-bold shadow-sm transition-all"
            >
              Live Ops Desk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
