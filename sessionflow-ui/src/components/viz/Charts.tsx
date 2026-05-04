import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

/**
 * AttendanceRing: A circular progress indicator for attendance rates.
 */
export const AttendanceRing: React.FC<{ percentage: number; label: string }> = ({ percentage, label }) => {
  const { t } = useTranslation();
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4 group/ring">
      <div className="relative w-28 h-28 flex items-center justify-center drop-shadow-[0_0_15px_rgba(var(--ui-accent-rgb),0.1)]">
        <svg className="w-full h-full -rotate-90">
          <circle cx="56" cy="56" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
          <circle 
            cx="56" cy="56" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset} 
            className="text-[var(--ui-accent)] transition-all duration-1000 ease-out group-hover/ring:drop-shadow-[0_0_8px_var(--ui-accent)]" 
          />
        </svg>
        <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black text-white tabular-nums">{percentage}%</span>
        </div>
      </div>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none text-center">{label}</span>
    </div>
  );
};

/**
 * Sparkline: Enhanced tiny line chart with gradient fill, trend coloring,
 * hover tooltips, and mount draw animation.
 */
export const Sparkline: React.FC<{
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}> = ({ data, width = 96, height = 32, color }) => {
  const id = React.useId();
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const [drawn, setDrawn] = React.useState(false);

  // Determine trend color
  const isRising = data.length >= 2 && data[data.length - 1] >= data[0];
  const strokeColor = color ?? (isRising ? "#22c55e" : "#ef4444");

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pad = 2; // padding inside SVG

  const points = data.map((v, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2),
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
    value: v,
  }));

  const polyPoints = points.map(p => `${p.x},${p.y}`).join(" ");
  // Closed polygon for gradient fill
  const fillPoints = `${pad},${height} ${polyPoints} ${width - pad},${height}`;

  // Animate draw on mount
  React.useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 50);
    return () => clearTimeout(t);
  }, []);

  const lineLength = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    return acc + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
  }, 0);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - rect.left;
    const idx = Math.round((relX / width) * (data.length - 1));
    setHoveredIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <defs>
        <linearGradient id={`spark-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Gradient fill */}
      <polygon
        points={fillPoints}
        fill={`url(#spark-grad-${id})`}
        opacity={drawn ? 1 : 0}
        style={{ transition: "opacity 0.6s ease" }}
      />
      {/* Line with draw animation */}
      <polyline
        points={polyPoints}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={lineLength}
        strokeDashoffset={drawn ? 0 : lineLength}
        style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
      />
      {/* Hover dot + tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <>
          <circle
            cx={points[hoveredIdx].x}
            cy={points[hoveredIdx].y}
            r="3"
            fill={strokeColor}
            stroke="#0c0c14"
            strokeWidth="1.5"
          />
          <rect
            x={points[hoveredIdx].x - 14}
            y={points[hoveredIdx].y - 20}
            width="28"
            height="14"
            rx="4"
            fill="#0c0c14"
            stroke={strokeColor}
            strokeWidth="0.5"
            opacity="0.95"
          />
          <text
            x={points[hoveredIdx].x}
            y={points[hoveredIdx].y - 10}
            textAnchor="middle"
            fill="white"
            fontSize="8"
            fontWeight="bold"
          >
            {points[hoveredIdx].value}
          </text>
        </>
      )}
    </svg>
  );
};

/**
 * DonutChart: Distribution visualization (e.g. for levels).
 */
export const DonutChart: React.FC<{ 
  data: { label: string; value: number; color: string }[] 
}> = ({ data }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let currentAngle = 0;

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
       <svg className="w-full h-full -rotate-90">
         {data.map((item, i) => {
           const percentage = (item.value / total) * 100;
           const radius = 60;
           const circ = 2 * Math.PI * radius;
           const offset = circ - (percentage / 100) * circ;
           const rotation = (currentAngle / total) * 360;
           currentAngle += item.value;
           
           return (
             <circle
               key={i}
               cx="96" cy="96" r={radius}
               stroke={item.color}
               strokeWidth="24"
               fill="transparent"
               strokeDasharray={circ}
               strokeDashoffset={offset}
               transform={`rotate(${rotation} 96 96)`}
               className="transition-all duration-1000 hover:opacity-80 cursor-pointer"
             />
           );
         })}
       </svg>
       <div className="absolute text-center">
          <p className="text-3xl font-black text-white">{total}</p>
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">TOTAL NODES</p>
       </div>
    </div>
  );
};
