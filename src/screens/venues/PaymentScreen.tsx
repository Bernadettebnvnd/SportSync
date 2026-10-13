import React, { useState } from 'react';
import { ArrowLeft, CreditCard, ShieldCheck, Check, Smartphone, Lock } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { APP_CONFIG } from '../../config/appConfig';

interface PaymentScreenProps {
  totalAmount?: number;
  bookingDetails?: {
    slot: string;
    court: string;
    venueName?: string;
    duration?: number;
  };
  onBack: () => void;
  onPaymentSuccess: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  totalAmount = 54,
  bookingDetails,
  onBack,
  onPaymentSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'one-touch' | 'card' | 'wallet'>('one-touch');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApplyPromo = () => {
    if (promoCode.trim()) setPromoApplied(true);
  };

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onPaymentSuccess();
    }, 800);
  };

  const finalTotal = promoApplied ? Math.max(0, totalAmount - 5) : totalAmount;

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
          Checkout & Payment
        </h1>

        <div className="w-9" />
      </div>

      <div className="space-y-6">
        {/* Order Summary Pill */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#A5B0A6] block">
              {bookingDetails ? `${bookingDetails.court} • ${bookingDetails.slot}` : 'Total Court Fee'}
            </span>
            <span className="font-display font-black text-2xl text-[#C8FF2E] tabular-nums">
              {APP_CONFIG.currency}{finalTotal}
            </span>
          </div>

          <span className="text-xs text-[#3DDC84] font-semibold bg-[#3DDC84]/15 px-2.5 py-1 rounded-full border border-[#3DDC84]/30">
            Instant Confirmation
          </span>
        </div>

        {/* 2. Generic One-Touch Pay Buttons (Apple / Google style without brand marks) */}
        <div>
          <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
            One-Touch Quick Pay
          </label>
          <button
            onClick={() => setSelectedMethod('one-touch')}
            className={`w-full h-13 rounded-2xl border flex items-center justify-center gap-2 font-display font-bold text-sm transition-all press-scale ${
              selectedMethod === 'one-touch'
                ? 'bg-white text-black border-white shadow-[0_0_16px_rgba(255,255,255,0.2)]'
                : 'bg-[#1C241E] text-white border-white/10'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>Digital Wallet One-Touch Pay</span>
          </button>
        </div>

        {/* 3. Saved Payment Cards */}
        <div>
          <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
            Or Credit / Debit Card
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedMethod('card')}
              className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all press-scale ${
                selectedMethod === 'card'
                  ? 'bg-[#141A15] border-[#C8FF2E] text-[#C8FF2E]'
                  : 'bg-[#1C241E] border-white/5 text-[#A5B0A6]'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-[#C8FF2E]" />
                <div>
                  <span className="font-display font-bold text-xs text-[#F4F7F0] block">
                    Visa ending in 4242
                  </span>
                  <span className="text-[10px] text-[#A5B0A6]">Expires 11/28</span>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  selectedMethod === 'card' ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'border border-white/20'
                }`}
              >
                {selectedMethod === 'card' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          </div>
        </div>

        {/* 4. Promo Code Field */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
          <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
            Promo / Club Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. PLAY5"
              className="flex-1 h-10 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs font-mono text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none uppercase"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleApplyPromo}
              className="text-xs"
            >
              Apply
            </Button>
          </div>
          {promoApplied && (
            <span className="text-[11px] text-[#3DDC84] font-medium block">
              ✓ Promo code applied! £5 discount deducted.
            </span>
          )}
        </div>

        {/* 5. Security Badge */}
        <div className="text-center py-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-[#6F7B71]">
            <Lock className="w-3.5 h-3.5 text-[#3DDC84]" />
            End-to-end encrypted secure checkout
          </span>
        </div>

        {/* 6. Pay CTA Button */}
        <div>
          <Button
            variant="primary"
            size="lg"
            isLoading={isProcessing}
            onClick={handlePay}
            className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)] text-base"
          >
            Pay {APP_CONFIG.currency}{finalTotal} & Confirm Court
          </Button>
        </div>
      </div>
    </div>
  );
};
