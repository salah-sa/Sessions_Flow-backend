import React, { useRef, useEffect, useState, useCallback } from "react";
import { Volume2, Move, Grid3X3 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useSignalR } from "../../providers/SignalRProvider";
import { Events } from "../../lib/eventContracts";
import { useAuthStore } from "../../store/stores";

// ── Types ────────────────────────────────────────────────────
interface Participant {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
  isSelf: boolean;
}

interface SpatialAudioCanvasProps {
  groupId: string;
  participants: { userId: string; userName: string }[];
}

const CANVAS_SIZE = 400;
const AVATAR_RADIUS = 20;
const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

function hashToColor(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash << 5) - hash + s.charCodeAt(i);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function calcDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export const SpatialAudioCanvas: React.FC<SpatialAudioCanvasProps> = ({ groupId, participants: participantList }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentUser = useAuthStore(s => s.user);
  const { on, invoke } = useSignalR();
  const [showGrid, setShowGrid] = useState(true);

  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(false);

  // Initialize positions in a circle
  useEffect(() => {
    const map = new Map<string, { x: number; y: number }>();
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const r = CANVAS_SIZE * 0.3;
    participantList.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / participantList.length - Math.PI / 2;
      map.set(p.userId, {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    });
    setPositions(map);
  }, [participantList]);

  // Listen for position updates
  useEffect(() => {
    const unsub = on(Events.CALL_POSITION_UPDATE, (data: { userId: string; x: number; y: number }) => {
      if (data.userId === currentUser?.id) return;
      setPositions(prev => {
        const next = new Map(prev);
        next.set(data.userId, { x: data.x, y: data.y });
        return next;
      });
    });
    return () => unsub?.();
  }, [on, currentUser]);

  // Build participant list with positions
  const allParticipants: Participant[] = participantList.map(p => ({
    userId: p.userId,
    userName: p.userName,
    x: positions.get(p.userId)?.x ?? CANVAS_SIZE / 2,
    y: positions.get(p.userId)?.y ?? CANVAS_SIZE / 2,
    color: hashToColor(p.userId),
    isSelf: p.userId === currentUser?.id,
  }));

  const selfPos = positions.get(currentUser?.id || "") ?? { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 };

  // ── Canvas Rendering ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= CANVAS_SIZE; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i);
        ctx.stroke();
      }
    }

    // Distance lines from self
    const self = allParticipants.find(p => p.isSelf);
    if (self) {
      allParticipants.filter(p => !p.isSelf).forEach(p => {
        const dist = calcDistance(self.x, self.y, p.x, p.y);
        const gain = Math.max(0, 1 / (1 + dist * 0.005));

        // Connection line
        ctx.beginPath();
        ctx.moveTo(self.x, self.y);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `rgba(255,255,255,${gain * 0.15})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Distance label
        const mx = (self.x + p.x) / 2;
        const my = (self.y + p.y) / 2;
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = `rgba(255,255,255,${gain * 0.4})`;
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(dist)}px`, mx, my - 4);
      });
    }

    // Participants
    allParticipants.forEach(p => {
      // Glow
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, AVATAR_RADIUS * 2);
      gradient.addColorStop(0, p.color + "20");
      gradient.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(p.x, p.y, AVATAR_RADIUS * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, AVATAR_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = p.color + "30";
      ctx.fill();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.isSelf ? 3 : 1.5;
      ctx.stroke();

      // Initials
      const initials = p.userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      ctx.font = "bold 10px system-ui";
      ctx.fillStyle = p.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials, p.x, p.y);

      // Name label
      ctx.font = "bold 8px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(p.isSelf ? "You" : p.userName.split(" ")[0], p.x, p.y + AVATAR_RADIUS + 12);
    });
  }, [allParticipants, showGrid]);

  // ── Drag Handling ─────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!currentUser) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const myPos = positions.get(currentUser.id);
    if (!myPos) return;
    if (calcDistance(x, y, myPos.x, myPos.y) <= AVATAR_RADIUS * 1.5) {
      dragRef.current = true;
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current || !currentUser) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(AVATAR_RADIUS, Math.min(e.clientX - rect.left, CANVAS_SIZE - AVATAR_RADIUS));
    const y = Math.max(AVATAR_RADIUS, Math.min(e.clientY - rect.top, CANVAS_SIZE - AVATAR_RADIUS));

    setPositions(prev => {
      const next = new Map(prev);
      next.set(currentUser.id, { x, y });
      return next;
    });

    // Throttled broadcast (every frame is fine for small groups)
    invoke("UpdateSpatialPosition", x, y).catch(() => {});
  };

  const handleMouseUp = () => {
    dragRef.current = false;
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowGrid(g => !g)}
          className={cn(
            "h-8 px-3 rounded-lg border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all",
            showGrid ? "bg-white/5 border-white/10 text-white" : "bg-transparent border-white/5 text-slate-600"
          )}
        >
          <Grid3X3 className="w-3 h-3" />
          Grid
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
          <Volume2 className="w-3 h-3 text-[var(--ui-accent)]" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            Spatial Audio Active
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl border border-white/5 bg-black/30 overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, cursor: isDragging ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Drag hint */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 border border-white/5">
          <Move className="w-3 h-3 text-slate-500" />
          <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
            Drag your avatar
          </span>
        </div>
      </div>
    </div>
  );
};

export default SpatialAudioCanvas;
