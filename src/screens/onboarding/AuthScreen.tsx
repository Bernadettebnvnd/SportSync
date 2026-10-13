import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { APP_CONFIG } from '../../config/appConfig';

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onBack }) => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('alex.rivera@example.com');
  const [password, setPassword] = useState('••••••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess();
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between bg-[#0B0F0C] p-6 pt-8 select-none overflow-y-auto no-scrollbar">
      {/* Top Header */}
      <div>
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#1C241E] text-[#A5B0A6] hover:text-white flex items-center justify-center transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Subtle Illustrated Banner Header */}
        <div className="p-4 rounded-3xl bg-[#0F2A22] border border-white/10 mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8FF2E] text-[#0B0F0C] flex items-center justify-center font-display font-black text-xl shrink-0 shadow-sm">
            {APP_CONFIG.appName.slice(0, 2)}
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-[#F4F7F0]">
              {isSignUp ? 'Create your profile' : 'Welcome back'}
            </h2>
            <p className="text-xs text-[#A5B0A6]">
              {isSignUp ? 'Join thousands of local players' : 'Your match is waiting'}
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-2xl bg-[#141A15] p-1 border border-white/5 mb-6">
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              isSignUp ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'text-[#A5B0A6]'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              !isSignUp ? 'bg-[#C8FF2E] text-[#0B0F0C]' : 'text-[#A5B0A6]'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold text-[#A5B0A6] uppercase tracking-wider block mb-1.5 ml-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-[#6F7B71]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
                placeholder="your.email@sport.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#A5B0A6] uppercase tracking-wider block mb-1.5 ml-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-[#6F7B71]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-2xl bg-[#1C241E] border border-white/10 text-sm text-[#F4F7F0] focus:outline-none focus:border-[#C8FF2E]"
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>

          <Button variant="primary" size="lg" type="submit" className="w-full mt-4 font-bold">
            {isSignUp ? 'Continue to Preferences' : 'Enter SIDELINE'}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] text-[#6F7B71] uppercase tracking-wider font-semibold">
            Or quick sign-in
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Social Sign-in Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSuccess}
            className="h-12 rounded-2xl bg-[#1C241E] hover:bg-[#263028] border border-white/10 flex items-center justify-center gap-2 text-xs font-semibold text-[#F4F7F0] transition-all press-scale"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.66-.99 1.72-.86 2.73 1 .08 1.95-.48 2.57-1.23z" />
            </svg>
            <span>Apple ID</span>
          </button>

          <button
            onClick={onSuccess}
            className="h-12 rounded-2xl bg-[#1C241E] hover:bg-[#263028] border border-white/10 flex items-center justify-center gap-2 text-xs font-semibold text-[#F4F7F0] transition-all press-scale"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-white">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google</span>
          </button>
        </div>
      </div>

      {/* Security badge at bottom */}
      <div className="py-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#6F7B71]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3DDC84]" />
          256-bit secure player data encryption
        </span>
      </div>
    </div>
  );
};
