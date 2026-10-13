'use client';

import { useState, useEffect } from 'react';

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export function getTimeGreetingPeriod(date = new Date()): {
  period: GreetingPeriod;
  salutation: string;
} {
  const hours = date.getHours();

  if (hours >= 5 && hours < 12) {
    return { period: 'morning', salutation: 'Good morning' };
  }
  if (hours >= 12 && hours < 17) {
    return { period: 'afternoon', salutation: 'Good afternoon' };
  }
  if (hours >= 17 && hours < 21) {
    return { period: 'evening', salutation: 'Good evening' };
  }
  return { period: 'night', salutation: 'Good night' };
}

/**
 * Time-based greeting hook that strictly respects local device time.
 * Rules:
 * 05:00–11:59 — Good morning
 * 12:00–16:59 — Good afternoon
 * 17:00–20:59 — Good evening
 * 21:00–04:59 — Good night
 *
 * For authenticated players: "Good [period], [Display Name]"
 * For guests: "Good [period]"
 */
export function useTimeGreeting(displayName?: string | null, isGuest = false) {
  const [salutation, setSalutation] = useState<string>(() => getTimeGreetingPeriod().salutation);
  const [period, setPeriod] = useState<GreetingPeriod>(() => getTimeGreetingPeriod().period);

  useEffect(() => {
    function updateGreeting() {
      const { salutation: newSalutation, period: newPeriod } = getTimeGreetingPeriod();
      setSalutation(newSalutation);
      setPeriod(newPeriod);
    }

    // Update on mount
    updateGreeting();

    // Check periodically (every 60s) for time boundary transitions
    const interval = setInterval(updateGreeting, 60000);

    // Update when application resumes from background / tab focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateGreeting();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', updateGreeting);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', updateGreeting);
    };
  }, []);

  const cleanName = displayName?.trim();
  const showName = Boolean(cleanName && !isGuest && cleanName.toLowerCase() !== 'guest' && cleanName.toLowerCase() !== 'guest player');

  const fullGreeting = showName ? `${salutation}, ${cleanName}` : salutation;

  return {
    salutation,
    period,
    fullGreeting,
    showName,
  };
}
