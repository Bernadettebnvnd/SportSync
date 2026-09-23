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
      className="md:hidden fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto"
    >
      <div className="flex items-center justify-around rounded-2xl border border-[#E8E5DF] bg-[#FAF8F5]/95 px-1 py-1.5 shadow-md backdrop-blur-lg">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (typeof window !== 'undefined' && item.href.includes('?') && pathname + window.location.search === item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex-1 min-w-0 flex flex-col items-center justify-center min-h-[46px] py-1 text-[11px] font-bold transition-all active:scale-95',
                isActive
                  ? 'text-[#2D724E]'
                  : 'text-[#65756B] hover:text-[#1A241E]'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-105')} />
                {item.badge ? (
                  <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#C87D43] text-[9px] font-black text-white shadow-2xs">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="mt-0.5 tracking-tight">{item.label}</span>
              {isActive && (
                <div className="absolute -bottom-1 h-0.5 w-5 rounded-full bg-[#2D724E]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

