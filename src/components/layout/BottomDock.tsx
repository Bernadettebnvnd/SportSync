'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Zap, Shield, User } from 'lucide-react';
import { useMonkeyStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function BottomDock() {
  const pathname = usePathname();
  const { currentUser, payments } = useMonkeyStore();
  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/sessions/sess_friday_smash', label: 'Live Queue', icon: Zap },
    {
      href: '/organizer',
      label: 'Live Ops',
      icon: Shield,
      badge: currentUser.role === 'organizer' && pendingCount > 0 ? pendingCount : null,
    },
    { href: '/profile', label: 'Mascot', icon: User },
  ];

  return (
    <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-3 left-4 right-4 z-40">
      <div className="flex items-center justify-around rounded-2xl border border-[#EBEBE6] bg-white/95 px-2 py-2 shadow-lg backdrop-blur-md">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-semibold transition-colors',
                isActive
                  ? 'text-[#1F9D55]'
                  : 'text-[#6B7280] hover:text-[#171717]'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge ? (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span>{item.label}</span>
              {isActive && (
                <div className="absolute -bottom-1 h-1 w-6 rounded-full bg-[#1F9D55]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
