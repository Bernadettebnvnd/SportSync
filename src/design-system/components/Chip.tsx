import React from 'react';

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  variant?: 'sport' | 'filter' | 'tag';
  badge?: string | number;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  active = false,
  variant = 'sport',
  badge,
  className = '',
  ...props
}) => {
  if (variant === 'sport') {
    // Horizontal sport chips (Ref A): lime-outlined active state with dark fill
    return (
      <button
        className={`h-10 px-4 rounded-full flex items-center gap-2 text-xs font-semibold tracking-wide transition-all shrink-0 press-scale select-none border ${
          active
            ? 'bg-[#141A15] text-[#C8FF2E] border-[#C8FF2E] shadow-[0_0_16px_rgba(200,255,46,0.2)]'
            : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:border-white/15 hover:text-[#F4F7F0]'
        } ${className}`}
        {...props}
      >
        {icon && <span className={`w-4 h-4 ${active ? 'text-[#C8FF2E]' : 'text-[#6F7B71]'}`}>{icon}</span>}
        <span>{label}</span>
      </button>
    );
  }

  if (variant === 'tag') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider ${className}`}
      >
        {icon && <span className="w-3.5 h-3.5">{icon}</span>}
        <span>{label}</span>
      </span>
    );
  }

  // Filter Chip
  return (
    <button
      className={`h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 press-scale border ${
        active
          ? 'bg-[#C8FF2E] text-[#0B0F0C] border-[#C8FF2E] font-semibold'
          : 'bg-[#1C241E] text-[#A5B0A6] border-white/5 hover:text-[#F4F7F0]'
      } ${className}`}
      {...props}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            active ? 'bg-[#0B0F0C] text-[#C8FF2E]' : 'bg-white/10 text-white'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

export const TagBadge: React.FC<{
  type: 'indoor' | 'outdoor' | 'clay' | 'grass' | 'turf' | 'urgent' | 'casual' | 'competitive';
  label?: string;
  className?: string;
}> = ({ type, label, className = '' }) => {
  const configs = {
    indoor: { text: label || 'Indoor', bg: 'bg-[#1C241E] text-[#A5B0A6] border border-white/10' },
    outdoor: { text: label || 'Outdoor', bg: 'bg-[#1C241E] text-[#A5B0A6] border border-white/10' },
    clay: { text: label || 'Clay Court', bg: 'bg-[#C8432B]/15 text-[#FF8570] border border-[#C8432B]/30' },
    grass: { text: label || 'Grass Pitch', bg: 'bg-[#0F2A22] text-[#3DDC84] border border-[#3DDC84]/30' },
    turf: { text: label || '3G Turf', bg: 'bg-[#1C241E] text-[#C8FF2E] border border-[#C8FF2E]/30' },
    urgent: { text: label || '2 spots left', bg: 'bg-[#FF8FC7]/15 text-[#FF8FC7] border border-[#FF8FC7]/30 font-semibold' },
    casual: { text: label || 'Casual', bg: 'bg-[#1C241E] text-[#A5B0A6] border border-white/10' },
    competitive: { text: label || 'Competitive', bg: 'bg-[#C8FF2E]/15 text-[#C8FF2E] border border-[#C8FF2E]/30' },
  }[type];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide ${configs.bg} ${className}`}
    >
      {configs.text}
    </span>
  );
};
