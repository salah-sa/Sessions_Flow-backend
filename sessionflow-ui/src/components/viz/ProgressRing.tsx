import React, { useState, useEffect } from "react";
import { cn } from "../../lib/utils";

interface ProgressRingProps {
  /** Percentage 0–100 */
  value: number;
  /** Ring color (CSS color string) */
  color?: string;
  /** Diameter in px */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Text to display inside (defaults to value%) */
  label?: string;
  /** Show label inside ring */
  showLabel?: boolean;
  /** Tooltip text on hover */
  tooltip?: string;
  className?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  color = "var(--ui-accent)",
  size = 48,
  strokeWidth = 4,
  label,
  showLabel = true,
  tooltip,
  className,
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const offset = circumference - (animatedValue / 100) * circumference;

  // Animate from 0 to target value on mount and value change
  useEffect(() => {
    const target = Math.max(0, Math.min(100, value));
    // Small delay for mount animation
    const timer = setTimeout(() => setAnimatedValue(target), 80);
    return () => clearTimeout(timer);
  }, [value]);

  const displayLabel = label ?? `${Math.round(value)}%`;

  // Pulse on value change (brief scale effect)
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (value > 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div
      className={cn("relative flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={cn(
          "-rotate-90 transition-transform duration-300",
          pulse && "scale-105"
        )}
        style={{ width: size, height: size }}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/[0.06]"
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>

      {/* Center label */}
      {showLabel && (
        <span
          className="absolute text-white font-bold tabular-nums"
          style={{ fontSize: Math.max(8, size * 0.22) }}
        >
          {displayLabel}
        </span>
      )}

      {/* Hover tooltip */}
      {showTooltip && tooltip && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 rounded-lg bg-[#0c0c14]/95 border border-white/10 text-[9px] font-bold text-white whitespace-nowrap shadow-xl">
            {tooltip}
          </div>
          <div className="flex justify-center">
            <div className="w-1.5 h-1.5 bg-[#0c0c14]/95 border-r border-b border-white/10 rotate-45 -mt-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
