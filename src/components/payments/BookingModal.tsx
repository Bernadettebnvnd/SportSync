'use client';

import React, { useState } from 'react';
import { Venue, Court, Session, MatchFormat, PaymentMethod, PaymentCategory } from '@/types';
import { useMonkeyStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { MonkeyMascot } from '@/components/mascot/MonkeyMascot';
import {
  X,
  CreditCard,
  Building2,
  Banknote,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Users,
  User,
  Ticket,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue;
  court?: Court;
  session?: Session;
}

export function BookingModal({
  isOpen,
  onClose,
  venue,
  court,
  session,
}: BookingModalProps) {
  const { submitPayment, joinQueue } = useMonkeyStore();

  // Format state: doubles vs singles
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('doubles');
  const [partnerNames, setPartnerNames] = useState('');
  const [needsPartner, setNeedsPartner] = useState(false);

  // Payment Category: ewallet, bank_transfer, cash
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>('ewallet');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('gcash');

  // Input states
  const [referenceCode, setReferenceCode] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [copiedText, setCopiedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const totalCents = session
    ? session.fee_cents
    : court
    ? court.hourly_rate_cents
    : 35000;

  const title = session
    ? session.title
    : court
    ? `Court Reservation: ${court.name}`
    : 'Match Booking';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/[-\s]/g, ''));
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setReceiptUrl(objectUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentCategory !== 'cash' && !referenceCode.trim()) {
      setErrorMsg('Please enter your transaction reference number');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    setTimeout(() => {
      const isCash = paymentCategory === 'cash';
      const generatedVoucher = `MAT-${Math.floor(1000 + Math.random() * 9000)}`;
      if (isCash) setVoucherCode(generatedVoucher);

      const finalReceipt =
        receiptUrl ||
        (isCash
          ? ''
          : 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80');

      submitPayment({
        sessionId: session?.id || 'sess_friday_smash',
        courtId: court?.id,
        amountCents: totalCents,
        paymentMethod: selectedMethod,
        paymentCategory: paymentCategory,
        referenceCode: isCash ? generatedVoucher : referenceCode.trim(),
        receiptImageUrl: finalReceipt,
        cashVoucherCode: isCash ? generatedVoucher : undefined,
        notes: `Format: ${matchFormat === 'doubles' ? 'Doubles (2v2)' : 'Singles (1v1)'}${
          partnerNames ? ` | Partner: ${partnerNames}` : needsPartner ? ' | Looking for auto-pair' : ''
        }`,
      });

      if (session) {
        const partners = partnerNames
          ? partnerNames.split(',').map((p) => p.trim()).filter(Boolean)
          : [];
        joinQueue(session.id, partners, matchFormat, needsPartner);
      }

      setIsSubmitting(false);
      setIsSuccess(true);

      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#2D724E', '#C87D43', '#E9C46A'],
      });
    }, 700);
  };

  // Payment account helpers
  const paymentInfo = venue.payment_info;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      {/* Responsive Sheet: Bottom-sheet on mobile, centered modal on tablet/desktop */}
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white border border-[#E8E5DF] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-8 animate-in slide-in-from-bottom sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E8E5DF] bg-[#FAF8F5] shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2D724E]">
              {session ? 'Open Play Entry' : 'Court Reservation'}
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#1A241E] truncate max-w-xs sm:max-w-md">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#65756B] hover:bg-[#E8E5DF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          /* Success Screen */
          <div className="p-6 sm:p-8 text-center space-y-4 overflow-y-auto">
            <div className="flex justify-center">
              <MonkeyMascot mood="victory" size="lg" />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF4EE] px-3 py-1 text-xs font-bold text-[#1E4A32]">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {paymentCategory === 'cash' ? 'Cash Booking Confirmed' : 'Proof of Payment Submitted'}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#1A241E]">
              You&apos;re booked! {court ? court.name : 'Your spot'} is waiting.
            </h3>

            {paymentCategory === 'cash' ? (
              <div className="rounded-2xl bg-[#FAF8F5] border-2 border-dashed border-[#C87D43] p-4 text-center">
                <span className="text-xs text-[#65756B] font-bold block">
                  Present Voucher Code at Reception Counter:
                </span>
                <div className="font-mono text-2xl font-black text-[#C87D43] tracking-widest mt-1">
                  {voucherCode}
                </div>
                <p className="text-[11px] text-[#65756B] mt-1">
                  Please pay <strong>{formatCurrency(totalCents)}</strong> in cash upon arrival.
                </p>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-[#65756B] leading-relaxed max-w-sm mx-auto">
                Organizers are verifying your {selectedMethod.toUpperCase()} reference (
                <strong className="text-[#1A241E]">{referenceCode}</strong>).
                You are registered for {matchFormat === 'doubles' ? 'Doubles (2v2)' : 'Singles (1v1)'}!
              </p>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs font-bold shadow-md transition-all min-h-[44px]"
              >
                Done
              </button>
              {session && (
                <a
                  href={`/sessions/${session.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#1A241E] hover:bg-[#2A362F] text-white text-xs font-bold transition-all min-h-[44px]"
                >
                  View Live Queue Board &rarr;
                </a>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
            {/* Amount Summary */}
            <div className="flex items-center justify-between rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] p-3.5">
              <div>
                <span className="text-[11px] text-[#65756B]">Total Amount</span>
                <div className="text-xl sm:text-2xl font-black text-[#2D724E]">
                  {formatCurrency(totalCents)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#65756B]">{venue.name}</span>
                <div className="text-xs font-black text-[#1A241E]">{venue.city}</div>
              </div>
            </div>

            {/* Match Format: Doubles vs Singles */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#1A241E]">
                Select Match Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMatchFormat('doubles')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                    matchFormat === 'doubles'
                      ? 'border-[#2D724E] bg-[#EBF4EE] text-[#1E4A32]'
                      : 'border-[#E8E5DF] bg-white text-[#65756B]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Doubles (2v2)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMatchFormat('singles')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                    matchFormat === 'singles'
                      ? 'border-[#2D724E] bg-[#EBF4EE] text-[#1E4A32]'
                      : 'border-[#E8E5DF] bg-white text-[#65756B]'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Singles (1v1)</span>
                </button>
              </div>

              {matchFormat === 'doubles' && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <input
                    type="text"
                    value={partnerNames}
                    onChange={(e) => {
                      setPartnerNames(e.target.value);
                      if (e.target.value) setNeedsPartner(false);
                    }}
                    placeholder="Doubles partner name (e.g. Renzo Diaz)..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs text-[#1A241E] placeholder:text-[#65756B] focus:ring-2 focus:ring-[#2D724E] focus:outline-none min-h-[42px]"
                  />

                  <label className="flex items-center gap-2 text-xs text-[#65756B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={needsPartner}
                      onChange={(e) => {
                        setNeedsPartner(e.target.checked);
                        if (e.target.checked) setPartnerNames('');
                      }}
                      className="rounded border-[#E8E5DF] text-[#2D724E] focus:ring-[#2D724E] h-4 w-4"
                    />
                    <span>Solo doubles player: auto-pair me with a partner at the court</span>
                  </label>
                </div>
              )}
            </div>

            {/* Payment Method Diversification Tabs */}
            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-bold text-[#1A241E]">
                Payment Option
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF8F5] border border-[#E8E5DF] rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentCategory('ewallet');
                    setSelectedMethod('gcash');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                    paymentCategory === 'ewallet'
                      ? 'bg-white text-[#1A241E] shadow-sm'
                      : 'text-[#65756B]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>E-Wallets</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentCategory('bank_transfer');
                    setSelectedMethod('bdo');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                    paymentCategory === 'bank_transfer'
                      ? 'bg-white text-[#1A241E] shadow-sm'
                      : 'text-[#65756B]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Banks</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentCategory('cash');
                    setSelectedMethod('cash');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                    paymentCategory === 'cash'
                      ? 'bg-white text-[#1A241E] shadow-sm'
                      : 'text-[#65756B]'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>
              </div>
            </div>

            {/* Tab 1: E-Wallets (GCash, Maya, GrabPay) */}
            {paymentCategory === 'ewallet' && (
              <div className="rounded-2xl border border-[#2D724E]/20 bg-[#EBF4EE]/40 p-4 space-y-3 animate-in fade-in">
                {/* Method pills */}
                <div className="flex gap-2">
                  {(['gcash', 'maya', 'grabpay'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedMethod(method)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                        selectedMethod === method
                          ? 'bg-[#2D724E] text-white shadow-sm'
                          : 'bg-white border border-[#E8E5DF] text-[#65756B]'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {/* Account details */}
                <div className="flex items-center justify-between rounded-xl bg-white border border-[#E8E5DF] px-3 py-2">
                  <div>
                    <span className="text-[10px] text-[#65756B] block">
                      {selectedMethod.toUpperCase()} Account ({paymentInfo.gcash_name})
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-black text-[#1A241E]">
                      {paymentInfo.gcash_number || '0917-888-8773'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(paymentInfo.gcash_number || '09178888773', selectedMethod)
                    }
                    className="flex items-center gap-1 text-xs font-bold text-[#2D724E] min-h-[36px] px-2"
                  >
                    {copiedText === selectedMethod ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* QR Code preview */}
                {paymentInfo.gcash_qr_url && (
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={paymentInfo.gcash_qr_url}
                      alt="Payment QR"
                      className="h-16 w-16 rounded-lg border border-[#E8E5DF] bg-white p-1"
                    />
                    <div className="text-xs text-[#65756B]">
                      <span className="font-bold text-[#1A241E]">Scan QR in your App</span>
                      <p className="text-[11px]">Save or scan directly with {selectedMethod.toUpperCase()}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Bank Transfers (BDO, BPI, UnionBank) */}
            {paymentCategory === 'bank_transfer' && (
              <div className="rounded-2xl border border-[#C87D43]/20 bg-[#FBF0E6]/50 p-4 space-y-3 animate-in fade-in">
                <div className="flex gap-2">
                  {(['bdo', 'bpi', 'unionbank'] as const).map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedMethod(bank)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                        selectedMethod === bank
                          ? 'bg-[#C87D43] text-white shadow-sm'
                          : 'bg-white border border-[#E8E5DF] text-[#65756B]'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white border border-[#E8E5DF] px-3 py-2">
                  <div>
                    <span className="text-[10px] text-[#65756B] block">
                      {selectedMethod.toUpperCase()} Account (THE UPPER DECK SPORTS CORP)
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-black text-[#1A241E]">
                      {selectedMethod === 'bdo'
                        ? '0012-3456-7890'
                        : selectedMethod === 'bpi'
                        ? '0987-6543-21'
                        : '1092-8827-3819'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        selectedMethod === 'bdo' ? '001234567890' : '0987654321',
                        selectedMethod
                      )
                    }
                    className="flex items-center gap-1 text-xs font-bold text-[#C87D43] min-h-[36px] px-2"
                  >
                    {copiedText === selectedMethod ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-[#65756B]">
                  Send via InstaPay or PESONet. Upload receipt or type reference number below.
                </div>
              </div>
            )}

            {/* Tab 3: Cash at Venue */}
            {paymentCategory === 'cash' && (
              <div className="rounded-2xl border border-[#2D724E]/20 bg-[#EBF4EE] p-4 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#1E4A32]">
                  <Ticket className="w-4 h-4 text-[#C87D43]" />
                  <span>Pay Cash at Venue Reception Counter</span>
                </div>
                <p className="text-[11px] text-[#65756B] leading-relaxed">
                  You can reserve your court / queue spot now without paying online.
                  Present your reservation voucher code to the venue receptionist or organizer upon arrival!
                </p>
              </div>
            )}

            {/* Reference & Screenshot for E-wallets and Banks */}
            {paymentCategory !== 'cash' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#1A241E]">
                    Reference / Confirmation Number <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder="e.g. 1029 4829 1102 or INSTAPAY-9921"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] text-xs sm:text-sm text-[#1A241E] placeholder:text-[#65756B] focus:ring-2 focus:ring-[#2D724E] focus:outline-none min-h-[42px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#1A241E]">
                    Upload Payment Screenshot (Optional)
                  </label>
                  <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E8E5DF] hover:border-[#2D724E] p-3.5 transition-colors cursor-pointer bg-[#FAF8F5]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSimulateUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {receiptUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={receiptUrl}
                          alt="Receipt preview"
                          className="h-12 w-12 object-cover rounded-lg border border-[#E8E5DF]"
                        />
                        <div className="text-left text-xs">
                          <span className="font-bold text-[#2D724E] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Screenshot Attached
                          </span>
                          <span className="text-[10px] text-[#65756B]">Tap to replace</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto w-5 h-5 text-[#65756B]" />
                        <span className="mt-1 block text-xs font-semibold text-[#1A241E]">
                          Attach receipt or screenshot
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-[#FEE2E2] p-3 text-xs text-[#DC2626]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Confirm CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#2D724E] hover:bg-[#1E4A32] text-white text-xs sm:text-sm font-black shadow-md transition-all active:scale-[0.98] disabled:opacity-50 min-h-[46px]"
              >
                {isSubmitting ? (
                  <span>Processing reservation...</span>
                ) : paymentCategory === 'cash' ? (
                  <span>Confirm Cash Reservation &rarr;</span>
                ) : (
                  <span>Confirm &amp; Submit Payment Proof &rarr;</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
