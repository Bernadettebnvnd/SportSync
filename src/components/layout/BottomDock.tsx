'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Calendar, Shield, User } from 'lucide-react';
import { useMatchiStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
}

export function BottomDock() {
  const pathname = usePathname();
  const { payments, activeMode } = useMatchiStore();
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const isManage = activeMode === 'manage';

  const playerItems: NavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/bookings', label: 'Bookings', icon: Calendar },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const manageItems: NavItem[] = [
    {
      href: '/organizer',
      label: 'Ops Desk',
      icon: Shield,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { href: '/explore', label: 'Marketplace', icon: Compass },
    { href: '/profile', label: 'Account', icon: User },
  ];

  const items = isManage ? manageItems : playerItems;

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-3 left-3 right-3 z-40 max-w-lg mx-auto"
    >
      <div className="flex items-center justify-around rounded-2xl border border-[#E8E5DF] bg-[#FAF8F5]/95 px-1 py-1.5 shadow-xl backdrop-blur-lg">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex-1 min-w-0 flex flex-col items-center justify-center min-h-[46px] py-1 text-[10px] sm:text-[11px] font-bold transition-all active:scale-95',
                isActive
                  ? 'text-[#2D724E]'
                  : 'text-[#65756B] hover:text-[#1A241E]'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                {item.badge ? (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C87D43] text-[9px] font-black text-white shadow-sm">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="mt-0.5 tracking-tight">{item.label}</span>
              {isActive && (
                <div className="absolute -bottom-1 h-1 w-6 rounded-full bg-[#2D724E]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

