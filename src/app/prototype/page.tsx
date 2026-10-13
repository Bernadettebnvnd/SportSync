'use client';

import React, { useState, useEffect } from 'react';

export default function PrototypeViewerPage() {
  const [mode, setMode] = useState<'hifi' | 'lofi' | 'split'>('lofi');
  const [viewport, setViewport] = useState<'fullscreen' | 'artboard' | 'desktop' | 'tablet' | 'mobile'>('fullscreen');

  useEffect(() => {
    // Read query params if any
    const searchParams = new URLSearchParams(window.location.search);
    const m = searchParams.get('mode');
    const v = searchParams.get('viewport');
    if (m === 'lofi') setMode('lofi');
    else if (m === 'hifi') setMode('hifi');
    else if (m === 'split') setMode('split');

    if (v === 'artboard') setViewport('artboard');
    else if (v === 'fullscreen') setViewport('fullscreen');
    else if (v === 'mobile') setViewport('mobile');
    else if (v === 'tablet') setViewport('tablet');
    else if (v === 'desktop') setViewport('desktop');
  }, []);

  const getViewportWidth = () => {
    if (viewport === 'mobile') return '420px';
    if (viewport === 'tablet') return '800px';
    if (viewport === 'desktop') return '1300px';
    return '100%';
  };

  return (
    <div className="h-screen w-screen bg-[#0E1015] text-[#ECECEC] flex flex-col font-sans overflow-hidden">
      {/* Top Control Bar */}
      <header className="h-14 bg-[#16181F] border-b border-[#282C37] px-4 flex flex-wrap items-center justify-between gap-3 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#0F766E] flex items-center justify-center font-bold text-white text-xs shadow-md">
            AN
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
              App Name
              <span className="text-[10px] uppercase font-semibold bg-[#262A35] text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800/40">
                UX Architecture
              </span>
            </div>
          </div>
        </div>

        {/* Prototype Fidelity Mode Selector */}
        <div className="flex items-center bg-[#0D0E12] border border-[#262A35] rounded-lg p-1 gap-1">
          <button
            onClick={() => setMode('sideline' as any)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              (mode as any) === 'sideline'
                ? 'bg-[#C8FF2E] text-[#0B0F0C] shadow font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ⚡ SIDELINE HiFi Master (New)
          </button>
          <button
            onClick={() => setMode('lofi')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'lofi'
                ? 'bg-[#334155] text-white shadow font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            1. LoFi Wireframe
          </button>
          <button
            onClick={() => setMode('hifi')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'hifi'
                ? 'bg-[#0F766E] text-white shadow font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            2. HiFi Production
          </button>
          <button
            onClick={() => setMode('split')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'split'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            3. Compare
          </button>
        </div>

        {/* View Layout Controls */}
        <div className="flex items-center gap-2">
          {mode !== 'split' && (
            <div className="flex items-center bg-[#0D0E12] border border-[#262A35] rounded-lg p-1 gap-1">
              <button
                onClick={() => setViewport('fullscreen')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewport === 'fullscreen' ? 'bg-[#282D39] text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Fills 100% of your screen width and height"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                <span>100% Full Screen</span>
              </button>

              <button
                onClick={() => setViewport('artboard')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewport === 'artboard' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-600/50' : 'text-gray-400 hover:text-white'
                }`}
                title="See all wireframes laid out side-by-side on an expansive Figma-style canvas"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>📐 All Screens (Figma Board)</span>
              </button>

              <button
                onClick={() => setViewport('mobile')}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  viewport === 'mobile' ? 'bg-[#282D39] text-white font-medium' : 'text-gray-400'
                }`}
              >
                Phone (390)
              </button>
              <button
                onClick={() => setViewport('tablet')}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  viewport === 'tablet' ? 'bg-[#282D39] text-white font-medium' : 'text-gray-400'
                }`}
              >
                Tablet (768)
              </button>
            </div>
          )}

          <a
            href="/sideline.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-[#C8FF2E] hover:bg-[#BCEE26] text-[#0B0F0C] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>⚡ SIDELINE App</span>
          </a>

          <a
            href="http://localhost:5173/showcase"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-[#1F2520] hover:bg-[#283229] text-[#C8FF2E] border border-[#C8FF2E]/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <span>Dribbble Showcase</span>
          </a>

          <a
            href="http://localhost:5173/styleguide"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-[#20232B] hover:bg-[#282C37] text-gray-200 px-3 py-1.5 rounded-lg border border-[#303542] flex items-center gap-1.5 transition-colors"
          >
            <span>Styleguide</span>
          </a>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 w-full h-[calc(100vh-56px)] relative flex overflow-hidden">
        {mode === 'split' ? (
          /* Side-by-side mode showing BOTH LoFi and HiFi simultaneously */
          <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#272B35]">
            <div className="h-full flex flex-col">
              <div className="bg-[#16181F] px-4 py-2 text-xs font-semibold text-gray-300 border-b border-[#272B35] flex items-center justify-between">
                <span>LOW-FIDELITY WIREFRAME PROTOTYPE (Blueprint & Spacing)</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">LoFi Mode</span>
              </div>
              <iframe
                src="/prototype/index.html?mode=lofi&viewport=fullscreen"
                className="w-full flex-1 border-none bg-[#F8FAFC]"
                title="LoFi Prototype"
              />
            </div>
            <div className="h-full flex flex-col">
              <div className="bg-[#16181F] px-4 py-2 text-xs font-semibold text-emerald-400 border-b border-[#272B35] flex items-center justify-between">
                <span>HIGH-FIDELITY PROTOTYPE (Apple HIG & Tokenized Palette)</span>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded">HiFi Mode</span>
              </div>
              <iframe
                src="/prototype/index.html?mode=hifi&viewport=fullscreen"
                className="w-full flex-1 border-none bg-[#F7F7F5]"
                title="HiFi Prototype"
              />
            </div>
          </div>
        ) : (
          /* Single Viewport Mode */
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <div
              className={`h-full transition-all duration-200 flex flex-col overflow-hidden ${
                viewport === 'fullscreen' || viewport === 'artboard'
                  ? 'w-full'
                  : 'shadow-2xl border border-[#282C36] my-auto'
              }`}
              style={{ width: getViewportWidth() }}
            >
              <iframe
                src={(mode as any) === 'sideline' ? '/sideline.html' : `/prototype/index.html?mode=${mode}&viewport=${viewport}`}
                className="w-full h-full border-none"
                title="App Prototype"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
