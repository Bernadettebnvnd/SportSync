import React, { useEffect, useCallback } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  onGetStarted?: () => void;
  onLogIn?: () => void;
  onGuest?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  onGetStarted,
  onLogIn,
}) => {
  const handleComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('sportsync_splash_shown', 'true');
      } catch {}
    }

    if (onFinish) {
      onFinish();
    } else if (onGetStarted) {
      onGetStarted();
    } else if (onLogIn) {
      onLogIn();
    }
  }, [onFinish, onGetStarted, onLogIn]);

  useEffect(() => {
    // Quick, subtle splash transition (1.5 seconds)
    const timer = setTimeout(() => {
      handleComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [handleComplete]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleComplete}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleComplete();
        }
      }}
      className="relative w-full h-full min-h-[100dvh] flex flex-col items-center justify-center p-6 select-none bg-[#060E0A] text-[#F4F7F0] cursor-pointer overflow-hidden"
    >
      {/* Centered Official Full SportSync Logo (S mark + SportSync typography) - Completely Unboxed */}
      <div className="flex flex-col items-center justify-center w-full max-w-sm px-4 animate-fadeIn">
        <div className="w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          <img
            src="/sportsync-full-logo.svg"
            alt="SportSync"
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </div>
      </div>

      {/* Subtle Bottom Loading Indicator */}
      <div className="absolute bottom-10 inset-x-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
        <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#D4FA2B] rounded-full animate-pulse w-full" />
        </div>
      </div>
    </div>
  );
};
