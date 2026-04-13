import React, { useEffect, useRef, useCallback, useState } from "react";
import gsap from "gsap";

/**
 * Cinematic Splash — "Particle Convergence" 
 * 
 * 5-stage animation:
 * 1. Void → 50 emerald particles drift inward from edges
 * 2. Particles condense into "SF" logomark with shockwave ring
 * 3. Logo scales down, "SessionFlow" reveals letter-by-letter with premium typography
 * 4. Subtitle fades in with shimmer
 * 5. Cinematic warp-blur exit into the app
 */

const PARTICLE_COUNT = 50;
const TOTAL_DURATION = 6000; // ms

// Generate random particle starting positions
const generateParticles = () =>
  Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const distance = 300 + Math.random() * 250;
    return {
      id: i,
      startX: Math.cos(angle) * distance,
      startY: Math.sin(angle) * distance,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 0.6,
      hue: 155 + Math.random() * 25,
      opacity: 0.4 + Math.random() * 0.6,
    };
  });

/**
 * Premium cinematic audio — multi-layered synthesized sound design
 * Layer 1: Sub bass rumble (deep presence)
 * Layer 2: Pad chord swell (atmosphere)
 * Layer 3: Crystal chime arpeggio (D5 → F#5 → A5 → D6)
 * Layer 4: Metallic shimmer (high-frequency sparkle)
 * Layer 5: Impact transient (shockwave moment)
 */
/**
 * Creative "Deep Resonance" sound design
 * Synthesized cinematic audio with multi-stage convergence
 */
const playSplashSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.connect(ctx.destination);

    const playTone = (f: number, s: number, d: number, v: number, type: OscillatorType = "sine", sweep?: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, now + s);
      if (sweep) osc.frequency.exponentialRampToValueAtTime(sweep, now + s + d);
      gain.gain.setValueAtTime(0, now + s);
      gain.gain.linearRampToValueAtTime(v, now + s + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + s + d);
      osc.connect(gain);
      gain.connect(compressor);
      osc.start(now + s);
      osc.stop(now + s + d);
    };

    // Sub-harmonic foundation
    playTone(40, 0, 3, 0.4, "sine");
    playTone(60, 0.2, 2.5, 0.3, "sine");

    // Atmospheric Swell
    playTone(220, 0.4, 2, 0.1, "triangle", 440);
    playTone(330, 0.5, 2, 0.08, "triangle", 660);

    // Tech "Neural" Bleeps (Arpeggio)
    [880, 1320, 1760, 2640].forEach((freq, i) => {
      playTone(freq, 0.8 + (i * 0.15), 0.8, 0.05, "sine");
    });

    // Final "Power Surge" Impact
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = "sawtooth";
    noise.frequency.setValueAtTime(100, now + 1.2);
    noise.frequency.exponentialRampToValueAtTime(1000, now + 1.4);
    noiseGain.gain.setValueAtTime(0, now + 1.2);
    noiseGain.gain.linearRampToValueAtTime(0.1, now + 1.25);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    noise.connect(noiseGain);
    noiseGain.connect(compressor);
    noise.start(now + 1.2);
    noise.stop(now + 1.8);

  } catch (e) { /* Audio fail */ }
};

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const [particles] = useState(generateParticles);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    tlRef.current?.kill();
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 1.1,
        filter: "blur(30px)",
        duration: 0.4,
        ease: "power2.in",
        onComplete: onFinish,
      });
    } else {
      onFinish();
    }
  }, [onFinish]);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: finish,
      defaults: { ease: "expo.out" },
    });
    tlRef.current = tl;

    // --- STAGE 1: Particle Convergence (0 → 0.9s) ---
    tl.fromTo(
      ".splash-particle",
      {
        x: (i: number) => particles[i]?.startX || 0,
        y: (i: number) => particles[i]?.startY || 0,
        opacity: 0,
        scale: 1,
      },
      {
        x: 0,
        y: 0,
        opacity: (i: number) => particles[i]?.opacity || 0.6,
        scale: 0.5,
        duration: 0.9,
        stagger: { each: 0.008, from: "random" },
        ease: "power3.inOut",
        onStart: () => playSplashSound(),
      }
    );

    // --- STAGE 2: Shockwave + Logo Reveal ---
    tl.to(
      ".splash-particle",
      {
        opacity: 0,
        scale: 0,
        duration: 0.3,
        stagger: { each: 0.008, from: "center" },
      },
      "-=0.2"
    );

    // Primary shockwave ring
    tl.fromTo(
      ringRef.current,
      { scale: 0, opacity: 1 },
      { scale: 3.5, opacity: 0, duration: 1.0, ease: "power2.out" },
      "-=0.3"
    );

    // Secondary ring (delayed)
    tl.fromTo(
      ring2Ref.current,
      { scale: 0, opacity: 0.6 },
      { scale: 2.5, opacity: 0, duration: 0.8, ease: "power2.out" },
      "-=0.7"
    );

    // Logo fade-in
    tl.fromTo(
      logoRef.current,
      { scale: 0.3, opacity: 0, rotateY: -90 },
      {
        scale: 1,
        opacity: 1,
        rotateY: 0,
        duration: 0.9,
        ease: "back.out(1.7)",
      },
      "-=0.7"
    );

    // --- STAGE 3: Text Reveal ---
    tl.to(
      logoRef.current,
      { y: -40, scale: 0.65, duration: 0.6, ease: "power2.inOut" },
      "+=0.3"
    );

    // "SessionFlow" letter-by-letter
    tl.fromTo(
      ".splash-letter",
      { y: 50, opacity: 0, rotateX: -90, scale: 0.8 },
      {
        y: 0,
        opacity: 1,
        rotateX: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.035,
        ease: "back.out(2.5)",
      },
      "-=0.3"
    );

    // Subtitle fade
    tl.fromTo(
      subtitleRef.current,
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 },
      "-=0.2"
    );

    // --- STAGE 4: Hold & Exit ---
    tl.to({}, { duration: 0.8 });

    tl.to(containerRef.current, {
      opacity: 0,
      scale: 1.05,
      filter: "blur(24px)",
      duration: 0.5,
      ease: "power2.in",
    });

    const safetyTimer = setTimeout(finish, TOTAL_DURATION + 1000);

    return () => {
      clearTimeout(safetyTimer);
      tl.kill();
    };
  }, [particles, finish]);

  // Click or keydown to skip
  useEffect(() => {
    const skip = () => finish();
    window.addEventListener("mousedown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      window.removeEventListener("mousedown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [finish]);

  // "SessionFlow" with proper casing
  const brandName = "SessionFlow";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-[#030712] flex items-center justify-center overflow-hidden select-none"
      style={{ perspective: "1200px" }}
    >
      {/* Ambient background glow — multi-layered */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/[0.05] rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-teal-500/[0.04] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-cyan-400/[0.03] rounded-full blur-[60px]" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Particles Container */}
      <div
        ref={particlesRef}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        {particles.map((p) => (
          <div
            key={p.id}
            className="splash-particle absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: `hsl(${p.hue}, 85%, 60%)`,
              boxShadow: `0 0 ${p.size * 4}px hsl(${p.hue}, 85%, 60%)`,
              willChange: "transform, opacity",
            }}
          />
        ))}
      </div>

      {/* Primary Shockwave Ring */}
      <div
        ref={ringRef}
        className="absolute w-24 h-24 rounded-full border-2 border-emerald-400/60 opacity-0"
        style={{
          boxShadow: "0 0 60px rgba(16, 185, 129, 0.4), inset 0 0 40px rgba(16, 185, 129, 0.1)",
          willChange: "transform, opacity",
        }}
      />
      
      {/* Secondary Shockwave Ring */}
      <div
        ref={ring2Ref}
        className="absolute w-32 h-32 rounded-full border border-teal-400/30 opacity-0"
        style={{
          boxShadow: "0 0 40px rgba(20, 184, 166, 0.2)",
          willChange: "transform, opacity",
        }}
      />

      {/* Logo Mark */}
      <div
        ref={logoRef}
        className="absolute flex items-center justify-center opacity-0"
        style={{ willChange: "transform, opacity", transformStyle: "preserve-3d" }}
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.5),0_20px_60px_rgba(0,0,0,0.5)] border border-emerald-400/40 relative overflow-hidden">
          {/* Inner light sweep */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
          <span className="text-white font-brand font-black text-4xl tracking-tighter relative z-10 drop-shadow-lg">SF</span>
        </div>
      </div>

      {/* Brand Text — "SessionFlow" with proper casing — ALWAYS LTR */}
      <div
        ref={textRef}
        className="absolute flex items-center justify-center mt-20"
        style={{ perspective: "800px", direction: "ltr" }}
      >
        <div className="flex gap-[2px]" dir="ltr">
          {brandName.split("").map((char, i) => (
            <span
              key={i}
              className="splash-letter text-[46px] md:text-[60px] font-brand font-black text-white tracking-[0.08em] opacity-0"
              style={{
                textShadow: "0 0 40px rgba(16, 185, 129, 0.4), 0 0 80px rgba(16, 185, 129, 0.12), 0 4px 20px rgba(0,0,0,0.5)",
                willChange: "transform, opacity",
                transformStyle: "preserve-3d",
                color: i === 7 ? "#10b981" : undefined, // The "F" in "Flow" gets emerald accent
              }}
            >
              {char}
            </span>
          ))}
        </div>
      </div>

      {/* Subtitle */}
      <div
        ref={subtitleRef}
        className="absolute mt-48 md:mt-52 opacity-0"
      >
        <p className="text-[11px] md:text-[12px] font-bold text-emerald-500/60 uppercase tracking-[0.6em]">
          Enterprise Session Management
        </p>
      </div>

      {/* Skip hint */}
      <div className="absolute bottom-8 text-[9px] text-slate-700 font-bold uppercase tracking-[0.3em] animate-pulse">
        Click anywhere to skip
      </div>
    </div>
  );
};

export default SplashScreen;
