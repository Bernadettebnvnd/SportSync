import React from 'react';

export type SportId =
  | 'Football'
  | 'Basketball'
  | 'Tennis'
  | 'Pickleball'
  | 'Badminton'
  | 'Volleyball'
  | 'Billiards'
  | 'Darts'
  | 'Other';

interface SportIconProps {
  sport: SportId | string;
  size?: number;
  className?: string;
  color?: string;
}

export const SportIcon: React.FC<SportIconProps> = ({
  sport,
  size = 20,
  className = '',
  color = 'currentColor',
}) => {
  const norm = sport.toLowerCase().trim();

  if (norm.includes('foot') || norm.includes('soccer')) {
    // Football SVG
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="12 7 15 10 14 14 10 14 9 10" fill={color} fillOpacity="0.2" />
        <line x1="12" y1="2" x2="12" y2="7" />
        <line x1="15" y1="10" x2="21.5" y2="8" />
        <line x1="14" y1="14" x2="18" y2="20" />
        <line x1="10" y1="14" x2="6" y2="20" />
        <line x1="9" y1="10" x2="2.5" y2="8" />
      </svg>
    );
  }

  if (norm.includes('basket')) {
    // Basketball SVG
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" />
        <path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10" />
      </svg>
    );
  }

  if (norm.includes('tennis')) {
    // Tennis Racket / Ball SVG
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M5.5 5.5c4 4 4 9 0 13" />
        <path d="M18.5 5.5c-4 4-4 9 0 13" />
      </svg>
    );
  }

  if (norm.includes('pickle')) {
    // Pickleball Paddle SVG
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <rect x="5" y="3" width="14" height="13" rx="4" />
        <circle cx="9" cy="8" r="1" fill={color} />
        <circle cx="15" cy="8" r="1" fill={color} />
        <circle cx="12" cy="11" r="1" fill={color} />
        <path d="M12 16v6" />
        <path d="M10 22h4" />
      </svg>
    );
  }

  if (norm.includes('badmin')) {
    // Badminton Shuttlecock SVG
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="18" r="3" fill={color} fillOpacity="0.2" />
        <path d="M10 16L6 5h12l-4 11" />
        <line x1="8.5" y1="10" x2="15.5" y2="10" />
      </svg>
    );
  }

  if (norm.includes('volley')) {
    // Volleyball SVG
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 0-7 17.1L12 12" />
        <path d="M22 12a10 10 0 0 0-17.1-7L12 12" />
        <path d="M12 22a10 10 0 0 0 7-17.1L12 12" />
      </svg>
    );
  }

  if (norm.includes('billiard') || norm.includes('pool')) {
    // Billiards 8-Ball SVG
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4.5" fill={color} fillOpacity="0.2" />
        <circle cx="12" cy="10.5" r="1.5" />
        <circle cx="12" cy="13.5" r="1.5" />
      </svg>
    );
  }

  if (norm.includes('dart')) {
    // Darts Target Board SVG
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" fill={color} />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    );
  }

  // Other / Generic Sparkle Activity SVG
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M7 12h10" />
    </svg>
  );
};
