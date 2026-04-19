import React, { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Globe, Users, Zap, Plus, Minus, RotateCcw } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";
import { Card, Button } from "../ui";
import { useStudentLocations } from "../../queries/useStudentLocationQueries";
import { usePresenceStore } from "../../store/presenceStore";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MarkerData {
  id: string;
  name: string;
  coordinates: [number, number];
  count: number;
  level: number;
  role: string;
  isOnline: boolean;
}

const WorldStudentMap: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { t } = useTranslation();
  const { data: rawLocations, isLoading } = useStudentLocations();
  const isOnlineLive = usePresenceStore((s) => s.isOnline);
  
  const [position, setPosition] = useState({ coordinates: [0, 0] as [number, number], zoom: 1 });

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "var(--ui-accent)";
      case 2: return "#a855f7"; // Violet
      case 3: return "#06b6d4"; // Cyan
      case 5: return "#f59e0b"; // Amber (Level 5 for Engineers)
      default: return "var(--ui-accent)";
    }
  };

  const markers = useMemo(() => {
    if (!rawLocations) return [];
    
    const aggregation: Record<string, MarkerData> = {};
    
    rawLocations.forEach(node => {
      // Group by coordinate + role to prevent overlap of different types
      const key = `${node.role}-${node.city}-${node.lat}-${node.lng}`;
      if (!aggregation[key]) {
        aggregation[key] = {
          id: node.id,
          name: node.city,
          coordinates: [node.lng, node.lat],
          count: 0,
          level: node.role === 'engineer' ? 5 : node.level,
          role: node.role,
          isOnline: node.isOnline
        };
      }
      aggregation[key].count += 1;
    });

    return Object.values(aggregation);
  }, [rawLocations]);

  const totalCount = markers.reduce((acc, m) => acc + m.count, 0);

  const handleZoomIn = () => {
    if (position.zoom >= 8) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleReset = () => {
    setPosition({ coordinates: [0, 0], zoom: 1 });
  };

  const handleMoveEnd = (newPosition: { coordinates: [number, number]; zoom: number }) => {
    setPosition(newPosition);
  };

  // Custom Hexagon Path for Engineers
  const Hexagon = ({ r, color, className }: { r: number, color: string, className?: string }) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - (Math.PI / 6);
        points.push(`${r * Math.cos(angle)},${r * Math.sin(angle)}`);
    }
    return <path d={`M ${points.join(' L ')} Z`} fill={color} className={className} />;
  };

  return (
    <Card className={cn(
      "relative bg-[var(--ui-sidebar-bg)]/40 border-white/5 overflow-hidden transition-all duration-700 group",
      compact ? "h-[420px]" : "h-[600px]"
    )}>
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--ui-accent)]/5 to-transparent pointer-events-none" />
      
      {/* Header Overlay */}
      <div className="absolute top-6 left-8 z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--ui-accent)]/10 border border-white/10 flex items-center justify-center">
             <Globe className="w-4 h-4 text-[var(--ui-accent)]" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">{t("dashboard.analytics.student_map")}</h3>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow shadow-emerald-500/50" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {isLoading ? t("common.syncing") : "Real-time Node Distribution"}
              </span>
           </div>
           {!isLoading && (
             <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{totalCount} Nodes Detected</span>
             </div>
           )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-2">
        <Button size="icon" variant="outline" onClick={handleZoomIn} className="w-10 h-10 bg-black/40 border-white/10 backdrop-blur-md hover:bg-[var(--ui-accent)] hover:text-white transition-all">
          <Plus className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={handleZoomOut} className="w-10 h-10 bg-black/40 border-white/10 backdrop-blur-md hover:bg-[var(--ui-accent)] hover:text-white transition-all">
          <Minus className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={handleReset} className="w-10 h-10 bg-black/40 border-white/10 backdrop-blur-md hover:bg-white/10 transition-all">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-full h-full pt-8">
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 140 }}>
            <ZoomableGroup
                zoom={position.zoom}
                center={position.coordinates}
                onMoveEnd={handleMoveEnd}
                maxZoom={10}
            >
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

                {markers.map((node, idx) => {
                    const online = node.isOnline || isOnlineLive(node.id);
                    const color = getLevelColor(node.level);

                    return (
                        <Marker key={`${node.id}-${idx}`} coordinates={node.coordinates}>
                            <g className="cursor-pointer group/marker">
                                {online && (
                                    <>
                                        <circle r={10} fill={color} className="animate-ripple" style={{ opacity: 0.15 }} />
                                        <circle r={10} fill={color} className="animate-ripple" style={{ opacity: 0.1, animationDelay: '0.4s' }} />
                                        <circle r={10} fill={color} className="animate-ripple" style={{ opacity: 0.05, animationDelay: '0.8s' }} />
                                    </>
                                )}

                                {node.role === 'engineer' ? (
                                    <g className="filter drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                                        <Hexagon r={7} color="#f59e0b" className="transition-transform duration-500 group-hover/marker:scale-125" />
                                        <Hexagon r={4} color="#000" className="opacity-40" />
                                    </g>
                                ) : (
                                    <circle
                                        r={compact ? 3 : 4}
                                        fill={color}
                                        className="shadow-glow transition-transform duration-500 group-hover/marker:scale-125"
                                        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                                    />
                                )}
                                
                                <foreignObject x="12" y="-20" width="160" height="60" className="opacity-0 group-hover/marker:opacity-100 transition-all duration-300 translate-x-1 group-hover/marker:translate-x-3 pointer-events-none">
                                    <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col shadow-2xl ring-1 ring-white/5">
                                        <div className="flex items-center gap-2">
                                            {online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                                            <span className="text-[11px] font-black text-white uppercase tracking-wider">{node.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md",
                                                    node.role === 'engineer' ? "bg-amber-500/20 text-amber-500" : "bg-[var(--ui-accent)]/20 text-[var(--ui-accent)]"
                                                )}>
                                                    {node.role === 'engineer' ? "Systems Engineer" : `Lvl ${node.level} Operator`}
                                                </span>
                                            </div>
                                            {node.count > 1 && <span className="text-[9px] font-black text-slate-500">Nodes: {node.count}</span>}
                                        </div>
                                    </div>
                                </foreignObject>
                            </g>
                        </Marker>
                    );
                })}
            </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Legend Overlay */}
      {!compact && (
        <div className="absolute bottom-6 left-8 flex items-center gap-4 pointer-events-none z-10">
           <div className="flex gap-3">
              <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-full px-3 py-1.5 backdrop-blur-md">
                 <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ripple inline-block mr-1" style={{ width: 6, height: 6 }} />
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Online Ripple</span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-full px-3 py-1.5 backdrop-blur-md">
                 <svg width="8" height="8" viewBox="-4 -4 8 8"><path d="M 0,-4 L 3.46,-2 3.46,2 0,4 -3.46,2 -3.46,-2 Z" fill="#f59e0b" /></svg>
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Systems Engineer</span>
              </div>
           </div>
        </div>
      )}
    </Card>
  );
};

export default WorldStudentMap;

