'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
}

export function BottomDock() {
  const pathname = usePathname();
  const isFacility = pathname.startsWith('/organizer');

  const playerItems: NavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Courts', icon: Compass },
    { href: '/bookings', label: 'Bookings', icon: Calendar },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const facilityItems: NavItem[] = [
    { href: '/organizer', label: 'Console', icon: Home },
    { href: '/organizer?tab=bookings', label: 'Bookings', icon: Calendar },
    { href: '/organizer?tab=queue_ops', label: 'Queue', icon: Compass },
    { href: '/profile', label: 'Account', icon: User },
  ];

  const items = isFacility ? facilityItems : playerItems;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 w-auto sm:min-w-[380px] max-w-md mx-auto select-none"
    >
      <div className="flex items-center justify-around rounded-full border border-white/10 bg-[#141A15]/95 px-2 py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (typeof window !== 'undefined' && item.href.includes('?') && pathname + window.location.search === item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex-1 min-w-0 flex flex-col items-center justify-center min-h-[46px] py-1 text-[11px] font-bold transition-all active:scale-95 rounded-2xl',
                isActive
                  ? 'text-[#C8FF2E] bg-[#C8FF2E]/10 font-display'
                  : 'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/5'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-105')} />
                {item.badge ? (
                  <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF3B30] text-[9px] font-black text-white shadow-xs">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="mt-0.5 tracking-tight leading-none">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-1 h-0.5 w-4 rounded-full bg-[#C8FF2E]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

