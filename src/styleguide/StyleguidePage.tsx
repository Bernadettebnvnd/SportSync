import React, { useState } from 'react';
import { Button, IconButton } from '../design-system/components/Button';
import { Chip, TagBadge } from '../design-system/components/Chip';
import { DateStrip } from '../design-system/components/DateStrip';
import { HeroEventCard } from '../design-system/components/HeroEventCard';
import { LiveMatchRow } from '../design-system/components/LiveMatchRow';
import { FixtureRow } from '../design-system/components/FixtureRow';
import { MatchCard, ActionTiles } from '../design-system/components/MatchCard';
import { VenueCard } from '../design-system/components/VenueCard';
import { BookingPass } from '../design-system/components/BookingPass';
import { StatTile, LevelBadge, RatingChip, XpRing } from '../design-system/components/StatTile';
import { SegmentedControl, Toggle, Stepper } from '../design-system/components/SegmentedControl';
import { MomentumChart } from '../design-system/components/MomentumChart';
import { PitchLineup } from '../design-system/components/PitchLineup';
import { RadarChart } from '../design-system/components/RadarChart';
import { TeamCrest } from '../illustrations/TeamCrests';
import { UserAvatar } from '../illustrations/Avatars';
import { StadiumScene, ClayPitchScene, TennisAerialScene, BasketballDuskScene } from '../illustrations/Scenes';
import { MATCHES, VENUES, COMMUNITY_GAMES, PLAYERS } from '../mock/mockData';
import { APP_CONFIG } from '../config/appConfig';
import { ArrowLeft, ExternalLink, Sparkles, Smartphone } from 'lucide-react';

