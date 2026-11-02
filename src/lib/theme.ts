'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'sportsync_theme';

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Check system preference if no explicit user preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch {}
  return 'dark';
}

export function applyTheme(theme: Theme, dispatchEvent = true) {
  if (typeof window === 'undefined') return;
  try {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      if (body) {
        body.classList.add('light');
        body.classList.remove('dark');
      }
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      if (body) {
        body.classList.remove('light');
        body.classList.add('dark');
      }
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Defer custom event dispatch to prevent synchronous React state updates during a component render pass
    if (dispatchEvent) {
      setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent('sportsync:theme-change', { detail: { theme } }));
        } catch {}
      }, 0);
    }
  } catch (e) {
    console.warn('[Theme] Failed to apply theme:', e);
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme, true);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === 'light' ? 'dark' : 'light';
      queueMicrotask(() => {
        applyTheme(next, true);
      });
      return next;
    });
  }, []);

  useEffect(() => {
    // Synchronize DOM with the current state on mount without broadcasting a duplicate change event
    applyTheme(theme, false);

    // Cross-component and cross-window sync
    const handleThemeChange = (e: any) => {
      const updated = e.detail?.theme;
      if (updated && (updated === 'light' || updated === 'dark')) {
        // Wrap state update in queueMicrotask to ensure it does not run synchronously during an ongoing render pass
        queueMicrotask(() => {
          setThemeState((current) => (current !== updated ? updated : current));
        });
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        const val = e.newValue as Theme;
        queueMicrotask(() => {
          setThemeState((current) => (current !== val ? val : current));
        });
      }
    };

    window.addEventListener('sportsync:theme-change', handleThemeChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('sportsync:theme-change', handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [theme]);

  return {
    theme,
    isLightMode: theme === 'light',
    setTheme,
    toggleTheme,
  };
}
