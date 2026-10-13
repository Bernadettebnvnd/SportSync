import React, { useState } from 'react';
import { ArrowLeft, Moon, Sun, Bell, Globe, Shield, HelpCircle, User, LogOut } from 'lucide-react';
import { Toggle } from '../../design-system/components/SegmentedControl';
import { APP_CONFIG } from '../../config/appConfig';

interface SettingsScreenProps {
  onBack: () => void;
  isLightMode: boolean;
  onToggleTheme: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  isLightMode,
  onToggleTheme,
}) => {
  const [matchNotifications, setMatchNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="font-display font-black text-base text-[#F4F7F0]">
          App Settings
        </h1>

        <div className="w-9" />
      </div>

      <div className="space-y-6">
        {/* 2. Theme Toggle (Dark Default vs Light Mode Variant) */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1C241E] flex items-center justify-center text-[#C8FF2E]">
                {isLightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-[#F4F7F0]">
                  Theme Display
                </h3>
                <span className="text-xs text-[#A5B0A6]">
                  {isLightMode ? 'Light Canvas Active' : 'Dark Floodlight Mode (Default)'}
                </span>
              </div>
            </div>

            <button
              onClick={onToggleTheme}
              className={`h-9 px-3.5 rounded-full font-display font-bold text-xs flex items-center gap-1.5 transition-all press-scale ${
                isLightMode
                  ? 'bg-[#0B0F0C] text-[#C8FF2E] border border-[#C8FF2E]'
                  : 'bg-[#C8FF2E] text-[#0B0F0C]'
              }`}
            >
              <span>{isLightMode ? 'Switch to Dark' : 'Switch to Light'}</span>
            </button>
          </div>
        </div>

        {/* 3. Notification Preferences */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-4">
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
            Alerts & Audio
          </h4>
          <Toggle
            checked={matchNotifications}
            onChange={setMatchNotifications}
            label="Live Match Events"
            sublabel="Pulsing goal notifications and kickoff whistles"
          />
          <Toggle
            checked={soundEffects}
            onChange={setSoundEffects}
            label="Stadium Audio & Alerts"
            sublabel="Crowd atmosphere & haptic rolls"
          />
          <Toggle
            checked={hapticFeedback}
            onChange={setHapticFeedback}
            label="Haptic Button Feedback"
            sublabel="Subtle tap compression on interactive elements"
          />
        </div>

        {/* 4. Units & Location Preferences */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3 text-xs">
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6] mb-1">
            Regional Defaults
          </h4>
          <div className="flex items-center justify-between py-1">
            <span className="text-[#A5B0A6]">Primary Currency</span>
            <span className="font-bold text-[#F4F7F0]">British Pound ({APP_CONFIG.currency})</span>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-white/5">
            <span className="text-[#A5B0A6]">Distance Measurement</span>
            <span className="font-bold text-[#F4F7F0]">Miles (mi)</span>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-white/5">
            <span className="text-[#A5B0A6]">Current Location City</span>
            <span className="font-bold text-[#C8FF2E]">{APP_CONFIG.city}</span>
          </div>
        </div>

        {/* 5. Privacy & Legal */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 space-y-3 text-xs">
          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
            Privacy & About
          </h4>
          <div className="flex items-center justify-between py-1">
            <span className="text-[#A5B0A6]">Profile Visibility</span>
            <span className="font-bold text-[#3DDC84]">Friends & Squad</span>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-white/5">
            <span className="text-[#A5B0A6]">App Name & Build</span>
            <span className="font-mono text-[#F4F7F0]">{APP_CONFIG.appName} v{APP_CONFIG.version}</span>
          </div>
        </div>

        {/* Log out */}
        <div className="pt-2">
          <button
            onClick={() => alert('Logged out to Splash')}
            className="w-full h-12 rounded-2xl bg-[#1C241E] text-[#FF5C5C] hover:bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 flex items-center justify-center gap-2 text-xs font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of {APP_CONFIG.appName}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
