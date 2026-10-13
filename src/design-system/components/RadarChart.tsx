import React from 'react';

interface RadarChartProps {
  stats: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defense: number;
    physical: number;
  };
  size?: number;
  className?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  stats,
  size = 240,
  className = '',
}) => {
  const center = size / 2;
  const radius = size * 0.38;

  const labels = [
    { key: 'pace', label: 'PAC', val: stats.pace },
    { key: 'shooting', label: 'SHO', val: stats.shooting },
    { key: 'passing', label: 'PAS', val: stats.passing },
    { key: 'dribbling', label: 'DRI', val: stats.dribbling },
    { key: 'defense', label: 'DEF', val: stats.defense },
    { key: 'physical', label: 'PHY', val: stats.physical },
  ];

  const totalAxes = labels.length;

  // Compute 6-point coordinates
  const getCoordinates = (index: number, valueRatio: number) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const x = center + radius * valueRatio * Math.cos(angle);
    const y = center + radius * valueRatio * Math.sin(angle);
    return { x, y };
  };

  // Polygon path for values
  const polygonPoints = labels
    .map((item, i) => {
      const { x, y } = getCoordinates(i, item.val / 100);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Background concentric reference webs (33%, 66%, 100%) */}
        {[0.33, 0.66, 1].map((ratio, rIdx) => {
          const webPoints = labels
            .map((_, i) => {
              const { x, y } = getCoordinates(i, ratio);
              return `${x},${y}`;
            })
            .join(' ');
          return (
            <polygon
              key={rIdx}
              points={webPoints}
              fill={rIdx === 2 ? '#1C241E' : 'none'}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axes lines */}
        {labels.map((_, i) => {
          const { x, y } = getCoordinates(i, 1);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* Dynamic Lime Stat Polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(200, 255, 46, 0.25)"
          stroke="#C8FF2E"
          strokeWidth="2.5"
        />

        {/* Points and Labels */}
        {labels.map((item, i) => {
          const { x: px, y: py } = getCoordinates(i, item.val / 100);
          const { x: lx, y: ly } = getCoordinates(i, 1.25);
          return (
            <g key={i}>
              <circle cx={px} cy={py} r="3.5" fill="#C8FF2E" stroke="#0B0F0C" strokeWidth="1.5" />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-[#A5B0A6] text-[10px] font-display font-bold uppercase tracking-wider"
              >
                {item.label} {item.val}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
