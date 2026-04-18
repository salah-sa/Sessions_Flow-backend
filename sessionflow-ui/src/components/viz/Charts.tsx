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
 * Sparkline: Tiny line chart for trend analysis.
 */
export const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${60 - ((v - min) / range) * 40}`).join(" ");

  return (
    <svg className="w-24 h-8 overflow-visible">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--ui-accent)]/40 drop-shadow-sm" />
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
