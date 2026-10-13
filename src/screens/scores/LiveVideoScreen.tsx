import React from 'react';
import { ArrowLeft, Share2, Maximize, MessageCircle } from 'lucide-react';
import { Match } from '../../mock/types';
import { VideoPlayer } from '../../design-system/components/VideoPlayer';

interface LiveVideoScreenProps {
  match: Match;
  onBack: () => void;
}

export const LiveVideoScreen: React.FC<LiveVideoScreenProps> = ({ match, onBack }) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-black text-[#F4F7F0] select-none overflow-hidden">
      {/* Top Bar Floating Over Video */}
      <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="font-display font-bold text-xs uppercase tracking-wider text-white/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          Official Live Broadcast
        </span>

        <button
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Full-Bleed Video Canvas + Frosted Bottom Sheet Controls */}
      <div className="w-full h-full">
        <VideoPlayer match={match} className="w-full h-full rounded-none" />
      </div>
    </div>
  );
};
