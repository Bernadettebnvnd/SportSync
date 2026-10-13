import React from 'react';

interface MomentumChartProps {
  data?: number[]; // Values between -50 (away) to +50 (home)
  homeName?: string;
  awayName?: string;
  className?: string;
}

const DEFAULT_MOMENTUM = [10, 15, -10, -25, 20, 35, 40, -15, 25, 45, 30, -5, 20, 38];

export const MomentumChart: React.FC<MomentumChartProps> = ({
  data = DEFAULT_MOMENTUM,
  homeName = 'Northgate',
  awayName = 'Riverside',
  className = '',
}) => {
  const width = 340;
  const height = 90;
  const midY = height / 2;

  // Build smooth cubic bezier or line coordinates
  const stepX = width / (data.length - 1);
  const points = data.map((val, i) => {
    const x = i * stepX;
    // Map -50..+50 to height..0
    const clamped = Math.max(-50, Math.min(50, val));
    const y = midY - (clamped / 50) * (height / 2 - 8);
    return { x, y };
  });

  // SVG Area path for fill
  const areaPath = `M0,${midY} ` + points.map((p) => `L${p.x},${p.y}`).join(' ') + ` L${width},${midY} Z`;
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <div className={`p-4 rounded-2xl bg-[#141A15] border border-white/5 ${className}`}>
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="font-display font-semibold text-[#C8FF2E]">{homeName} Pressure</span>
        <span className="text-[11px] text-[#6F7B71] uppercase font-bold tracking-wider">
          Match Momentum
        </span>
        <span className="font-display font-semibold text-[#FF8FC7]">{awayName} Pressure</span>
      </div>

      <div className="relative w-full h-[90px] overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="momentumGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C8FF2E" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#C8FF2E" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#FF8FC7" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Center Zero Axis Line */}
          <line
            x1="0"
            y1={midY}
            x2={width}
            y2={midY}
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* Filled Area */}
          <path d={areaPath} fill="url(#momentumGradient)" />

          {/* Stroke Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#C8FF2E"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Current minute pulsing indicator */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4.5"
              fill="#C8FF2E"
              stroke="#0B0F0C"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[#6F7B71] mt-2 font-mono">
        <span>0'</span>
        <span>15'</span>
        <span>HT 45'</span>
        <span>60'</span>
        <span>90'</span>
      </div>
    </div>
  );
};
