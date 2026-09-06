'use client';

import React, { useState } from 'react';
import { useMonkeyStore } from '@/lib/store';
import { MonkeyMascot } from './MonkeyMascot';
import { GEAR_STORE_ITEMS } from '@/lib/mockData';
import { Check, Lock, Sparkles, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

export function MascotLocker() {
  const { currentUser, equipGear, unlockGear } = useMonkeyStore();
  const [selectedCategory, setSelectedCategory] = useState<'headband' | 'racket' | 'outfit'>('headband');
  const [notice, setNotice] = useState('');

  const filteredItems = GEAR_STORE_ITEMS.filter((item) => item.type === selectedCategory);

  const handleEquip = (itemId: string) => {
    equipGear(selectedCategory, itemId);
    setNotice(`Equipped ${itemId.replace(/_/g, ' ')}!`);
    setTimeout(() => setNotice(''), 2500);
  };

  const handleUnlock = (itemId: string, price: number) => {
    const success = unlockGear(itemId, price);
    if (success) {
      equipGear(selectedCategory, itemId);
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFC837', '#1F9D55', '#FF9F43'],
      });
      setNotice(`Unlocked & Equipped! 🍌🎉`);
      setTimeout(() => setNotice(''), 2500);
    } else {
      setNotice('Not enough Banana Points! Win more matches to earn bananas! 🍌');
      setTimeout(() => setNotice(''), 3000);
    }
  };

  return (
    <div className="rounded-3xl border border-[#EBEBE6] bg-white p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EBEBE6] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#171717]">Mascot Locker Room</h2>
            <span className="rounded-full bg-[#FF9F43]/15 px-2.5 py-0.5 text-xs font-bold text-[#E68529] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Gear Customizer
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Equip custom headbands, rackets, and outfits unlocked with your Banana Points.
          </p>
        </div>

        {/* Banana points balance */}
        <div className="flex items-center gap-2 rounded-2xl bg-[#FFF5EA] border border-[#FF9F43]/30 px-4 py-2 self-start sm:self-auto">
          <span className="text-2xl">🍌</span>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Banana Points
            </span>
            <div className="text-lg font-black text-[#E68529]">
              {currentUser.banana_points}
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-[#E9F8EE] border border-[#1F9D55]/30 text-xs font-bold text-[#147A40] text-center animate-in fade-in">
          {notice}
        </div>
      )}

      {/* Main Locker Grid: Left Live Mascot Preview, Right Gear Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Mascot Showcase Stage */}
        <div className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-[#FAFAF7] to-[#F1F1EB] p-8 border border-[#EBEBE6] relative overflow-hidden">
          <div className="absolute top-3 left-3 text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280] bg-white/80 px-2 py-0.5 rounded-full">
            Live Preview
          </div>

          <div className="my-4">
            <MonkeyMascot
              mood="hype"
              size="xl"
              equippedGear={currentUser.equipped_gear}
            />
          </div>

          <div className="text-center">
            <h4 className="font-extrabold text-sm text-[#171717]">
              Miki &bull; Custom Outfit
            </h4>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-[10px] font-bold">
              <span className="bg-white border border-[#EBEBE6] px-2 py-0.5 rounded-md text-[#1F9D55]">
                Band: {currentUser.equipped_gear.headband}
              </span>
              <span className="bg-white border border-[#EBEBE6] px-2 py-0.5 rounded-md text-[#FF9F43]">
                Racket: {currentUser.equipped_gear.racket}
              </span>
            </div>
          </div>
        </div>

        {/* Right 2 cols: Category tabs & item cards */}
        <div className="md:col-span-2 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 p-1 bg-[#FAFAF7] border border-[#EBEBE6] rounded-2xl">
            {(['headband', 'racket', 'outfit'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex-1 py-2 text-xs font-bold capitalize rounded-xl transition-all ${
                  selectedCategory === cat
                    ? 'bg-white text-[#171717] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#171717]'
                }`}
              >
                {cat}s
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const isUnlocked = currentUser.unlocked_gear.includes(item.id);
              const isEquipped =
                currentUser.equipped_gear[selectedCategory] === item.id;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between space-y-3 transition-all ${
                    isEquipped
                      ? 'border-[#1F9D55] bg-[#E9F8EE]/40 shadow-sm'
                      : 'border-[#EBEBE6] bg-white hover:border-[#D1D5DB]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <h4 className="text-xs font-extrabold text-[#171717]">
                          {item.name}
                        </h4>
                      </div>

                      {isEquipped ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#1F9D55] px-2 py-0.5 text-[9px] font-bold text-white">
                          <Check className="w-2.5 h-2.5" /> Equipped
                        </span>
                      ) : isUnlocked ? (
                        <span className="rounded-full bg-[#FAFAF7] border border-[#EBEBE6] px-2 py-0.5 text-[9px] font-bold text-[#6B7280]">
                          Owned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5EA] px-2 py-0.5 text-[10px] font-bold text-[#E68529]">
                          <span>🍌</span> {item.price_bananas}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#6B7280] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div>
                    {isEquipped ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-1.5 rounded-xl bg-[#1F9D55]/20 text-[#147A40] text-xs font-bold cursor-default"
                      >
                        Currently Wearing
                      </button>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => handleEquip(item.id)}
                        className="w-full py-1.5 rounded-xl bg-[#1F9D55] hover:bg-[#147A40] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        Equip Gear
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnlock(item.id, item.price_bananas)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[#171717] hover:bg-[#262626] text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Unlock for 🍌 {item.price_bananas}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
