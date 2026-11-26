import React, { useState, useEffect, useRef } from 'react';

// 1. Segmented Control
export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  badge?: number | string;
}

export const SegmentedControl = <T extends string>({
  options,
  selectedId,
  onChange,
  className = '',
}: {
  options: SegmentOption<T>[];
  selectedId: T;
  onChange: (id: T) => void;
  className?: string;
}) => {
  return (
    <div
      className={`p-1 rounded-2xl bg-[#141A15] border border-white/5 flex items-center gap-1 select-none ${className}`}
    >
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(opt.id)}
            className={`flex-1 py-2 px-3 rounded-xl font-display text-xs font-semibold transition-all duration-150 press-scale flex items-center justify-center gap-1.5 ${
              isSelected
                ? 'bg-[#C8FF2E] text-[#0B0F0C] shadow-sm'
                : 'text-[#A5B0A6] hover:text-[#F4F7F0] hover:bg-white/5'
            }`}
          >
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-[#0B0F0C] text-[#C8FF2E]' : 'bg-[#1C241E] text-[#A5B0A6]'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// 2. Electric Lime Toggle Switch
export const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
  className?: string;
}> = ({ checked, onChange, label, sublabel, disabled = false, className = '' }) => {
  return (
    <div
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={`w-full flex items-center justify-between gap-4 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {(label || sublabel) && (
        <div className="flex flex-col text-left">
          {label && <span className="text-sm font-semibold text-[#F4F7F0]">{label}</span>}
          {sublabel && <span className="text-xs text-[#A5B0A6]">{sublabel}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(!checked);
        }}
        className={`w-12 h-7 rounded-full transition-colors duration-200 p-0.5 relative shrink-0 ${
          checked ? 'bg-[#C8FF2E]' : 'bg-[#263028]'
        }`}
      >
        <span
          className={`block w-6 h-6 rounded-full bg-[#0B0F0C] transition-transform duration-200 shadow-sm ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

// 3. Player / Count / Fee Stepper (single numeric input + press-and-hold auto-repeat)
export const Stepper: React.FC<{
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  prefix?: string;
  ariaLabel?: string;
  className?: string;
  allowInput?: boolean;
  onOutOfBoundsChange?: (message: string | null) => void;
}> = ({
  value,
  onChange,
  min = 1,
  max = 24,
  step = 1,
  unit = '',
  prefix = '',
  ariaLabel = 'value',
  className = '',
  allowInput = true,
  onOutOfBoundsChange,
}) => {
  const [localVal, setLocalVal] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const valueRef = useRef<number>(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const displayedVal = isFocused ? localVal : String(value);

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  useEffect(() => stopHold, []);

  const stepBy = (direction: -1 | 1) => {
    const current = valueRef.current;
    const rawNext = Number((current + direction * step).toFixed(2));
    const next = Math.max(min, Math.min(max, rawNext));
    if (next !== current) {
      valueRef.current = next;
      onChange(next);
      setLocalVal(String(next));
      onOutOfBoundsChange?.(null);
    }
  };

  const startHold = (direction: -1 | 1) => {
    stopHold();
    stepBy(direction);
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        stepBy(direction);
      }, 90);
    }, 380);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const isDecimalAllowed = step % 1 !== 0;
    const sanitized = isDecimalAllowed ? raw.replace(/[^0-9.]/g, '') : raw.replace(/[^0-9]/g, '');
    setLocalVal(sanitized);

    if (sanitized === '' || sanitized === '.') {
      onOutOfBoundsChange?.(null);
      return;
    }

    const parsed = isDecimalAllowed ? parseFloat(sanitized) : parseInt(sanitized, 10);
    if (!Number.isFinite(parsed)) return;

    if (parsed < min) {
      onOutOfBoundsChange?.(`Minimum is ${prefix}${min}${unit ? ` ${unit}` : ''}`);
    } else if (parsed > max) {
      onOutOfBoundsChange?.(`Maximum is ${prefix}${max}${unit ? ` ${unit}` : ''}`);
    } else {
      onOutOfBoundsChange?.(null);
    }
  };

  const commitInput = () => {
    setIsFocused(false);
    const isDecimalAllowed = step % 1 !== 0;
    const trimmed = localVal.trim();
    if (!trimmed || trimmed === '.') {
      // Revert empty input to last valid value
      setLocalVal(String(valueRef.current));
      onOutOfBoundsChange?.(null);
      return;
    }

    const parsed = isDecimalAllowed ? parseFloat(trimmed) : parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
      setLocalVal(String(valueRef.current));
      onOutOfBoundsChange?.(null);
      return;
    }

    const clamped = Math.max(min, Math.min(max, parsed));
    const finalVal = Number(clamped.toFixed(isDecimalAllowed ? 1 : 0));
    valueRef.current = finalVal;
    onChange(finalVal);
    setLocalVal(String(finalVal));
    onOutOfBoundsChange?.(null);
  };

  return (
    <div
      className={`inline-flex items-center bg-[#1C241E] border border-white/10 rounded-2xl p-1 gap-1.5 select-none ${className}`}
    >
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel}`}
        onPointerDown={(e) => {
          if (value <= min || e.button !== 0) return;
          e.preventDefault();
          startHold(-1);
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            stepBy(-1);
          }
        }}
        disabled={value <= min}
        className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-[#263028] text-[#F4F7F0] hover:bg-[#323e34] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg press-scale transition-all shrink-0"
      >
        -
      </button>
      <div className="min-w-[78px] px-1 text-center flex items-center justify-center flex-1">
        {prefix && (
          <span className="font-display font-bold text-base text-[#C8FF2E] mr-0.5 select-none shrink-0">
            {prefix}
          </span>
        )}
        {allowInput ? (
          <input
            type="text"
            inputMode={step % 1 !== 0 ? 'decimal' : 'numeric'}
            pattern={step % 1 !== 0 ? '[0-9.]*' : '[0-9]*'}
            value={displayedVal}
            onChange={handleInputChange}
            onFocus={(e) => {
              setLocalVal(String(value));
              setIsFocused(true);
              e.target.select();
            }}
            onBlur={commitInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            aria-label={ariaLabel}
            title="Tap to type exact amount"
            className="w-20 min-h-[44px] bg-white/5 border border-white/10 hover:border-white/25 focus:border-[#C8FF2E] rounded-xl px-2 py-1 text-center font-display font-bold text-base text-[#F4F7F0] tabular-nums focus:outline-none focus:ring-1 focus:ring-[#C8FF2E]/50 transition-all cursor-text select-text"
          />
        ) : (
          <span className="font-display font-bold text-base text-[#F4F7F0] tabular-nums">
            {value}
          </span>
        )}
        {unit && <span className="text-xs text-[#A5B0A6] ml-1.5 select-none shrink-0">{unit}</span>}
      </div>
      <button
        type="button"
        aria-label={`Increase ${ariaLabel}`}
        onPointerDown={(e) => {
          if (value >= max || e.button !== 0) return;
          e.preventDefault();
          startHold(1);
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            stepBy(1);
          }
        }}
        disabled={value >= max}
        className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] hover:bg-[#bbee26] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg press-scale transition-all shrink-0"
      >
        +
      </button>
    </div>
  );
};

