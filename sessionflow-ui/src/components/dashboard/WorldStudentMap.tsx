import React, { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Globe, Users, Plus, Minus, RotateCcw, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";
import { Card, Button } from "../ui";
import { useStudentLocations } from "../../queries/useStudentLocationQueries";
import { usePresenceStore } from "../../store/presenceStore";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ── Role Visual Identity System ──────────────────────────
interface RoleVisuals {
  color: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const ROLE_COLORS: Record<string, RoleVisuals> = {
  engineer: {
    color: "#f59e0b",
    label: "Systems Engineer",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    badgeBorder: "border-amber-500/20",
  },
  admin: {
    color: "#ef4444",
    label: "Administrator",
    badgeBg: "bg-red-500/10",
    badgeText: "text-red-400",
    badgeBorder: "border-red-500/20",
  },
  student: {
    color: "var(--ui-accent)",
    label: "Student",
    badgeBg: "bg-[var(--ui-accent)]/10",
    badgeText: "text-[var(--ui-accent)]",
    badgeBorder: "border-[var(--ui-accent)]/20",
  },
};

const getStudentLevelColor = (level: number): string => {
  switch (level) {
    case 1: return "var(--ui-accent)";
    case 2: return "#a855f7";
    case 3: return "#06b6d4";
    default: return "var(--ui-accent)";
  }
};

// ── SVG Shape Generators ─────────────────────────────────
const hexagonPath = (r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${r * Math.cos(angle)},${r * Math.sin(angle)}`);
  }
  return `M ${pts.join(" L ")} Z`;
};

const diamondPath = (r: number): string => {
  return `M 0,${-r} L ${r},0 L 0,${r} L ${-r},0 Z`;
};

// ── Marker Data ──────────────────────────────────────────
interface MarkerData {
  id: string;
  name: string;
  coordinates: [number, number];
  count: number;
  level: number;
  role: string;
  avatarUrl?: string;
  isOnline: boolean;
}

const WorldStudentMap: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { t } = useTranslation();
  const { data: rawLocations, isLoading } = useStudentLocations();
  const isOnlineLive = usePresenceStore((s) => s.isOnline);

  const [position, setPosition] = useState({ coordinates: [0, 0] as [number, number], zoom: 1 });

  const markers = useMemo(() => {
    if (!rawLocations) return [];

    const aggregation: Record<string, MarkerData> = {};

    rawLocations.forEach((node) => {
      const key = `${node.role}-${node.city}-${node.lat}-${node.lng}`;
      if (!aggregation[key]) {
        aggregation[key] = {
          id: node.id,
          name: node.city,
          coordinates: [node.lng, node.lat],
          count: 0,
          level: node.level,
          role: node.role,
          avatarUrl: node.avatarUrl,
          isOnline: node.isOnline,
        };
      }
      aggregation[key].count += 1;
    });

    return Object.values(aggregation);
  }, [rawLocations]);

  const totalCount = markers.reduce((acc, m) => acc + m.count, 0);

  const handleZoomIn = () => {
    if (position.zoom >= 10) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };
  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };
  const handleReset = () => setPosition({ coordinates: [0, 0], zoom: 1 });
  const handleMoveEnd = (p: { coordinates: [number, number]; zoom: number }) => setPosition(p);

  // ── Render a role-specific node shape ────────────────
  const renderNodeShape = (role: string, level: number, online: boolean, color: string) => {
    const r = compact ? 4 : 5;

    if (role === "engineer") {
      return (
        <g
          className={cn(
            "transition-transform duration-500 group-hover/marker:scale-[1.6]",
            online && "animate-spin-slow"
          )}
          style={{ filter: `drop-shadow(0 0 12px ${color})`, transformOrigin: "center" }}
        >
          <path d={hexagonPath(r + 1)} fill={color} />
          <path d={hexagonPath(r - 2)} fill="rgba(0,0,0,0.4)" />
        </g>
      );
    }

    if (role === "admin") {
      return (
        <g
          className={cn(
            "transition-transform duration-500 group-hover/marker:scale-[1.6]",
            online && "animate-pulse-glow"
          )}
          style={{ filter: `drop-shadow(0 0 14px ${color})`, color, transformOrigin: "center" }}
        >
          <path d={diamondPath(r + 1)} fill={color} />
          <path d={diamondPath(r - 2)} fill="rgba(0,0,0,0.35)" />
        </g>
      );
    }

    // Student — circle
    return (
      <circle
        r={r}
        fill={color}
        className={cn(
          "transition-all duration-500 group-hover/marker:scale-[1.6]",
          online && "animate-pulse-glow"
        )}
        style={{ filter: `drop-shadow(0 0 10px ${color})`, color, transformOrigin: "center" }}
      />
    );
  };

  return (
    <Card
      className={cn(
        "relative bg-black/40 border-white/5 overflow-hidden transition-all duration-700 group",
        compact ? "h-[420px]" : "h-[600px]"
      )}
    >
      {/* Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--ui-accent)]/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="absolute top-6 left-8 z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--ui-accent)]/10 border border-white/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-[var(--ui-accent)]" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">
            {t("dashboard.analytics.student_map")}
          </h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow shadow-emerald-500/50" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {isLoading ? t("common.syncing") : "Live Network Topology"}
            </span>
          </div>
          {!isLoading && (
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {totalCount} Nodes Active
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Controls */}
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

      {/* Map Canvas */}
      <div className="w-full h-full pt-8">
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 140 }}>
          <ZoomableGroup zoom={position.zoom} center={position.coordinates} onMoveEnd={handleMoveEnd} maxZoom={12}>
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
              const roleVisuals = ROLE_COLORS[node.role] ?? ROLE_COLORS.student;
              const color =
                node.role === "student"
                  ? getStudentLevelColor(node.level)
                  : roleVisuals.color;

              return (
                <Marker key={`${node.id}-${idx}`} coordinates={node.coordinates}>
                  <g className="cursor-pointer group/marker">
                    {/* Online Ripple Rings */}
                    {online && (
                      <>
                        <circle r={12} fill={color} className="animate-ripple" style={{ opacity: 0.12 }} />
                        <circle r={12} fill={color} className="animate-ripple" style={{ opacity: 0.08, animationDelay: "0.4s" }} />
                        <circle r={12} fill={color} className="animate-ripple" style={{ opacity: 0.04, animationDelay: "0.8s" }} />
                      </>
                    )}

                    {/* Role-Specific Shape */}
                    {renderNodeShape(node.role, node.level, online, color)}

                    {/* Hover Tooltip with Profile */}
                    <foreignObject
                      x="15"
                      y="-35"
                      width="230"
                      height="100"
                      className="opacity-0 group-hover/marker:opacity-100 transition-all duration-500 translate-y-2 group-hover/marker:translate-y-0 pointer-events-none scale-90 group-hover/marker:scale-100 origin-left"
                    >
                      <div className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex items-start gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5 w-fit min-w-[190px]">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className="w-10 h-10 rounded-full overflow-hidden border-2 bg-white/5 flex items-center justify-center"
                            style={{ borderColor: color }}
                          >
                            {node.avatarUrl ? (
                              <img src={node.avatarUrl} alt={node.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-white/20" />
                            )}
                          </div>
                          {online && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black animate-pulse" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-col gap-1 pr-2">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-black text-white leading-tight">{node.name}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                              {online ? "● Online" : "○ Offline"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={cn(
                                "text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border",
                                roleVisuals.badgeBg,
                                roleVisuals.badgeText,
                                roleVisuals.badgeBorder
                              )}
                            >
                              {node.role === "student"
                                ? `Lvl ${node.level} ${roleVisuals.label}`
                                : roleVisuals.label}
                            </span>
                            {node.count > 1 && (
                              <span className="text-[10px] font-black text-slate-400">×{node.count}</span>
                            )}
                          </div>
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

      {/* Legend — 3 Role-Specific Icons */}
      {!compact && (
        <div className="absolute bottom-6 left-8 flex items-center gap-3 pointer-events-none z-10">
          {/* Student */}
          <div className="flex items-center gap-2 bg-black/50 border border-white/5 rounded-full px-3 py-1.5 backdrop-blur-md">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--ui-accent)] shadow-[0_0_8px_var(--ui-accent)]" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Student</span>
          </div>
          {/* Engineer */}
          <div className="flex items-center gap-2 bg-black/50 border border-white/5 rounded-full px-3 py-1.5 backdrop-blur-md">
            <svg width="10" height="10" viewBox="-6 -6 12 12">
              <path d={hexagonPath(5)} fill="#f59e0b" />
            </svg>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Engineer</span>
          </div>
          {/* Admin */}
          <div className="flex items-center gap-2 bg-black/50 border border-white/5 rounded-full px-3 py-1.5 backdrop-blur-md">
            <svg width="10" height="10" viewBox="-6 -6 12 12">
              <path d={diamondPath(5)} fill="#ef4444" />
            </svg>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Admin</span>
          </div>
          {/* Online Indicator */}
          <div className="flex items-center gap-2 bg-black/50 border border-white/5 rounded-full px-3 py-1.5 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default WorldStudentMap;
