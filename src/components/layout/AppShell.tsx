'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';
import { BottomDock } from '@/components/layout/BottomDock';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The main SportSync application (at '/' and '/sideline') handles its own mobile navigation dock.
  const isMainApp = pathname === '/' || pathname === '/sideline';
  const isOnboarding = pathname === '/onboarding';
  const isPrototype = pathname.startsWith('/prototype');

  return (
    <>
      <OnboardingGuard />
      <main className="flex-1 flex flex-col w-full min-h-screen">{children}</main>
      {!isMainApp && !isOnboarding && !isPrototype && <BottomDock />}
    </>
  );
}
