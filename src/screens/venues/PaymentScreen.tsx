import React, { useState } from 'react';
import {
  ArrowLeft,
  CreditCard,
  Check,
  Smartphone,
  Lock,
  Building2,
  Banknote,
  AlertCircle,
  Copy,
  Info,
  Zap,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { APP_CONFIG } from '../../config/appConfig';

export type PaymentMethodOption = 'gcash' | 'maya' | 'bdo' | 'bpi' | 'unionbank' | 'cash';

interface PaymentScreenProps {
  totalAmount?: number;
  bookingDetails?: {
    venue?: any;
    venueId?: string;
    venueName?: string;
    court?: string;
    courtId?: string;
    slot: string;
    date?: string;
    duration?: number;
    sport?: string;
    totalPrice?: number;
  };
  onBack: () => void;
  onPaymentSuccess: (booking?: any) => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  totalAmount = 450,
  bookingDetails,
  onBack,
  onPaymentSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodOption>('gcash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const discountAmount = promoApplied ? 50 : 0;
  const finalTotal = Math.max(0, totalAmount - discountAmount);

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'PLAY50' || promoCode.trim().length >= 4) {
      setPromoApplied(true);
      setErrorMessage(null);
    } else {
      setErrorMessage('Invalid promo code. Try "PLAY50" for ₱50 off.');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAccount(label);
      setTimeout(() => setCopiedAccount(null), 2500);
    }
  };

  const isCash = selectedMethod === 'cash';

  const handlePay = async () => {
    setErrorMessage(null);

    // Validation: Require reference number for digital payment methods
    if (!isCash) {
      const trimmedRef = referenceNumber.trim();
      if (!trimmedRef) {
        setErrorMessage('Please enter the transaction reference number from your payment receipt.');
        return;
      }
      if (trimmedRef.length < 6) {
        setErrorMessage('Reference number must be at least 6 digits/characters.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      const venueId =
        bookingDetails?.venueId ||
        bookingDetails?.venue?.id ||
        'venue_upper_deck';

      const courtId =
        bookingDetails?.courtId ||
        `${venueId}_c1`;

      const startTime =
        bookingDetails?.slot?.split('–')[0]?.trim() ||
        bookingDetails?.slot?.split('-')[0]?.trim() ||
        '10:00';

      const paymentCategory = isCash
        ? 'cash'
        : ['bdo', 'bpi', 'unionbank'].includes(selectedMethod)
        ? 'bank_transfer'
        : 'ewallet';

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          venueId,
          courtId,
          sport: bookingDetails?.sport || 'pickleball',
          bookingDate: bookingDetails?.date || '2026-10-17',
          startTime,
          durationMinutes: Math.round((bookingDetails?.duration || 1) * 60),
          paymentMethod: selectedMethod,
          paymentCategory,
          referenceCode: isCash ? undefined : referenceNumber.trim(),
          notes: promoApplied ? 'Promo code PLAY50 applied (₱50 discount)' : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process court reservation.');
      }

      // Success: pass confirmed booking to caller
      onPaymentSuccess(data.booking);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment confirmation failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#0B0F0C] text-[#F4F7F0] p-5 pt-4 pb-28 select-none overflow-y-auto no-scrollbar">
      {/* 1. Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors press-scale"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="font-display font-black text-base text-[#F4F7F0]">
          Checkout &amp; Payment
        </h1>

        <div className="w-9" />
      </div>

      <div className="space-y-5">
        {/* Order Summary Card */}
        <div className="p-4 rounded-3xl bg-[#141A15] border border-white/5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#A5B0A6] block tracking-wider">
              {bookingDetails?.court || 'Court 1'} &bull; {bookingDetails?.slot || '10:00'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-display font-black text-2xl text-[#C8FF2E] tabular-nums">
                {APP_CONFIG.currency}{finalTotal}
              </span>
              {promoApplied && (
                <span className="text-xs text-[#A5B0A6] line-through tabular-nums">
                  {APP_CONFIG.currency}{totalAmount}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#A5B0A6]">
              {bookingDetails?.venueName || bookingDetails?.venue?.name || 'Verified Sports Court'}
            </span>
          </div>

          <span className="text-xs text-[#3DDC84] font-semibold bg-[#3DDC84]/15 px-3 py-1.5 rounded-full border border-[#3DDC84]/30">
            Instant Confirmation
          </span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-[#E0533C]/15 border border-[#E0533C]/40 text-[#FFA394] text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E0533C]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 2. Philippine Payment Methods Selection */}
        <div>
          <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block mb-2">
            Select Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* GCash */}
            <button
              type="button"
              onClick={() => {
                setSelectedMethod('gcash');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all press-scale ${
                selectedMethod === 'gcash'
                  ? 'bg-[#141A15] border-[#C8FF2E] text-[#F4F7F0] shadow-[0_0_14px_rgba(200,255,46,0.2)]'
                  : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-sm text-[#007DFE]">GCash</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#007DFE]/20 text-[#007DFE]">
                  E-Wallet
                </span>
              </div>
              <span className="text-[10px] text-[#A5B0A6] block">Scan QR or Send Money</span>
            </button>

            {/* Maya */}
            <button
              type="button"
              onClick={() => {
                setSelectedMethod('maya');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all press-scale ${
                selectedMethod === 'maya'
                  ? 'bg-[#141A15] border-[#C8FF2E] text-[#F4F7F0] shadow-[0_0_14px_rgba(200,255,46,0.2)]'
                  : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-sm text-[#00E575]">Maya</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#00E575]/20 text-[#00E575]">
                  E-Wallet
                </span>
              </div>
              <span className="text-[10px] text-[#A5B0A6] block">Maya Wallet / QR Ph</span>
            </button>

            {/* Bank Transfer */}
            <button
              type="button"
              onClick={() => {
                setSelectedMethod('bdo');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all press-scale ${
                ['bdo', 'bpi', 'unionbank'].includes(selectedMethod)
                  ? 'bg-[#141A15] border-[#C8FF2E] text-[#F4F7F0] shadow-[0_0_14px_rgba(200,255,46,0.2)]'
                  : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-[#F4F7F0] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#C8FF2E]" />
                  Bank Transfer
                </span>
              </div>
              <span className="text-[10px] text-[#A5B0A6] block">BDO, BPI, UnionBank</span>
            </button>

            {/* Cash at Venue */}
            <button
              type="button"
              onClick={() => {
                setSelectedMethod('cash');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all press-scale ${
                selectedMethod === 'cash'
                  ? 'bg-[#141A15] border-[#C8FF2E] text-[#F4F7F0] shadow-[0_0_14px_rgba(200,255,46,0.2)]'
                  : 'bg-[#1C241E] border-white/5 text-[#A5B0A6] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-[#F4F7F0] flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-[#3DDC84]" />
                  Cash at Venue
                </span>
              </div>
              <span className="text-[10px] text-[#A5B0A6] block">Pay at Reception Desk</span>
            </button>
          </div>
        </div>

        {/* 3. Account Details & Instruction Panel */}
        {selectedMethod === 'gcash' && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-[#007DFE]/40 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F4F7F0] flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#007DFE]" />
                GCash Account Details
              </span>
              <span className="text-[10px] text-[#3DDC84] font-semibold">Verified Merchant</span>
            </div>

            <div className="p-3 rounded-xl bg-[#1C241E] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#A5B0A6] uppercase tracking-wider block">
                  GCash Mobile Number
                </span>
                <span className="font-mono font-bold text-sm text-[#F4F7F0] tracking-wide">
                  0917-839-2819
                </span>
                <span className="text-[10px] text-[#A5B0A6] block">SportSync Philippines</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('09178392819', 'GCash')}
                className="px-2.5 py-1.5 rounded-lg bg-[#141A15] hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#C8FF2E] flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedAccount === 'GCash' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-[11px] text-[#A5B0A6]">
              Send <strong className="text-[#F4F7F0]">{APP_CONFIG.currency}{finalTotal}</strong> via GCash &quot;Send Money&quot; or QR, then paste the 10–13 digit Reference Number below.
            </p>
          </div>
        )}

        {selectedMethod === 'maya' && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-[#00E575]/40 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F4F7F0] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#00E575]" />
                Maya Account Details
              </span>
              <span className="text-[10px] text-[#3DDC84] font-semibold">Verified Merchant</span>
            </div>

            <div className="p-3 rounded-xl bg-[#1C241E] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#A5B0A6] uppercase tracking-wider block">
                  Maya Account Number
                </span>
                <span className="font-mono font-bold text-sm text-[#F4F7F0] tracking-wide">
                  0918-294-8172
                </span>
                <span className="text-[10px] text-[#A5B0A6] block">SportSync PH Official</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('09182948172', 'Maya')}
                className="px-2.5 py-1.5 rounded-lg bg-[#141A15] hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#C8FF2E] flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedAccount === 'Maya' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-[11px] text-[#A5B0A6]">
              Send <strong className="text-[#F4F7F0]">{APP_CONFIG.currency}{finalTotal}</strong> via Maya, then enter your Reference Number below.
            </p>
          </div>
        )}

        {['bdo', 'bpi', 'unionbank'].includes(selectedMethod) && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-[#C8FF2E]/30 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#F4F7F0]">Choose Bank:</span>
              <div className="flex gap-1.5">
                {(['bdo', 'bpi', 'unionbank'] as PaymentMethodOption[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedMethod(b)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      selectedMethod === b
                        ? 'bg-[#C8FF2E] text-[#0B0F0C]'
                        : 'bg-[#1C241E] text-[#A5B0A6] hover:text-white'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1C241E] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#A5B0A6] uppercase tracking-wider block">
                  {selectedMethod.toUpperCase()} Account No.
                </span>
                <span className="font-mono font-bold text-sm text-[#F4F7F0] tracking-wide">
                  {selectedMethod === 'bdo'
                    ? '0021-9876-5432'
                    : selectedMethod === 'bpi'
                    ? '3210-9876-54'
                    : '1098-7654-3210'}
                </span>
                <span className="text-[10px] text-[#A5B0A6] block">Account Name: SportSync Sports PH Inc.</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    selectedMethod === 'bdo' ? '002198765432' : selectedMethod === 'bpi' ? '3210987654' : '109876543210',
                    'Bank'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-[#141A15] hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#C8FF2E] flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedAccount === 'Bank' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-[11px] text-[#A5B0A6]">
              Transfer <strong className="text-[#F4F7F0]">{APP_CONFIG.currency}{finalTotal}</strong> via Instapay/PESONet, then enter your Bank Reference / Transaction Code below.
            </p>
          </div>
        )}

        {isCash && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-[#3DDC84]/30 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-[#3DDC84]">
              <Banknote className="w-4 h-4" />
              <span>Cash at Venue Desk</span>
            </div>
            <p className="text-xs text-[#A5B0A6] leading-relaxed">
              Your court is reserved instantly! Please arrive at the facility counter 15 minutes before kickoff to pay <strong className="text-[#F4F7F0]">{APP_CONFIG.currency}{finalTotal}</strong> in cash and receive your court pass.
            </p>
          </div>
        )}

        {/* 4. Reference Number Input (For digital payments) */}
        {!isCash && (
          <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
                Payment Reference Number <span className="text-[#C8FF2E]">*</span>
              </label>
              <span className="text-[10px] text-[#A5B0A6]">Required for verification</span>
            </div>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => {
                setReferenceNumber(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="e.g. 100293847291 or TXN-82914"
              className="w-full h-11 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-sm font-mono text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none placeholder:text-[#6F7B71]"
            />
            <span className="text-[10px] text-[#6F7B71] block">
              Found on your transaction confirmation screen or SMS receipt.
            </span>
          </div>
        )}

        {/* 5. Promo Code Field */}
        <div className="p-4 rounded-2xl bg-[#141A15] border border-white/5 space-y-2">
          <label className="text-[11px] font-bold text-[#A5B0A6] uppercase tracking-wider block">
            Promo / Discount Voucher
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. PLAY50"
              className="flex-1 h-10 px-3.5 rounded-xl bg-[#1C241E] border border-white/10 text-xs font-mono text-[#F4F7F0] focus:border-[#C8FF2E] focus:outline-none uppercase placeholder:text-[#6F7B71]"
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
              ✓ Promo code applied! ₱50 discount deducted.
            </span>
          )}
        </div>

        {/* 6. Security & Policy Badge */}
        <div className="text-center py-1 space-y-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-[#6F7B71]">
            <Lock className="w-3.5 h-3.5 text-[#3DDC84]" />
            End-to-end encrypted secure reservation desk
          </span>
        </div>

        {/* 7. Pay & Confirm Button */}
        <div>
          <Button
            variant="primary"
            size="lg"
            isLoading={isProcessing}
            onClick={handlePay}
            className="w-full font-bold shadow-[0_8px_24px_rgba(200,255,46,0.3)] text-base press-scale"
          >
            {isProcessing
              ? 'Verifying & Confirming...'
              : isCash
              ? `Confirm Court Reservation (${APP_CONFIG.currency}${finalTotal})`
              : `Pay ${APP_CONFIG.currency}${finalTotal} & Confirm Court`}
          </Button>
        </div>
      </div>
    </div>
  );
};
