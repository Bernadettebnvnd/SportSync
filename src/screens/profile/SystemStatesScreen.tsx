import React, { useState } from 'react';
import { ArrowLeft, WifiOff, AlertTriangle, MapPin, Bell, RefreshCw } from 'lucide-react';
import { EmptyState, Skeleton } from '../../design-system/components/SearchBar';
import { Button } from '../../design-system/components/Button';

interface SystemStatesScreenProps {
  onBack: () => void;
}

export const SystemStatesScreen: React.FC<SystemStatesScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'empty' | 'offline' | 'skeletons' | 'permissions'>('empty');

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
          System States
        </h1>

        <div className="w-9" />
      </div>

      {/* 2. Switcher for system states */}
      <div className="flex rounded-2xl bg-[#141A15] p-1 border border-white/5 mb-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'empty', label: 'Empty Pitch' },
          { id: 'offline', label: 'Offline / Error' },
          { id: 'skeletons', label: 'Skeletons' },
          { id: 'permissions', label: 'Permissions' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[80px] py-1.5 text-xs font-semibold rounded-xl transition-all ${
                isActive
                  ? 'bg-[#C8FF2E] text-[#0B0F0C] font-bold shadow-sm'
                  : 'text-[#A5B0A6]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. States Content */}
      <div className="space-y-6">
        {/* STATE A: EMPTY PITCH ILLUSTRATION */}
        {activeTab === 'empty' && (
          <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5">
            <EmptyState
              title="No Pickup Matches Found"
              description="There are currently no games scheduled on this date in your selected distance range."
              actionLabel="Create the First Match"
              onAction={() => alert('Opening Create Match Wizard')}
            />
          </div>
        )}

        {/* STATE B: OFFLINE BANNER & ERROR WITH RETRY */}
        {activeTab === 'offline' && (
          <div className="space-y-4">
            {/* Offline notification banner */}
            <div className="p-3.5 rounded-2xl bg-[#FF8FC7]/15 border border-[#FF8FC7]/40 flex items-center gap-3 text-xs">
              <WifiOff className="w-5 h-5 text-[#FF8FC7] shrink-0" />
              <div>
                <span className="font-bold text-[#FF8FC7] block">Offline Mode</span>
                <span className="text-[#A5B0A6]">Showing cached fixtures and saved tickets.</span>
              </div>
            </div>

            {/* Error with Retry */}
            <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FF5C5C]/20 border border-[#FF5C5C]/40 text-[#FF5C5C] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-base text-[#F4F7F0]">
                Failed to Sync Live Scores
              </h3>
              <p className="text-xs text-[#A5B0A6] max-w-xs mx-auto">
                Stadium broadcast feed encountered a network timeout.
              </p>
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => alert('Retrying sync...')}
                >
                  Retry Connection
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STATE C: SKELETON LOADERS (Home, Scores, Venues) */}
        {activeTab === 'skeletons' && (
          <div className="space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A5B0A6] block">
              Lime Shimmer Skeletons
            </span>

            {/* Hero Notch Card Skeleton */}
            <Skeleton className="w-full h-44 rounded-[28px]" />

            {/* Row Skeletons */}
            <div className="space-y-2">
              <Skeleton className="w-full h-16 rounded-2xl" />
              <Skeleton className="w-full h-16 rounded-2xl" />
              <Skeleton className="w-full h-16 rounded-2xl" />
            </div>
          </div>
        )}

        {/* STATE D: PERMISSION PROMPTS */}
        {activeTab === 'permissions' && (
          <div className="space-y-4">
            {/* Location Permission */}
            <div className="p-5 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0F2A22] text-[#C8FF2E] flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                  Enable Nearby Court Discovery
                </h4>
                <p className="text-xs text-[#A5B0A6] mt-0.5 leading-relaxed">
                  SportSync uses your GPS location to calculate pitch distance and display games happening within 5 miles.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => alert('Location permission granted')}
                className="w-full"
              >
                Allow Location Access
              </Button>
            </div>

            {/* Notification Permission */}
            <div className="p-5 rounded-3xl bg-[#141A15] border border-white/5 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1C241E] text-[#FF8FC7] flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-[#F4F7F0]">
                  Turn on Live Goal Notifications
                </h4>
                <p className="text-xs text-[#A5B0A6] mt-0.5 leading-relaxed">
                  Never miss an equalizer or last-minute pickup squad spot.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => alert('Notifications enabled')}
                className="w-full"
              >
                Enable Push Notifications
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
