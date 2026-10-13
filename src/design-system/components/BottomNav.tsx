import React from 'react';
import { Home, Trophy, Plus, Users, User } from 'lucide-react';

export type NavTabId = 'home' | 'scores' | 'create' | 'play' | 'profile';

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
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'scores' as const, label: 'Scores', icon: Trophy },
    { id: 'create' as const, label: '', icon: Plus, isAction: true },
    { id: 'play' as const, label: 'Play', icon: Users },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];

  return (
    <nav
      aria-label="Primary Mobile Navigation"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[358px] z-40 select-none ${className}`}
    >
      {/* Floating Glass Pill Container */}
      <div className="h-16 rounded-full bg-[#141A15]/90 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.65)] px-2.5 flex items-center justify-between">
        {tabs.map((tab) => {
          if (tab.isAction) {
            // Elevated Center (+) Quick Action Button
            return (
              <button
                key="action-center"
                onClick={onOpenQuickAction}
                aria-label="Create match or book court quick action"
                className="w-12 h-12 -mt-4 rounded-full bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center shadow-[0_0_24px_rgba(200,255,46,0.35)] transition-transform duration-150 press-scale border-2 border-[#0B0F0C] shrink-0"
              >
                <Plus className="w-6 h-6" strokeWidth={2.5} />
              </button>
            );
          }

          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-full transition-all duration-200 press-scale ${
                isActive
                  ? 'bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold shadow-sm'
                  : 'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/5'
              }`}
            >
              <IconComponent
                className="w-5 h-5 shrink-0"
                strokeWidth={isActive ? 2.5 : 1.75}
              />
              {isActive && (
                <span className="text-xs tracking-tight transition-all">
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
