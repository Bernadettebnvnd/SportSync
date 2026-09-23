'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { BottomDock } from '@/components/layout/BottomDock';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname === '/onboarding';
  const isPrototype = pathname.startsWith('/prototype');

  return (
    <>
      <OnboardingGuard />
      {!isOnboarding && !isPrototype && <Navbar />}
      <main className="flex-1">{children}</main>
      {!isOnboarding && !isPrototype && <BottomDock />}
    </>
  );
}
