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
                'relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 text-[11px] font-bold transition-all active:scale-95',
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
