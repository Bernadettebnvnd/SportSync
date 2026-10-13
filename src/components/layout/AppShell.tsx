'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The main SportSync application handles its own responsive header and navigation.
  const isMainApp = pathname === '/' || pathname === '/sideline';
  const isOnboarding = pathname === '/onboarding';
  const isPrototype = pathname.startsWith('/prototype');

  return (
    <>
      <OnboardingGuard />
      {!isMainApp && !isOnboarding && !isPrototype && <Navbar />}
      <main className="flex-1 flex flex-col">{children}</main>
    </>
  );
}
