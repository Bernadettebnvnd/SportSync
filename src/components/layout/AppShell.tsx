'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';
import { BottomDock } from '@/components/layout/BottomDock';
import { useVisualViewportKeyboard } from '@/lib/hooks/useVisualViewportKeyboard';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useVisualViewportKeyboard({ autoScrollFocusedInput: true });
  // The main SportSync application (at '/' and '/sideline') handles its own mobile navigation dock.
  const isMainApp = pathname === '/' || pathname === '/sideline';
  const isOnboarding = pathname.startsWith('/onboarding');
  const isPrototype = pathname.startsWith('/prototype');
  const isAuth = pathname.startsWith('/auth');
  const isResetPassword = pathname.startsWith('/reset-password');

  return (
    <>
      <OnboardingGuard />
      <main className="flex-1 flex flex-col w-full min-h-[100dvh] overflow-x-clip">{children}</main>
      {!isMainApp && !isOnboarding && !isPrototype && !isAuth && !isResetPassword && <BottomDock />}
    </>
  );
}
