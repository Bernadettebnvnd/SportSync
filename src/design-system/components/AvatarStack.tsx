import React from 'react';
import { UserAvatar, AvatarId } from '../../illustrations/Avatars';

interface AvatarStackProps {
  avatars: AvatarId[];
  size?: number;
  maxVisible?: number;
  overflowCount?: number;
  className?: string;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  avatars,
  size = 28,
  maxVisible = 3,
  overflowCount,
  className = '',
}) => {
  const visible = avatars.slice(0, maxVisible);
  const remaining = overflowCount !== undefined ? overflowCount : Math.max(0, avatars.length - maxVisible);

  return (
    <div className={`flex items-center -space-x-2 select-none ${className}`}>
      {visible.map((id, index) => (
        <div
          key={index}
          style={{ zIndex: 10 - index }}
          className="rounded-full ring-2 ring-[#0B0F0C]"
        >
          <UserAvatar id={id} size={size} />
        </div>
      ))}

      {remaining > 0 && (
        <div
          style={{ width: size, height: size, zIndex: 0 }}
          className="rounded-full bg-[#1C241E] ring-2 ring-[#0B0F0C] text-[#C8FF2E] font-display font-semibold text-[10px] flex items-center justify-center shrink-0"
        >
          +{remaining > 999 ? `${(remaining / 1000).toFixed(1)}k` : remaining}
        </div>
      )}
    </div>
  );
};