export const StyleguidePage: React.FC = () => {
  const [toggleVal, setToggleVal] = useState(true);
  const [stepperVal, setStepperVal] = useState(10);
  const [selectedChip, setSelectedChip] = useState('Football');

  return (
    <div className="min-h-screen bg-[#0B0F0C] text-[#F4F7F0] p-6 lg:p-12 font-sans select-none">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10 pb-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8FF2E] shadow-[0_0_10px_#C8FF2E]" />
            <span className="text-xs font-mono font-bold text-[#C8FF2E] uppercase tracking-wider">
              {APP_CONFIG.appName} Design System Specification
            </span>
          </div>
          <h1 className="font-display font-black text-3xl lg:text-4xl text-[#F4F7F0]">
            Component Library & Design Tokens
          </h1>
          <p className="text-sm text-[#A5B0A6] mt-1 max-w-2xl">
            Atomic components, typography tokens, custom SVG scenes, and interactive primitives conforming to Apple HIG and top-tier product standards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/showcase"
            className="h-11 px-5 rounded-full bg-[#1C241E] hover:bg-[#263028] border border-white/10 text-xs font-bold text-[#F4F7F0] flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#FF8FC7]" />
            <span>Open Dribbble Showcase</span>
          </a>
          <a
            href="/sideline"
            className="h-11 px-5 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(200,255,46,0.3)]"
          >
            <Smartphone className="w-4 h-4 stroke-[2.5]" />
            <span>Interactive Mobile App</span>
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-14">
        {/* SECTION 1: COLOR PALETTE TOKENS */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#F4F7F0] border-l-4 border-[#C8FF2E] pl-3">
            1. Core Color Tokens
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { name: 'bg-base', hex: '#0B0F0C', desc: 'Near-black green canvas' },
              { name: 'bg-forest', hex: '#0F2A22', desc: 'Stadium deep forest' },
              { name: 'surface-1', hex: '#141A15', desc: 'Default card background' },
              { name: 'surface-2', hex: '#1C241E', desc: 'Raised card surface' },
              { name: 'accent-lime', hex: '#C8FF2E', desc: 'Primary hero accent (≤10%)', ink: '#0B0F0C' },
              { name: 'accent-pink', hex: '#FF8FC7', desc: 'Secondary social & join', ink: '#0B0F0C' },
              { name: 'accent-clay', hex: '#C8432B', desc: 'Tennis clay & illustration' },
              { name: 'live-red', hex: '#FF3B30', desc: 'Pulsing live badge' },
              { name: 'win-green', hex: '#3DDC84', desc: 'Positive indicator / W' },
              { name: 'light-surface', hex: '#F5F7F2', desc: 'Ref C venue card surface', ink: '#0B0F0C' },
            ].map((c) => (
              <div key={c.name} className="p-3 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
                <div
                  style={{ backgroundColor: c.hex }}
                  className="w-full h-14 rounded-xl border border-white/10 flex items-center justify-center font-mono font-bold text-xs"
                >
                  <span style={{ color: c.ink || '#FFFFFF' }}>{c.hex}</span>
                </div>
                <div>
                  <span className="font-display font-bold text-xs text-[#F4F7F0] block">{c.name}</span>
                  <span className="text-[10px] text-[#A5B0A6]">{c.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: BUTTONS & CTAS */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#F4F7F0] border-l-4 border-[#C8FF2E] pl-3">
            2. Buttons & CTAs
          </h2>
          <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 flex flex-wrap items-center gap-4">
            <Button variant="primary">Primary Lime</Button>
            <Button variant="secondary">Secondary Dark</Button>
            <Button variant="social">Social Pink</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="primary" isLoading={true}>Loading State</Button>
            <IconButton icon={<Sparkles className="w-5 h-5" />} variant="lime" />
            <IconButton icon={<Sparkles className="w-5 h-5" />} variant="pink" />
            <IconButton icon={<Sparkles className="w-5 h-5" />} variant="glass" />
          </div>

          <div className="max-w-sm">
            <Button variant="pill-arrow">
              Ref C Pill CTA with Arrow
            </Button>
          </div>
        </section>

        {/* SECTION 3: CHIPS & STATUS BADGES */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#F4F7F0] border-l-4 border-[#C8FF2E] pl-3">
            3. Chips & Status Badges
          </h2>
          <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 flex flex-wrap items-center gap-3">
            <Chip variant="sport" label="Football" active={selectedChip === 'Football'} onClick={() => setSelectedChip('Football')} />
            <Chip variant="sport" label="Tennis" active={selectedChip === 'Tennis'} onClick={() => setSelectedChip('Tennis')} />
            <Chip variant="sport" label="Basketball" active={selectedChip === 'Basketball'} onClick={() => setSelectedChip('Basketball')} />
            <TagBadge type="clay" />
            <TagBadge type="grass" />
            <TagBadge type="turf" />
            <TagBadge type="urgent" label="2 spots left" />
            <TagBadge type="casual" />
          </div>
        </section>

        {/* SECTION 4: DATE STRIPS */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#F4F7F0] border-l-4 border-[#C8FF2E] pl-3">
            4. Date Strips (Ref A & Ref C)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-[#141A15] border border-white/5 space-y-2">
              <span className="text-xs text-[#A5B0A6] font-semibold">Ref A Week Strip:</span>
              <DateStrip selectedId="d2" onSelect={() => {}} variant="pill-week" />
            </div>
            <div className="p-5 rounded-3xl bg-[#141A15] border border-white/5 space-y-2">
              <span className="text-xs text-[#A5B0A6] font-semibold">Ref C Circular Booking Chips:</span>
              <DateStrip selectedId="d2" onSelect={() => {}} variant="circular-booking" />
            </div>
          </div>
        </section>

        {/* SECTION 5: HERO NOTCH EVENT CARD */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#F4F7F0] border-l-4 border-[#C8FF2E] pl-3">
            5. Hero Event Card (Lime Flood with Signature Concave Notch)
          </h2>
          <div className="max-w-md">
            <HeroEventCard match={MATCHES[0]} />
          </div>
        </section>

        {/* SECTION 6: REF B POSTER SCENE ILLUSTRATIONS */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#F4F7F0] border-l-4 border-[#C8FF2E] pl-3">
            6. Vector Poster Scenes (Ref B Style)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl overflow-hidden border border-white/10">
              <StadiumScene className="w-full h-44" />
            </div>
            <div className="rounded-3xl overflow-hidden border border-white/10">
              <ClayPitchScene className="w-full h-44" />
            </div>
            <div className="rounded-3xl overflow-hidden border border-white/10">
              <TennisAerialScene className="w-full h-44" />
            </div>
          </div>
        </section>

        {/* SECTION 7: CLUB CRESTS & AVATARS */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#F4F7F0] border-l-4 border-[#C8FF2E] pl-3">
            7. Fictional Team Crests & Illustrated Avatars
          </h2>
          <div className="p-6 rounded-3xl bg-[#141A15] border border-white/5 space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              {(['northgate', 'riverside', 'marlow', 'kensington', 'apex', 'solar', 'dynamo', 'coastline'] as const).map((id) => (
                <div key={id} className="flex flex-col items-center gap-1.5">
                  <TeamCrest id={id} size={44} />
                  <span className="text-[10px] font-mono text-[#A5B0A6]">{id}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-4">
              {(['martin', 'alex', 'elena', 'marcus', 'sarah', 'kai'] as const).map((id) => (
                <div key={id} className="flex flex-col items-center gap-1">
                  <UserAvatar id={id} size={42} showBadge badgeLevel={18} />
                  <span className="text-[10px] font-mono text-[#A5B0A6]">{id}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 8: DATA GRAPHICS (MOMENTUM & RADAR) */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-xl text-[#F4F7F0] border-l-4 border-[#C8FF2E] pl-3">
            8. Data Visualization (Momentum Area Chart & Radar)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MomentumChart />
            <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 flex items-center justify-center">
              <RadarChart stats={PLAYERS[0].stats} size={220} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
