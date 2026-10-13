import React from 'react';
import { Home, Users, Plus, Trophy, User } from 'lucide-react';

export type NavTabId = 'home' | 'play' | 'create' | 'scores' | 'profile';

interface BottomNavProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  onOpenQuickAction: () => void;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenQuickAction,
  className = '',
}) => {
  // Required SportSync order: Home | Play | Quick Action | Scores | Profile
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home, isAction: false },
    { id: 'play' as const, label: 'Play', icon: Users, isAction: false },
    { id: 'create' as const, label: '', icon: Plus, isAction: true },
    { id: 'scores' as const, label: 'Scores', icon: Trophy, isAction: false },
    { id: 'profile' as const, label: 'Profile', icon: User, isAction: false },
  ];

  return (
    <nav
      aria-label="SportSync Primary Navigation"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[390px] z-40 select-none ${className}`}
    >
      {/* Floating Glass Pill Container — Fixed dimensions to prevent layout shifts */}
      <div className="h-16 rounded-full bg-[#141A15]/95 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.65)] px-2 flex items-center justify-between">
        {tabs.map((tab) => {
          if (tab.isAction) {
            // Elevated Center (+) Quick Action Button — Fixed position & dimensions
            return (
              <div key="action-center" className="flex-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={onOpenQuickAction}
                  aria-label="Quick Actions: Create match or manage games"
                  className="w-12 h-12 -mt-4 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center shadow-[0_0_24px_rgba(200,255,46,0.35)] transition-transform duration-150 press-scale border-2 border-[#0B0F0C] shrink-0"
                >
                  <Plus className="w-6 h-6" strokeWidth={2.5} />
                </button>
              </div>
            );
          }

          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <div key={tab.id} className="flex-1 flex items-center justify-center">
              <button
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-label={tab.label}
                className={`w-full max-w-[68px] h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 press-scale ${
                  isActive
                    ? 'bg-[#C8FF2E]/10 text-[#C8FF2E]'
                    : 'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/5'
                }`}
              >
                <IconComponent
                  className="w-5 h-5 shrink-0"
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                {/* Fixed-height reserved label container — Never shifts layout */}
                <span
                  className={`text-[10px] tracking-tight leading-none text-center ${
                    isActive ? 'font-display font-bold text-[#C8FF2E]' : 'font-medium text-[#A5B0A6]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
};
