import React from 'react';
import { ArrowLeft, Moon, Sun, Globe, Shield, LogOut } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';

interface SettingsScreenProps {
  onBack: () => void;
  isLightMode: boolean;
  onToggleTheme: () => void;
  onLogout?: () => void;
  userCity?: string;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  isLightMode,
  onToggleTheme,
  onLogout,
  userCity,
}) => {
  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-4 sm:p-6 pt-4 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Top Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
        <button
          onClick={onBack}
          aria-label="Back to Profile"
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="font-display font-black text-base sm:text-lg text-[#F4F7F0]">
          Settings
        </h1>

        <div className="w-9" />
      </div>

      <div className="space-y-7 max-w-2xl mx-auto w-full">
        {/* ========================================================= */}
        {/* SECTION 1: GENERAL SETTINGS (Application-level) */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
              General Settings
            </h2>
            <p className="text-[11px] text-[#A5B0A6]/70 mt-0.5">
              Application-level preferences, display theme, and regional defaults
            </p>
          </div>

          {/* Theme Preference Switch Card (Visually separated) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#141A15] border border-white/5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1C241E] flex items-center justify-center text-[#C8FF2E] shrink-0">
                  {isLightMode ? <Sun className="w-5 h-5 text-[#E29B24]" /> : <Moon className="w-5 h-5 text-[#C8FF2E]" />}
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-[#F4F7F0] leading-tight">
                    Light
                  </h3>
                  <span className="text-xs text-[#A5B0A6]">
                    {isLightMode ? 'Light mode enabled' : 'Dark mode active'}
                  </span>
                </div>
              </div>

              {/* Accessible Theme Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isLightMode}
                onClick={onToggleTheme}
                aria-label="Toggle Light mode"
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out press-scale ${
                  isLightMode ? 'bg-[#C8FF2E]' : 'bg-[#1C241E] border border-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full shadow-md transition duration-200 ease-in-out ${
                    isLightMode ? 'translate-x-5 bg-[#0B0F0C]' : 'translate-x-0 bg-[#A5B0A6]'
                  }`}
                />
              </button>
            </div>

            {/* Quick Segmented Switcher */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  if (isLightMode) onToggleTheme();
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all press-scale border ${
                  !isLightMode
                    ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] shadow-sm'
                    : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-[#F4F7F0]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isLightMode) onToggleTheme();
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all press-scale border ${
                  isLightMode
                    ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] shadow-sm'
                    : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-[#F4F7F0]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light Mode</span>
              </button>
            </div>
          </div>

          {/* Regional & System Defaults Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#141A15] border border-white/5 space-y-3 text-xs shadow-sm">
            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
              <Globe className="w-4 h-4 text-[#C8FF2E]" />
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
                Regional &amp; System Defaults
              </h4>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-[#A5B0A6]">Primary Currency</span>
              <span className="font-bold text-[#F4F7F0]">Philippine Peso ({APP_CONFIG.currency})</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-white/5">
              <span className="text-[#A5B0A6]">Distance Measurement</span>
              <span className="font-bold text-[#F4F7F0]">Kilometers (km)</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-white/5">
              <span className="text-[#A5B0A6]">Default Region</span>
              <span className="font-bold text-[#C8FF2E]">{userCity || APP_CONFIG.city}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-white/5">
              <span className="text-[#A5B0A6]">App Name &amp; Build</span>
              <span className="font-mono text-[#F4F7F0]">{APP_CONFIG.appName} v{APP_CONFIG.version}</span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: ACCOUNT SETTINGS (User-specific) */}
        {/* ========================================================= */}
        <section className="space-y-4 pt-2">
          <div className="px-1">
            <h2 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
              Account Settings
            </h2>
            <p className="text-[11px] text-[#A5B0A6]/70 mt-0.5">
              User-specific preferences, privacy, and account actions
            </p>
          </div>

          {/* Privacy & Account Management Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#141A15] border border-white/5 space-y-3 text-xs shadow-sm">
            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
              <Shield className="w-4 h-4 text-[#C8FF2E]" />
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#A5B0A6]">
                Privacy &amp; Security
              </h4>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div>
                <span className="text-[#F4F7F0] font-semibold block">Profile Visibility</span>
                <span className="text-[11px] text-[#A5B0A6]">Visible to other players &amp; venue managers</span>
              </div>
              <span className="font-bold text-[#3DDC84] bg-[#3DDC84]/10 px-2.5 py-1 rounded-full border border-[#3DDC84]/20 text-[11px]">
                Active
              </span>
            </div>
          </div>

          {/* Account Logout Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={async () => {
                if (onLogout) {
                  onLogout();
                } else {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('sportsync_logged_out', 'true');
                    localStorage.removeItem('sportsync_user_id');
                    localStorage.removeItem('matchi_user_id');
                    localStorage.removeItem('sportsync_user_role');
                    localStorage.removeItem('sportsync_user_email');
                    localStorage.removeItem('sportsync_user_name');
                    localStorage.removeItem('sportsync_user_profile');
                    localStorage.removeItem('sideline_user_profile');
                    localStorage.removeItem('matchi_onboarding_completed');
                    localStorage.removeItem('sportsync_onboarding_completed');
                    localStorage.removeItem('sportsync_pending_onboarding');
                    try {
                      await fetch('/api/auth/logout', { method: 'POST' });
                    } catch {}
                    window.location.href = '/';
                  } else {
                    onBack();
                  }
                }
              }}
              className="w-full h-12 rounded-2xl bg-[#1C241E] text-[#FF5C5C] hover:bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 flex items-center justify-center gap-2 text-xs font-bold transition-colors press-scale"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of {APP_CONFIG.appName}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
