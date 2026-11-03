/**
 * SportSync Share & Clipboard Utilities
 * Supports modern navigator.share (Web Share API) and clipboard copying with execCommand fallback.
 */

/**
 * Robust cross-browser clipboard copy with execCommand fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Try modern navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // 2. Fallback to hidden textarea with execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.warn('[SportSync] Clipboard copy failed:', err);
    return false;
  }
}

/**
 * Constructs a canonical shareable URL for a SportSync game/match
 */
export function getMatchShareUrl(game: { id: string; inviteCode?: string }): string {
  const code = game.inviteCode || game.id;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/?invite=${encodeURIComponent(code)}`;
  }
  return `https://sportsync.ph/?invite=${encodeURIComponent(code)}`;
}

/**
 * Constructs a shareable URL for the general SportSync app or invite
 */
export function getAppShareUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/?invite=SPORTSYNC`;
  }
  return 'https://sportsync.ph';
}

/**
 * Triggers native Web Share dialog or falls back to copying the match URL to clipboard,
 * and calls the optional feedback callback with a descriptive message.
 */
export async function shareMatch(
  game: { id: string; title: string; sport?: string; locationName?: string; inviteCode?: string },
  onFeedback?: (message: string) => void
): Promise<boolean> {
  const url = getMatchShareUrl(game);
  const shareTitle = `${game.title} - SportSync Match`;
  const shareText = `Join me for ${game.sport || 'sports'} at ${game.locationName || 'Naga City'} on SportSync!`;

  // Try Web Share API (mobile devices, modern browsers)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url,
      });
      onFeedback?.('Match link shared!');
      return true;
    } catch (err: any) {
      // If user aborted or canceled the native share dialog, don't show error
      if (err?.name === 'AbortError') {
        return false;
      }
      // Otherwise fall through to clipboard
    }
  }

  // Clipboard fallback
  const copied = await copyToClipboard(url);
  if (copied) {
    onFeedback?.('Match link copied to clipboard!');
  } else {
    onFeedback?.('Failed to copy link.');
  }
  return copied;
}
