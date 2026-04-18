import React, { useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { motion } from "framer-motion";
import { MapPin, Users, Activity, Globe, Zap } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";
import { Card } from "../ui";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MarkerData {
  name: string;
  coordinates: [number, number];
  count: number;
  level: number;
}

// Fallback operational data for visualization
const DEFAULT_MARKERS: MarkerData[] = [
  { name: "London Node", coordinates: [-0.1276, 51.5074], count: 124, level: 1 },
  { name: "Dubai Hub", coordinates: [55.2708, 25.2048], count: 89, level: 2 },
  { name: "New York Node", coordinates: [-74.006, 40.7128], count: 215, level: 1 },
  { name: "Singapore Gateway", coordinates: [103.8198, 1.3521], count: 56, level: 3 },
  { name: "Cairo Command", coordinates: [31.2357, 30.0444], count: 167, level: 1 },
  { name: "Berlin Node", coordinates: [13.405, 52.52], count: 42, level: 4 },
];

const WorldStudentMap: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { t } = useTranslation();

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "var(--ui-accent)";
      case 2: return "#a855f7"; // Violet
      case 3: return "#06b6d4"; // Cyan
      case 4: return "#f59e0b"; // Amber
      default: return "var(--ui-accent)";
    }
  };

  const totalStudents = DEFAULT_MARKERS.reduce((acc, m) => acc + m.count, 0);

  return (
    <Card className={cn(
      "relative bg-var(--ui-sidebar-bg)/40 border-white/5 overflow-hidden transition-all duration-700 group",
      compact ? "h-[420px]" : "h-[600px]"
    )}>
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-var(--ui-accent)/5 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-var(--ui-accent)/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      
      {/* Header Overlay */}
      <div className="absolute top-6 left-8 z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-var(--ui-accent)/10 border border-white/10 flex items-center justify-center">
             <Globe className="w-4 h-4 text-var(--ui-accent)" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Student Map</h3>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow shadow-emerald-500/50" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Distribution</span>
           </div>
           <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{totalStudents} Total Students</span>
           </div>
        </div>
      </div>

      <div className="w-full h-full pt-16">
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 140 }}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography 
                  key={geo.rsmKey} 
                  geography={geo}
                  fill="rgba(255, 255, 255, 0.03)"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth={0.5}
                  className="outline-none hover:fill-white/[0.08] transition-all duration-300"
                />
              ))
            }
          </Geographies>

          {DEFAULT_MARKERS.map(({ name, coordinates, count, level }) => (
            <Marker key={name} coordinates={coordinates}>
              <g className="cursor-pointer group/marker">
                {/* Outer Glow Ring */}
                <circle
                  r={Math.sqrt(count) * 0.8}
                  fill={getLevelColor(level)}
                  className="opacity-20 animate-ping"
                />
                {/* Main Dot */}
                <circle
                  r={compact ? 3 : 4}
                  fill={getLevelColor(level)}
                  className="shadow-glow"
                  style={{ filter: `drop-shadow(0 0 8px ${getLevelColor(level)})` }}
                />
                
                {/* Tooltip Simulation */}
                {!compact && (
                  <foreignObject x="10" y="-20" width="120" height="40" className="opacity-0 group-hover/marker:opacity-100 transition-opacity">
                    <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-2 flex flex-col pointer-events-none">
                       <span className="text-[9px] font-black text-white uppercase tracking-wider">{name}</span>
                       <span className="text-[8px] font-bold text-slate-400 mt-0.5">{count} ACTIVE STUDENTS</span>
                    </div>
                  </foreignObject>
                )}
              </g>
            </Marker>
          ))}
        </ComposableMap>
      </div>

      {/* Footer Stats Overlay */}
      {!compact && (
        <div className="absolute bottom-6 left-8 right-8 flex items-center justify-between pointer-events-none">
           <div className="flex gap-4">
              {[1, 2, 3, 4].map(l => (
                <div key={l} className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-full px-3 py-1.5 backdrop-blur-md">
                   <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getLevelColor(l) }} />
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Level {l}</span>
                </div>
              ))}
           </div>
           
           <div className="flex items-center gap-4">
              <Zap className="w-5 h-5 text-var(--ui-accent) animate-pulse" />
           </div>
        </div>
      )}
    </Card>
  );
};

export default WorldStudentMap;
