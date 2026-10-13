import React from 'react';
import { StadiumScene } from '../../illustrations/Scenes';
import { Button } from '../../design-system/components/Button';
import { APP_CONFIG } from '../../config/appConfig';

interface SplashScreenProps {
  onGetStarted: () => void;
  onLogIn: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onGetStarted, onLogIn }) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#0B0F0C] p-6 pt-10 select-none">
      {/* Top Brand Tag & Scene */}
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-xl mb-4 shadow-[0_0_24px_rgba(200,255,46,0.3)]">
          {APP_CONFIG.appName.slice(0, 2)}
        </div>

        <h1 className="font-display font-black text-3xl tracking-tight text-[#F4F7F0]">
          {APP_CONFIG.appName}
        </h1>

        <p className="text-xs text-[#A5B0A6] uppercase tracking-widest font-semibold mt-1">
          Sports • Community • Courts
        </p>
      </div>

      {/* Ref B: Illustrated Stadium Scene in Forest Green */}
      <div className="my-auto w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
        <StadiumScene className="w-full h-56" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C]/80 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-4 inset-x-4 text-center">
          <p className="font-editorial text-2xl text-[#C8FF2E]">
            "Gather your friends. Play more."
          </p>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="space-y-3 pb-4">
        {/* Pagination Dots indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="w-6 h-1.5 rounded-full bg-[#C8FF2E]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={onGetStarted}
          className="w-full text-base font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)]"
        >
          Get Started
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={onLogIn}
          className="w-full"
        >
          I already have an account
        </Button>
      </div>
    </div>
  );
};
