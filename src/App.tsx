import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MobileApp, ScreenId } from './MobileApp';
import { ShowcasePage } from './showcase/ShowcasePage';
import { StyleguidePage } from './styleguide/StyleguidePage';
import { ResetPasswordScreen } from './screens/onboarding/ResetPasswordScreen';

const StandaloneMobileView: React.FC = () => {
  const [selectedScreen] = useState<ScreenId | undefined>(undefined);
  const [, setActiveScreen] = useState<ScreenId>('auth');

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#0B0F0C] text-[#F4F7F0] flex flex-col items-center justify-center select-none overflow-x-hidden">
      <main className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl min-h-screen min-h-[100dvh] bg-[#0B0F0C] sm:border-x sm:border-white/5 relative flex flex-col shadow-2xl">
        <MobileApp initialScreen={selectedScreen} inPhoneFrame={false} onScreenChange={setActiveScreen} />
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<StandaloneMobileView />} />
      <Route path="/home" element={<StandaloneMobileView />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/showcase" element={<ShowcasePage />} />
      <Route path="/styleguide" element={<StyleguidePage />} />
      {/* Fallback to root */}
      <Route path="*" element={<StandaloneMobileView />} />
    </Routes>
  );
};
export default App;
