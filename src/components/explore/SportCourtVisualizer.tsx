'use client';

import React from 'react';
import { SportType } from '@/types';
import { cn } from '@/lib/utils';
import { Activity, Award } from 'lucide-react';

interface SportCourtVisualizerProps {
  sport: SportType;
  courtName?: string;
  floorType?: string;
  isIndoor?: boolean;
  className?: string;
}

export function SportCourtVisualizer({
  sport,
  courtName,
  floorType,
  isIndoor = true,
  className,
}: SportCourtVisualizerProps) {
  void isIndoor;
  switch (sport) {
    case 'pickleball':
      return (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E4A32] to-[#2D724E] p-3.5 text-white border border-[#2D724E]/40',
            className
          )}
        >
          {/* Pickleball Court Graphic Simulation */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E9C46A] bg-white/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#E9C46A]" />
              Pickleball Court
            </span>
            <span className="text-[10px] font-bold text-emerald-100">
              Kitchen (NVZ) &bull; Doubles
            </span>
          </div>

          <div className="relative h-20 rounded-xl bg-[#2D724E]/80 border-2 border-white/60 flex flex-col justify-between overflow-hidden">
            {/* Baseline top */}
            <div className="h-1/3 border-b border-dashed border-white/40 flex">
              <div className="w-1/2 border-r border-white/40 flex items-center justify-center text-[9px] font-bold opacity-60">
                Left Service
              </div>
              <div className="w-1/2 flex items-center justify-center text-[9px] font-bold opacity-60">
                Right Service
              </div>
            </div>

            {/* Non-Volley Zone (The Kitchen) */}
            <div className="h-1/3 bg-[#C87D43]/40 border-y-2 border-white flex items-center justify-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#E9C46A]">
                Kitchen Line (7ft)
              </span>
            </div>

            {/* Baseline bottom */}
            <div className="h-1/3 border-t border-dashed border-white/40 flex">
              <div className="w-1/2 border-r border-white/40 flex items-center justify-center text-[9px] font-bold opacity-60">
                Right Service
              </div>
              <div className="w-1/2 flex items-center justify-center text-[9px] font-bold opacity-60">
                Left Service
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-100">
            <span>{courtName || 'Regulation Court'}</span>
            <span className="font-bold text-white">{floorType || 'Cushioned Acrylic'}</span>
          </div>
        </div>
      );

    case 'badminton':
      return (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E4A32] to-[#153423] p-3.5 text-white border border-[#2D724E]/40',
            className
          )}
        >
          {/* Badminton Court Graphic */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E9C46A] bg-white/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Award className="w-3 h-3 text-[#E9C46A]" />
              BWF Standard Court
            </span>
            <span className="text-[10px] font-bold text-emerald-100">
              Doubles &amp; Singles Tramlines
            </span>
          </div>

          <div className="relative h-20 rounded-xl bg-[#2D724E]/90 border-2 border-white/70 p-1 flex flex-col justify-between overflow-hidden">
            {/* Center Net line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b-2 border-white/90" />
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-r border-dashed border-white/40" />

            {/* Outer doubles tramlines */}
            <div className="h-full w-full border border-white/40 flex justify-between">
              <div className="w-1.5 bg-white/20" title="Doubles tramline" />
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[9px] font-bold opacity-75">Yonex BWF Taraflex</span>
              </div>
              <div className="w-1.5 bg-white/20" title="Doubles tramline" />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-100">
            <span>{courtName || 'BWF Court'}</span>
            <span className="font-bold text-white">{floorType || 'Taraflex Rubber Mat'}</span>
          </div>
        </div>
      );

    case 'basketball':
      return (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#A35C2B] via-[#C87D43] to-[#8C4619] p-3.5 text-white border border-[#C87D43]/40',
            className
          )}
        >
          {/* Basketball Court Graphic */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white bg-black/25 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#E9C46A]" />
              Basketball Hardwood
            </span>
            <span className="text-[10px] font-bold text-amber-100">Full Court / 3v3 Half</span>
          </div>

          <div className="relative h-20 rounded-xl bg-[#C87D43] border-2 border-white/80 p-1 flex items-center justify-between overflow-hidden">
            {/* Center circle */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-white/70" />
            <div className="absolute left-1/2 inset-y-0 -translate-x-1/2 border-r border-white/70" />

            {/* Left key */}
            <div className="w-6 h-10 border border-white/70 rounded-r-lg" />
            {/* Right key */}
            <div className="w-6 h-10 border border-white/70 rounded-l-lg" />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-amber-100">
            <span>{courtName || 'Regulation Hardwood'}</span>
            <span className="font-bold text-white">{floorType || 'Maple Sprung Wood'}</span>
          </div>
        </div>
      );

    case 'tennis':
    default:
      return (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E4A32] to-[#2D724E] p-3.5 text-white border border-[#2D724E]/40',
            className
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E9C46A] bg-white/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#E9C46A]" />
              Tennis Court
            </span>
            <span className="text-[10px] font-bold text-emerald-100">Regulation Service Box</span>
          </div>

          <div className="relative h-20 rounded-xl bg-[#2D724E] border-2 border-white/70 p-1 flex flex-col justify-between overflow-hidden">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b-2 border-white" />
            <div className="h-full w-full border border-white/50 flex items-center justify-center">
              <span className="text-[9px] font-bold opacity-75">All-Weather Acrylic</span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-100">
            <span>{courtName || 'Center Court'}</span>
            <span className="font-bold text-white">{floorType || 'Tournament Acrylic'}</span>
          </div>
        </div>
      );
  }
}
