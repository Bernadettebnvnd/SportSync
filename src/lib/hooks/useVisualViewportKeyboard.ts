'use client';

import { useEffect, useState } from 'react';

export interface VisualViewportKeyboardState {
  keyboardHeight: number;
  viewportHeight: number | null;
  isKeyboardOpen: boolean;
}

/**
 * Tracks mobile virtual keyboard height via window.visualViewport, sets CSS
 * custom properties (`--kb-height`, `--vvh`) on :root, and optionally scrolls
 * focused inputs into center view after the keyboard settles.
 */
export function useVisualViewportKeyboard(options?: {
  autoScrollFocusedInput?: boolean;
}): VisualViewportKeyboardState {
  const autoScroll = options?.autoScrollFocusedInput ?? false;
  const [state, setState] = useState<VisualViewportKeyboardState>({
    keyboardHeight: 0,
    viewportHeight: null,
    isKeyboardOpen: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    let rafId: number | null = null;
    let focusTimerId: ReturnType<typeof setTimeout> | null = null;

    const updateMetrics = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        if (!vv) {
          root.style.setProperty('--kb-height', '0px');
          root.style.setProperty('--vvh', '100dvh');
          setState({ keyboardHeight: 0, viewportHeight: window.innerHeight, isKeyboardOpen: false });
          return;
        }

        const rawDiff = window.innerHeight - vv.height - vv.offsetTop;
        const kbHeight = rawDiff > 80 ? Math.round(rawDiff) : 0;
        const isOpen = kbHeight > 0;

        root.style.setProperty('--kb-height', `${kbHeight}px`);
        root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);

        setState((prev) =>
          prev.keyboardHeight === kbHeight &&
          prev.viewportHeight === Math.round(vv.height) &&
          prev.isKeyboardOpen === isOpen
            ? prev
            : {
                keyboardHeight: kbHeight,
                viewportHeight: Math.round(vv.height),
                isKeyboardOpen: isOpen,
              }
        );
      });
    };

    updateMetrics();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateMetrics);
      vv.addEventListener('scroll', updateMetrics);
    }
    window.addEventListener('resize', updateMetrics);

    const handleFocusIn = (event: FocusEvent) => {
      if (!autoScroll) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !target.isContentEditable) return;
      if (target instanceof HTMLInputElement) {
        const nonTextTypes = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'hidden']);
        if (nonTextTypes.has(target.type)) return;
      }

      // Do not center fixed bottom chat inputs (chat containers handle their own message scroll)
      if (
        target.getAttribute('data-chat-input') === 'true' ||
        target.closest('[data-chat-input]') ||
        target.classList.contains('chat-input')
      ) {
        return;
      }

      if (focusTimerId) clearTimeout(focusTimerId);
      focusTimerId = setTimeout(() => {
        try {
          const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
          target.scrollIntoView({
            block: 'center',
            inline: 'nearest',
            behavior: reduced ? 'auto' : 'smooth',
          });
        } catch {}
      }, 280);
    };

    if (autoScroll) {
      document.addEventListener('focusin', handleFocusIn, { passive: true });
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (focusTimerId) clearTimeout(focusTimerId);
      if (vv) {
        vv.removeEventListener('resize', updateMetrics);
        vv.removeEventListener('scroll', updateMetrics);
      }
      window.removeEventListener('resize', updateMetrics);
      if (autoScroll) {
        document.removeEventListener('focusin', handleFocusIn);
      }
    };
  }, [autoScroll]);

  return state;
}
