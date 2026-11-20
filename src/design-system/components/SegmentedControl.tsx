import React, { useState, useEffect } from 'react';

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

// 3. Player / Count Stepper
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
}> = ({
  value,
  onChange,
  min = 1,
  max = 22,
  step = 1,
  unit = '',
  prefix = '',
  ariaLabel = 'value',
  className = '',
  allowInput = true,
}) => {
  const [localVal, setLocalVal] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(String(value));
    }
  }, [value, isFocused]);

  const handleDecrement = () => {
    const next = Math.max(min, Number((value - step).toFixed(2)));
    onChange(next);
    setLocalVal(String(next));
  };

  const handleIncrement = () => {
    const next = Math.min(max, Number((value + step).toFixed(2)));
    onChange(next);
    setLocalVal(String(next));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const isDecimalAllowed = step % 1 !== 0;
    const sanitized = isDecimalAllowed ? raw.replace(/[^0-9.]/g, '') : raw.replace(/[^0-9]/g, '');
    setLocalVal(sanitized);

    if (sanitized !== '' && sanitized !== '.') {
      const parsed = parseFloat(sanitized);
      if (!isNaN(parsed) && parsed <= max) {
        onChange(parsed);
      }
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    if (!localVal || localVal === '' || localVal === '.') {
      onChange(min);
      setLocalVal(String(min));
      return;
    }
    const parsed = parseFloat(localVal);
    if (isNaN(parsed) || parsed < min) {
      onChange(min);
      setLocalVal(String(min));
    } else if (parsed > max) {
      onChange(max);
      setLocalVal(String(max));
    } else {
      const finalVal = Number(parsed.toFixed(step % 1 !== 0 ? 1 : 0));
      onChange(finalVal);
      setLocalVal(String(finalVal));
    }
  };

  return (
    <div
      className={`inline-flex items-center bg-[#1C241E] border border-white/10 rounded-2xl p-1 gap-1 select-none ${className}`}
    >
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel}`}
        onClick={handleDecrement}
        disabled={value <= min}
        className="w-9 h-9 rounded-xl bg-[#263028] text-[#F4F7F0] hover:bg-[#323e34] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg press-scale transition-all shrink-0"
      >
        -
      </button>
      <div className="min-w-[70px] px-1 text-center flex items-center justify-center">
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
            value={localVal}
            onChange={handleInputChange}
            onFocus={(e) => {
              setIsFocused(true);
              e.target.select();
            }}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            aria-label={ariaLabel}
            title="Click or tap to type custom amount"
            className="w-16 bg-white/5 border border-white/10 hover:border-white/25 focus:border-[#C8FF2E] rounded-lg px-1.5 py-0.5 text-center font-display font-bold text-base text-[#F4F7F0] tabular-nums focus:outline-none focus:ring-1 focus:ring-[#C8FF2E]/50 transition-all cursor-text select-text"
          />
        ) : (
          <span className="font-display font-bold text-base text-[#F4F7F0] tabular-nums">
            {value}
          </span>
        )}
        {unit && <span className="text-xs text-[#A5B0A6] ml-1 select-none shrink-0">{unit}</span>}
      </div>
      <button
        type="button"
        aria-label={`Increase ${ariaLabel}`}
        onClick={handleIncrement}
        disabled={value >= max}
        className="w-9 h-9 rounded-xl bg-[#C8FF2E] text-[#0B0F0C] hover:bg-[#bbee26] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg press-scale transition-all shrink-0"
      >
        +
      </button>
    </div>
  );
};

