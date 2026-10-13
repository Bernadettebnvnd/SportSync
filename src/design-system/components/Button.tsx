import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'social' | 'ghost' | 'pill-arrow';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-13 px-6 text-base',
  }[size];

  // Base styling with 44px min touch target, spring press scale, accessible focus
  let variantClasses = '';
  switch (variant) {
    case 'primary':
      variantClasses =
        'bg-[#C8FF2E] text-[#0B0F0C] font-semibold hover:bg-[#BCEE26] shadow-sm focus-visible:ring-2 focus-visible:ring-[#C8FF2E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F0C]';
      break;
    case 'secondary':
      variantClasses =
        'bg-[#1C241E] text-[#F4F7F0] border border-white/10 hover:bg-[#263028] hover:border-white/20 focus-visible:ring-2 focus-visible:ring-[#C8FF2E]';
      break;
    case 'social':
      variantClasses =
        'bg-[#FF8FC7] text-[#0B0F0C] font-semibold hover:bg-[#f67cb9] focus-visible:ring-2 focus-visible:ring-[#FF8FC7]';
      break;
    case 'ghost':
      variantClasses =
        'bg-transparent text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/20';
      break;
    case 'pill-arrow':
      // Ref C: wide lime pill with black circular arrow button inside
      return (
        <button
          disabled={disabled || isLoading}
          className={`group w-full h-14 rounded-full bg-[#C8FF2E] text-[#0B0F0C] font-display font-bold text-base px-6 flex items-center justify-between transition-all duration-150 press-scale disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(200,255,46,0.22)] ${className}`}
          {...props}
        >
          <span className="flex items-center gap-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : leftIcon}
            {children}
          </span>
          <span className="w-10 h-10 rounded-full bg-[#0B0F0C] text-[#C8FF2E] flex items-center justify-center transition-transform group-hover:translate-x-1 shrink-0">
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </span>
        </button>
      );
  }

  return (
    <button
      disabled={disabled || isLoading}
      className={`${
        fullWidth ? 'w-full' : 'inline-flex'
      } items-center justify-center gap-2 rounded-full font-sans transition-all duration-150 press-scale disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  active?: boolean;
  variant?: 'dark' | 'glass' | 'lime' | 'pink';
  size?: number;
}> = ({ icon, active = false, variant = 'dark', size = 44, className = '', ...props }) => {
  let styleClasses = 'bg-[#1C241E] text-[#F4F7F0] border border-white/10 hover:border-white/25';
  if (variant === 'glass') {
    styleClasses = 'glass-pill text-[#F4F7F0] hover:bg-white/10';
  } else if (variant === 'lime') {
    styleClasses = 'bg-[#C8FF2E] text-[#0B0F0C] hover:bg-[#BCEE26]';
  } else if (variant === 'pink') {
    styleClasses = 'bg-[#FF8FC7] text-[#0B0F0C] hover:bg-[#f67cb9]';
  }

  return (
    <button
      style={{ width: size, height: size }}
      className={`rounded-full flex items-center justify-center transition-all press-scale shrink-0 focus-visible:ring-2 focus-visible:ring-[#C8FF2E] ${
        active ? 'border-[#C8FF2E] text-[#C8FF2E]' : ''
      } ${styleClasses} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
