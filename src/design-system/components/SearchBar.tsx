import React from 'react';
import { Search, SlidersHorizontal, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { EmptyMatchesScene } from '../../illustrations/Scenes';
import { Button } from './Button';

// 1. Search Bar with Filter Trigger Button
export const SearchBar: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  filterActive?: boolean;
  className?: string;
}> = ({
  value,
  onChange,
  placeholder = 'Search teams, courts, matches...',
  onFilterClick,
  filterActive = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2.5 w-full ${className}`}>
      <div className="relative flex-1 flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-[#6F7B71] pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 pl-10 pr-9 rounded-2xl bg-[#1C241E] border border-white/5 text-sm text-[#F4F7F0] placeholder-[#6F7B71] focus:outline-none focus:border-[#C8FF2E] transition-all"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 w-5 h-5 rounded-full bg-white/10 text-white/70 hover:text-white flex items-center justify-center text-xs"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {onFilterClick && (
        <button
          onClick={onFilterClick}
          className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all press-scale border shrink-0 ${
            filterActive
              ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E]'
              : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:border-white/15'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// 2. Toast Notification
export const Toast: React.FC<{
  message: string;
  type?: 'success' | 'info' | 'alert';
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}> = ({ message, type = 'success', isOpen, onClose, className = '' }) => {
  if (!isOpen) return null;

  const typeConfig = {
    success: { icon: CheckCircle, border: 'border-[#C8FF2E]/40', text: 'text-[#C8FF2E]' },
    alert: { icon: AlertCircle, border: 'border-[#FF8FC7]/40', text: 'text-[#FF8FC7]' },
    info: { icon: Info, border: 'border-white/20', text: 'text-[#F4F7F0]' },
  }[type];

  const Icon = typeConfig.icon;

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-sm rounded-2xl bg-[#141A15]/95 backdrop-blur-xl border ${typeConfig.border} p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-slideDown ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`w-5 h-5 ${typeConfig.text} shrink-0`} />
        <span className="text-xs font-semibold text-[#F4F7F0]">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-[#6F7B71] hover:text-white p-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

// 3. Shimmering Skeleton Loader
export const Skeleton: React.FC<{
  className?: string;
}> = ({ className = 'w-full h-16' }) => {
  return (
    <div
      className={`rounded-2xl bg-[#1C241E] lime-shimmer relative overflow-hidden ${className}`}
    />
  );
};

// 4. Illustrated Empty State
export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}> = ({
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 ${className}`}>
      <EmptyMatchesScene className="w-52 h-36 mb-4" />
      <h3 className="font-display font-bold text-lg text-[#F4F7F0] mb-1">{title}</h3>
      <p className="text-xs text-[#A5B0A6] max-w-xs mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
