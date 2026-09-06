'use client';

import React, { useState } from 'react';
import { useMonkeyStore } from '@/lib/store';
import { MonkeyMascot } from './MonkeyMascot';
import { GEAR_STORE_ITEMS } from '@/lib/mockData';
import { Check, Lock, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export function MascotLocker() {
  const { currentUser, equipGear, unlockGear } = useMonkeyStore();
  const [selectedCategory, setSelectedCategory] = useState<'headband' | 'outfit'>('headband');
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
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2D724E', '#C87D43', '#E9C46A'],
      });
      setNotice(`Unlocked & Equipped! 🍌🎉`);
      setTimeout(() => setNotice(''), 2500);
    } else {
      setNotice('Not enough Banana Points! Win more matches to earn bananas! 🍌');
      setTimeout(() => setNotice(''), 3000);
    }
  };

  return (
    <div className="rounded-3xl border border-[#E8E5DF] bg-white p-4 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5DF] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-[#1A241E]">Matchi Mascot Locker</h2>
            <span className="rounded-full bg-[#C87D43]/15 px-2.5 py-0.5 text-xs font-bold text-[#A35C2B] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Gear Customizer
            </span>
          </div>
          <p className="text-xs text-[#65756B] mt-0.5">
            Customize Miki with jungle headbands and Tarzan-themed athletic outfits unlocked with your Banana Points.
          </p>
        </div>

        {/* Banana points balance */}
        <div className="flex items-center gap-2 rounded-2xl bg-[#FBF0E6] border border-[#C87D43]/30 px-3.5 py-1.5 self-start sm:self-auto">
          <span className="text-xl">🍌</span>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#65756B]">
              Banana Points
            </span>
            <div className="text-base font-black text-[#A35C2B]">
              {currentUser.banana_points}
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-2.5 rounded-xl bg-[#EBF4EE] border border-[#2D724E]/30 text-xs font-bold text-[#1E4A32] text-center animate-in fade-in">
          {notice}
        </div>
      )}

      {/* Main Locker Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Mascot Showcase Stage */}
        <div className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-[#FAF8F5] to-[#F1EFE9] p-6 border border-[#E8E5DF] relative overflow-hidden">
          <div className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider text-[#65756B] bg-white/85 px-2 py-0.5 rounded-full">
            Live Preview
          </div>

          <div className="my-3">
            <MonkeyMascot
              mood="hype"
              size="xl"
              equippedGear={currentUser.equipped_gear}
            />
          </div>

          <div className="text-center">
            <h4 className="font-black text-xs sm:text-sm text-[#1A241E]">
              Miki &bull; Matchi Companion
            </h4>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1 text-[10px] font-bold">
              <span className="bg-white border border-[#E8E5DF] px-2 py-0.5 rounded-md text-[#2D724E]">
                Headband: {currentUser.equipped_gear.headband?.replace(/_/g, ' ') || 'None'}
              </span>
              <span className="bg-white border border-[#E8E5DF] px-2 py-0.5 rounded-md text-[#C87D43]">
                Outfit: {currentUser.equipped_gear.outfit?.replace(/_/g, ' ') || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Right 2 cols: Category tabs & item cards */}
        <div className="md:col-span-2 space-y-3.5">
          {/* Category Tabs: Headband & Outfit only */}
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#E8E5DF] rounded-2xl">
            {(['headband', 'outfit'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex-1 py-2 text-xs font-bold capitalize rounded-xl transition-all min-h-[38px] ${
                  selectedCategory === cat
                    ? 'bg-white text-[#1A241E] shadow-sm'
                    : 'text-[#65756B] hover:text-[#1A241E]'
                }`}
              >
                {cat === 'headband' ? 'Jungle Headbands' : 'Tarzan Outfits'}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredItems.map((item) => {
              const isUnlocked = currentUser.unlocked_gear.includes(item.id);
              const isEquipped =
                currentUser.equipped_gear[selectedCategory] === item.id;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-3.5 flex flex-col justify-between space-y-2.5 transition-all ${
                    isEquipped
                      ? 'border-[#2D724E] bg-[#EBF4EE]/50 shadow-sm'
                      : 'border-[#E8E5DF] bg-white hover:border-[#D4CEBE]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <h4 className="text-xs font-black text-[#1A241E]">
                          {item.name}
                        </h4>
                      </div>

                      {isEquipped ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#2D724E] px-2 py-0.5 text-[9px] font-bold text-white">
                          <Check className="w-2.5 h-2.5" /> Equipped
                        </span>
                      ) : isUnlocked ? (
                        <span className="rounded-full bg-[#FAF8F5] border border-[#E8E5DF] px-2 py-0.5 text-[9px] font-bold text-[#65756B]">
                          Owned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF0E6] px-2 py-0.5 text-[10px] font-black text-[#A35C2B]">
                          <span>🍌</span> {item.price_bananas}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#65756B] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div>
                    {isEquipped ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-1.5 rounded-xl bg-[#2D724E]/20 text-[#1E4A32] text-xs font-bold cursor-default"
                      >
                        Currently Equipped
                      </button>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => handleEquip(item.id)}
                        className="w-full py-2 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold transition-all shadow-sm active:scale-95 min-h-[36px]"
                      >
                        Equip Gear
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnlock(item.id, item.price_bananas)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1A241E] hover:bg-[#2A362F] text-white text-xs font-bold transition-all active:scale-95 shadow-sm min-h-[36px]"
                      >
                        <Lock className="w-3 h-3 text-[#E9C46A]" />
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
