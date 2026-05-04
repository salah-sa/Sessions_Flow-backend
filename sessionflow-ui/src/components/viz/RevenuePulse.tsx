import React, { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "../../lib/utils";
import { useSignalR } from "../../providers/SignalRProvider";
import { Events } from "../../lib/eventContracts";

// ── Particle Types ──────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  settled: boolean;
  orbitAngle: number;
  orbitSpeed: number;
}

interface RevenuePulseProps {
  totalRevenue: number;
  className?: string;
}

const CANVAS_W = 520;
const CANVAS_H = 320;
const CX = CANVAS_W / 2;
const CY = CANVAS_H / 2;
const ORB_RADIUS = 45;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export const RevenuePulse: React.FC<RevenuePulseProps> = ({ totalRevenue, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const revenueRef = useRef(totalRevenue);
  const { on } = useSignalR();

  // Track accumulated revenue for display
  const [displayRevenue, setDisplayRevenue] = useState(totalRevenue);

  useEffect(() => {
    revenueRef.current = totalRevenue;
    setDisplayRevenue(totalRevenue);
  }, [totalRevenue]);

  // Spawn a particle burst
  const spawnBurst = useCallback((color: string, amount: number) => {
    const count = Math.min(Math.ceil(amount / 10), 30); // Scale particles by amount
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      switch (edge) {
        case 0: x = Math.random() * CANVAS_W; y = 0; break;
        case 1: x = CANVAS_W; y = Math.random() * CANVAS_H; break;
        case 2: x = Math.random() * CANVAS_W; y = CANVAS_H; break;
        default: x = 0; y = Math.random() * CANVAS_H; break;
      }

      const angle = Math.atan2(CY - y, CX - x);
      const speed = 1.5 + Math.random() * 2;

      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.5,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.5,
        color,
        size: 2 + Math.random() * 3,
        alpha: 0.8 + Math.random() * 0.2,
        life: 0,
        maxLife: 120 + Math.random() * 60,
        settled: false,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: 0.005 + Math.random() * 0.01,
      });
    }
  }, []);

  // Listen for session completion events → trigger particle burst
  useEffect(() => {
    const unsub = on(Events.SESSION_STATUS_CHANGED, (data: any) => {
      if (data?.status === "Ended" || data?.Status === "Ended") {
        const color = data.groupColorTag || data.GroupColorTag || "#3b82f6";
        const revenue = data.stampedRevenue || data.StampedRevenue || 100;
        spawnBurst(color, revenue);
      }
    });
    return () => unsub?.();
  }, [on, spawnBurst]);

  // ── Animation Loop ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);

    let pulsePhase = 0;

    const loop = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      pulsePhase += 0.02;

      // ── Background Radial Gradient ────────────────────────
      const bgGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, CANVAS_W * 0.5);
      bgGrad.addColorStop(0, "rgba(100, 80, 255, 0.03)");
      bgGrad.addColorStop(1, "transparent");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // ── Core Orb ──────────────────────────────────────────
      const pulseR = ORB_RADIUS + Math.sin(pulsePhase) * 3;

      // Outer glow
      const glow = ctx.createRadialGradient(CX, CY, pulseR * 0.5, CX, CY, pulseR * 3);
      glow.addColorStop(0, "rgba(139, 92, 246, 0.15)");
      glow.addColorStop(0.5, "rgba(139, 92, 246, 0.05)");
      glow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(CX, CY, pulseR * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Inner orb
      const orbGrad = ctx.createRadialGradient(CX - 10, CY - 10, 0, CX, CY, pulseR);
      orbGrad.addColorStop(0, "rgba(192, 170, 255, 0.4)");
      orbGrad.addColorStop(0.7, "rgba(139, 92, 246, 0.2)");
      orbGrad.addColorStop(1, "rgba(100, 60, 200, 0.1)");
      ctx.beginPath();
      ctx.arc(CX, CY, pulseR, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.fill();

      // Orb border
      ctx.strokeStyle = "rgba(139, 92, 246, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Update & Render Particles ─────────────────────────
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        if (!p.settled) {
          // Move toward center
          const dx = CX - p.x;
          const dy = CY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < ORB_RADIUS + 10) {
            // Settle into orbit
            p.settled = true;
            p.alpha = 0.3 + Math.random() * 0.3;
            p.size *= 0.6;
          } else {
            p.x += p.vx;
            p.y += p.vy;
            // Accelerate toward center
            p.vx += (dx / dist) * 0.08;
            p.vy += (dy / dist) * 0.08;
          }
        } else {
          // Orbit around center
          p.orbitAngle += p.orbitSpeed;
          const orbitR = ORB_RADIUS + 15 + Math.sin(p.orbitAngle * 3) * 5;
          p.x = CX + Math.cos(p.orbitAngle) * orbitR;
          p.y = CY + Math.sin(p.orbitAngle) * orbitR;
          p.alpha *= 0.998; // Very slow fade

          if (p.alpha < 0.05) {
            particles.splice(i, 1);
            continue;
          }
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();

        // Particle trail
        if (!p.settled) {
          ctx.beginPath();
          ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, p.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.round(p.alpha * 100).toString(16).padStart(2, "0");
          ctx.fill();
        }

        // Remove expired
        if (p.life > p.maxLife && !p.settled) {
          particles.splice(i, 1);
        }
      }

      // ── Revenue Text ──────────────────────────────────────
      ctx.font = "bold 22px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${revenueRef.current.toLocaleString()}`, CX, CY - 4);

      ctx.font = "bold 8px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText("EGP", CX, CY + 14);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Demo burst on mount for visual verification
  useEffect(() => {
    const timer = setTimeout(() => {
      spawnBurst("#22c55e", 200);
      setTimeout(() => spawnBurst("#3b82f6", 150), 300);
      setTimeout(() => spawnBurst("#f59e0b", 100), 600);
    }, 500);
    return () => clearTimeout(timer);
  }, [spawnBurst]);

  return (
    <div className={cn("relative rounded-2xl overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        style={{ width: CANVAS_W, height: CANVAS_H }}
        className="w-full"
      />

      {/* Overlay labels */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Revenue Pulse</span>
      </div>

      <div className="absolute bottom-4 right-4 text-[8px] font-bold text-slate-700 uppercase tracking-wider">
        {particlesRef.current.length} particles
      </div>
    </div>
  );
};

export default RevenuePulse;
