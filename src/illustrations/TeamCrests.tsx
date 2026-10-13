import React from 'react';

export type TeamCrestId =
  | 'northgate'
  | 'riverside'
  | 'marlow'
  | 'kensington'
  | 'apex'
  | 'solar'
  | 'dynamo'
  | 'coastline';

interface TeamCrestProps {
  id: TeamCrestId;
  size?: number;
  className?: string;
}

export const TeamCrest: React.FC<TeamCrestProps> = ({ id, size = 40, className = '' }) => {
  switch (id) {
    case 'northgate':
      // Shield variant: Forest green shield, electric lime chevron, star
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
        >
          <path
            d="M50 8L88 22V52C88 74 50 92 50 92C50 92 12 74 12 52V22L50 8Z"
            fill="#0F2A22"
            stroke="#C8FF2E"
            strokeWidth="4"
          />
          <path d="M50 20L76 42H24L50 20Z" fill="#C8FF2E" opacity="0.9" />
          <path d="M50 48L72 66H28L50 48Z" fill="#FF8FC7" opacity="0.75" />
          <circle cx="50" cy="36" r="5" fill="#0B0F0C" />
          <path d="M46 68H54V80H46V68Z" fill="#F4F7F0" />
        </svg>
      );

    case 'riverside':
      // Circle variant: Clay red base, river wave lines, forest border
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
        >
          <circle cx="50" cy="50" r="44" fill="#C8432B" stroke="#F4F7F0" strokeWidth="4" />
          <circle cx="50" cy="50" r="36" fill="#0F2A22" />
          <path
            d="M22 50C28 42 38 42 44 50C50 58 60 58 66 50C72 42 82 42 88 50"
            stroke="#C8FF2E"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M26 62C32 54 42 54 48 62C54 70 64 70 70 62"
            stroke="#FF8FC7"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="50" cy="30" r="7" fill="#C8FF2E" />
        </svg>
      );

    case 'marlow':
      // Roundel variant: Outer ring with dots, dual crossed chevrons
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
        >
          <circle cx="50" cy="50" r="46" fill="#141A15" stroke="#C8FF2E" strokeWidth="3" />
          <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="4 4" />
          <polygon points="50,22 58,40 78,40 62,52 68,70 50,58 32,70 38,52 22,40 42,40" fill="#C8FF2E" />
          <circle cx="50" cy="50" r="12" fill="#0F2A22" />
          <circle cx="50" cy="50" r="6" fill="#FF8FC7" />
        </svg>
      );

    case 'kensington':
      // Diamond shield: Clay and dark forest quartered with star
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
        >
          <polygon points="50,6 92,50 50,94 8,50" fill="#0F2A22" stroke="#FF8FC7" strokeWidth="4" />
          <polygon points="50,14 84,50 50,50" fill="#C8432B" opacity="0.9" />
          <polygon points="16,50 50,50 50,86" fill="#C8FF2E" opacity="0.9" />
          <circle cx="50" cy="50" r="10" fill="#F4F7F0" />
          <path d="M50 44V56M44 50H56" stroke="#0B0F0C" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'apex':
      // Hexagon modern: Sharp lime apex arrow
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
        >
          <polygon points="50,8 88,30 88,70 50,92 12,70 12,30" fill="#1C241E" stroke="#C8FF2E" strokeWidth="4" />
          <path d="M50 20L76 56H58V80H42V56H24L50 20Z" fill="#C8FF2E" />
          <circle cx="50" cy="62" r="5" fill="#0B0F0C" />
        </svg>
      );

    case 'solar':
      // Sun disk roundel: Radiating energy
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
        >
          <circle cx="50" cy="50" r="44" fill="#0F2A22" stroke="#FF8FC7" strokeWidth="3" />
          <circle cx="50" cy="50" r="24" fill="#C8FF2E" />
          <path d="M50 12V22M50 78V88M12 50H22M78 50H88M23 23L30 30M70 70L77 77M23 77L30 70M70 30L77 23" stroke="#F4F7F0" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'dynamo':
      // Speed lightning shield
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
        >
          <path d="M50 10L86 24V56C86 76 50 90 50 90C50 90 14 76 14 56V24L50 10Z" fill="#141A15" stroke="#F4F7F0" strokeWidth="3" />
          <polygon points="54,22 34,52 48,52 44,78 66,46 52,46" fill="#C8FF2E" stroke="#0B0F0C" strokeWidth="2" />
        </svg>
      );

    case 'coastline':
      // Coastal roundel
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-sm ${className}`}
        >
          <circle cx="50" cy="50" r="44" fill="#0F2A22" stroke="#3DDC84" strokeWidth="4" />
          <path d="M46 22H54L58 74H42L46 22Z" fill="#F4F7F0" />
          <circle cx="50" cy="30" r="6" fill="#C8FF2E" />
          <path d="M20 74C30 68 40 68 50 74C60 80 70 80 80 74" stroke="#FF8FC7" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );

    default:
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full bg-[#1C241E] border border-white/10 flex items-center justify-center font-bold text-xs text-[#C8FF2E] ${className}`}
        >
          SL
        </div>
      );
  }
};
