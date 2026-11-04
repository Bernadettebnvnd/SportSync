'use client';

import { useState, useEffect, useCallback } from 'react';

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface GreetingResult {
  period: GreetingPeriod;
  salutation: string;
  hour: number;
  timeZone: string;
}

/**
 * Resolves the device's actual local timezone using the browser's Intl API.
 * Never uses hardcoded or fixed timezones (such as UTC).
 */
export function getDeviceLocalTimeZone(): string {
  if (typeof window !== 'undefined' && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    } catch {
      // Fallback if resolvedOptions() is unavailable
    }
  }
  return '';
}

/**
 * Resolves the device's actual local hour (0-23) using JavaScript Date and the browser's local timezone.
 * Strictly avoids UTC or fixed timezones, reflecting the user's local device clock accurately.
 */
export function getLocalDeviceHours(target?: Date | number): number {
  if (typeof target === 'number') {
    return ((Math.floor(target) % 24) + 24) % 24;
  }

  const date = target instanceof Date ? target : new Date();

  // In the browser, obtain the hour formatted in the device's resolved local timezone
  if (typeof window !== 'undefined') {
    // Check for optional test override in localStorage for dev verification
    try {
      const mock = window.localStorage.getItem('sportsync_mock_hour');
      if (mock !== null && mock !== '') {
        const parsed = parseInt(mock, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage restrictions in private browsing
    }

    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      try {
        const timeZone = getDeviceLocalTimeZone();
        if (timeZone) {
          const formatter = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hourCycle: 'h23',
            timeZone,
          });
          const parts = formatter.formatToParts(date);
          const hourPart = parts.find((p) => p.type === 'hour');
          if (hourPart) {
            const val = parseInt(hourPart.value, 10);
            if (!isNaN(val) && val >= 0 && val <= 23) {
              return val;
            }
          }
        }
      } catch {
        // Fall through to native Date.getHours()
      }
    }
  }

  // Native JavaScript Date getHours() returns the hour in the local device runtime timezone
  return date.getHours();
}

/**
 * Time-based greeting calculator strictly adhering to:
 * - Good morning: 5:00 AM to 11:59 AM (05:00 – 11:59)
 * - Good afternoon: 12:00 PM to 5:59 PM (12:00 – 17:59)
 * - Good evening: 6:00 PM to 8:59 PM (18:00 – 20:59)
 * - Good night: 9:00 PM to 4:59 AM (21:00 – 04:59)
 *
 * Uses the device's local time and active timezone (never UTC or fixed timezones).
 */
export function getTimeGreetingPeriod(input?: Date | number): GreetingResult {
  const hours = getLocalDeviceHours(input);
  const timeZone = getDeviceLocalTimeZone();

  if (hours >= 5 && hours < 12) {
    return { period: 'morning', salutation: 'Good morning', hour: hours, timeZone };
  }
  if (hours >= 12 && hours < 18) {
    return { period: 'afternoon', salutation: 'Good afternoon', hour: hours, timeZone };
  }
  if (hours >= 18 && hours < 21) {
    return { period: 'evening', salutation: 'Good evening', hour: hours, timeZone };
  }
  // 21:00 to 04:59 (hours >= 21 || hours < 5)
  return { period: 'night', salutation: 'Good night', hour: hours, timeZone };
}

/**
 * Time-based greeting hook that strictly respects local device time and timezone.
 * Automatically updates when time crosses period boundaries, when tab regains focus,
 * after page refresh, upon login, and during screen navigation.
 */
export function useTimeGreeting(displayName?: string | null, isGuest = false) {
  const [greeting, setGreeting] = useState<GreetingResult>(() => getTimeGreetingPeriod());

  const updateGreeting = useCallback(() => {
    setGreeting(getTimeGreetingPeriod());
  }, []);

  // Update when user identity or guest status changes (e.g. immediately upon login or profile load)
  useEffect(() => {
    updateGreeting();
  }, [displayName, isGuest, updateGreeting]);

  useEffect(() => {
    // 1. Immediate update on client mount (ensures client local timezone replaces any SSR state)
    updateGreeting();

    // 2. Dynamic interval (every 15s) to promptly catch period boundary transitions
    const interval = setInterval(updateGreeting, 15000);

    // 3. Tab visibility change (e.g. unlocking device, waking from sleep, switching tabs)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateGreeting();
      }
    };

    // 4. Window focus
    const handleFocus = () => {
      updateGreeting();
    };

    // 5. Browser history navigation (back / forward navigation)
    const handlePopState = () => {
      updateGreeting();
    };

    // 6. Cross-tab storage updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sportsync_mock_hour') {
        updateGreeting();
      }
    };

    // 7. Custom programmatic timechange event
    const handleCustomTimeChange = () => {
      updateGreeting();
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('sportsync:timechange', handleCustomTimeChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sportsync:timechange', handleCustomTimeChange);
    };
  }, [updateGreeting]);

  // Expose diagnostic and mock helpers on window for developer testing in browser devtools
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).getSportSyncTimeDiagnostics = () => {
        const now = new Date();
        const tz = getDeviceLocalTimeZone();
        const hour = getLocalDeviceHours();
        const current = getTimeGreetingPeriod();
        return {
          deviceLocalDate: now.toString(),
          deviceLocalHour: hour,
          browserTimeZone: tz || 'Detected via system Date',
          currentGreeting: current.salutation,
          currentPeriod: current.period,
        };
      };

      (window as any).setSportSyncMockHour = (hour?: number | null) => {
        if (hour === null || hour === undefined) {
          window.localStorage.removeItem('sportsync_mock_hour');
        } else {
          window.localStorage.setItem('sportsync_mock_hour', String(hour));
        }
        window.dispatchEvent(new CustomEvent('sportsync:timechange'));
        const current = getTimeGreetingPeriod();
        return `SportSync hour set to: ${hour ?? 'real device time'}. Current Greeting: "${current.salutation}" (${current.period})`;
      };
    }
  }, []);

  const cleanName = displayName?.trim();
  const showName = Boolean(cleanName && !isGuest && cleanName.toLowerCase() !== 'guest' && cleanName.toLowerCase() !== 'guest player');

  const fullGreeting = showName ? `${greeting.salutation}, ${cleanName}` : greeting.salutation;

  return {
    salutation: greeting.salutation,
    period: greeting.period,
    hour: greeting.hour,
    timeZone: greeting.timeZone,
    fullGreeting,
    showName,
  };
}
