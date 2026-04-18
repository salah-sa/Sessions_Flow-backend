import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type PandaState = "idle" | "watching" | "password" | "success" | "error";

interface RealisticPandaMascotProps {
  state: PandaState;
  passwordStrength?: number;
}

/**
 * Ultra-detailed 2D panda mascot — pure SVG with rich shading.
 *
 * States:
 * - idle/watching: Calmly eating bamboo. Chewing animation, natural breathing,
 *   random eye blinks, gentle ear twitches, bamboo leaf sway.
 * - password: Drops bamboo. Eyes widen and look down toward the password field.
 *   Paws reach forward curiously. Head tilts. "?" curiosity indicator.
 * - success: Happy eyes, sparkles.
 * - error: Sad eyes, slight shake.
 *
 * Zero external assets. Renders instantly. 60fps via requestAnimationFrame.
 */
const RealisticPandaMascot: React.FC<RealisticPandaMascotProps> = ({
  state,
  passwordStrength = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [chewPhase, setChewPhase] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0);
  const animFrameRef = useRef<number>(0);
  const targetRef = useRef({ x: 0, y: 0 });

  const isIdle = state === "idle" || state === "watching";
  const isPeek = state === "password";
  const isSuccess = state === "success";
  const isError = state === "error";

  /* ─── Smooth eye tracking via rAF ─── */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const max = 4.5;
    const f = Math.min(dist / 400, 1);
    targetRef.current = {
      x: (dx / (dist || 1)) * max * f,
      y: (dy / (dist || 1)) * max * f,
    };
  }, []);

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      setEyeOffset((p) => ({
        x: p.x + (targetRef.current.x - p.x) * 0.08,
        y: p.y + (targetRef.current.y - p.y) * 0.08,
      }));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  /* ─── Natural blink cycle ─── */
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 120);
    };
    const id = setInterval(blink, 2600 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  /* ─── Chewing animation (idle only) ─── */
  useEffect(() => {
    if (!isIdle) return;
    const id = setInterval(() => setChewPhase((p) => (p + 1) % 6), 350);
    return () => clearInterval(id);
  }, [isIdle]);

  /* ─── Breathing cycle ─── */
  useEffect(() => {
    const id = setInterval(() => setBreathPhase((p) => (p + 1) % 60), 80);
    return () => clearInterval(id);
  }, []);

  // Breathing offset — sinusoidal
  const breathY = Math.sin((breathPhase / 60) * Math.PI * 2) * 1.2;
  const breathScale = 1 + Math.sin((breathPhase / 60) * Math.PI * 2) * 0.008;

  // Chew mouth shapes — 6-frame cycle for realism
  const chewMouthPaths = [
    "M72 118 Q80 122 88 118", // slightly open
    "M73 117 Q80 120 87 117", // closing
    "M73 116 Q80 118 87 116", // closed chewing
    "M73 117 Q80 121 87 117", // opening
    "M72 118 Q80 123 88 118", // open wider
    "M73 117 Q80 119 87 117", // back to closing
  ];

  // Bamboo wobble
  const bambooAngle = isIdle
    ? Math.sin((breathPhase / 60) * Math.PI * 2 + chewPhase * 0.5) * 2.5
    : 0;

  return (
    <motion.div
      ref={containerRef}
      className="relative select-none"
      style={{
        width: 200,
        height: 200,
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))",
      }}
      animate={{
        y: isPeek ? 8 : 0,
        scale: isPeek ? 1.08 : 1,
      }}
      transition={{ type: "spring", stiffness: 100, damping: 18 }}
    >
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: `translateY(${breathY}px) scale(${breathScale})`,
          transition: "transform 0.08s linear",
        }}
      >
        <defs>
          {/* ═══ Rich Gradients for realistic shading ═══ */}
          {/* Main white fur — warm subtle gradient */}
          <radialGradient id="rpFurWhite" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#fafaf9" />
            <stop offset="60%" stopColor="#f0eeec" />
            <stop offset="100%" stopColor="#e2dfdb" />
          </radialGradient>
          {/* Dark fur — rich charcoal with depth */}
          <radialGradient id="rpFurDark" cx="45%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="50%" stopColor="#252525" />
            <stop offset="100%" stopColor="#151515" />
          </radialGradient>
          {/* Dark fur highlight overlay */}
          <radialGradient id="rpFurHighlight" cx="40%" cy="25%" r="40%">
            <stop offset="0%" stopColor="#555" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* Ear inner — very subtle warm pink */}
          <radialGradient id="rpEarInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4a4040" />
            <stop offset="100%" stopColor="#2a2222" />
          </radialGradient>
          {/* Nose — super dark with sheen */}
          <radialGradient id="rpNose" cx="38%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="100%" stopColor="#111" />
          </radialGradient>
          {/* Cheek blush — realistic warm under-fur tint */}
          <radialGradient id="rpBlush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5c6c6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f5c6c6" stopOpacity="0" />
          </radialGradient>
          {/* Bamboo stalk */}
          <linearGradient id="rpBamboo" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5B7F1A" />
            <stop offset="30%" stopColor="#7DA832" />
            <stop offset="50%" stopColor="#8FBC3F" />
            <stop offset="70%" stopColor="#7DA832" />
            <stop offset="100%" stopColor="#5B7F1A" />
          </linearGradient>
          {/* Bamboo leaf */}
          <linearGradient id="rpLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4CAF50" />
            <stop offset="100%" stopColor="#2E7D32" />
          </linearGradient>
          {/* Body shadow — subtle ambient occlusion on white fur */}
          <radialGradient id="rpBodyShadow" cx="50%" cy="70%" r="50%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="#d5d0cb" stopOpacity="0.5" />
          </radialGradient>
          {/* Eye socket shadow */}
          <radialGradient id="rpEyeShadow" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#0f0f0f" />
          </radialGradient>
          {/* Belly — softer white */}
          <radialGradient id="rpBelly" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f0eeeb" />
          </radialGradient>
          {/* Paw pad */}
          <radialGradient id="rpPawPad" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#d4b8a8" />
            <stop offset="100%" stopColor="#bfa090" />
          </radialGradient>
        </defs>

        {/* ══════════════════ EARS ══════════════════ */}
        {/* Left ear — outer (dark fur) */}
        <motion.ellipse
          cx="36" cy="30" rx="20" ry="19"
          fill="url(#rpFurDark)"
          animate={{ cy: [30, 28, 30], rx: [20, 20.3, 20] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Left ear — fur texture highlight */}
        <ellipse cx="36" cy="28" rx="14" ry="12" fill="url(#rpFurHighlight)" />
        {/* Left ear — inner */}
        <ellipse cx="36" cy="31" rx="10" ry="9" fill="url(#rpEarInner)" />

        {/* Right ear — outer */}
        <motion.ellipse
          cx="124" cy="30" rx="20" ry="19"
          fill="url(#rpFurDark)"
          animate={{ cy: [30, 28, 30], rx: [20, 20.3, 20] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
        <ellipse cx="124" cy="28" rx="14" ry="12" fill="url(#rpFurHighlight)" />
        <ellipse cx="124" cy="31" rx="10" ry="9" fill="url(#rpEarInner)" />

        {/* ══════════════════ HEAD ══════════════════ */}
        {/* Main head shape — white fur */}
        <ellipse cx="80" cy="72" rx="50" ry="46" fill="url(#rpFurWhite)" />
        {/* Head shadow / depth */}
        <ellipse cx="80" cy="78" rx="46" ry="38" fill="url(#rpBodyShadow)" opacity="0.3" />

        {/* ══════════════════ EYE PATCHES ══════════════════ */}
        {/* Left eye patch — dark fur, tilted */}
        <motion.ellipse
          cx="56" cy="68" rx="22" ry="18"
          fill="url(#rpFurDark)"
          style={{ transform: "rotate(-8deg)", transformOrigin: "56px 68px" }}
          animate={{ ry: isPeek ? 19 : 18 }}
          transition={{ duration: 0.4 }}
        />
        <ellipse cx="56" cy="66" rx="16" ry="12" fill="url(#rpFurHighlight)" style={{ transform: "rotate(-8deg)", transformOrigin: "56px 66px" }} />

        {/* Right eye patch */}
        <motion.ellipse
          cx="104" cy="68" rx="22" ry="18"
          fill="url(#rpFurDark)"
          style={{ transform: "rotate(8deg)", transformOrigin: "104px 68px" }}
          animate={{ ry: isPeek ? 19 : 18 }}
          transition={{ duration: 0.4 }}
        />
        <ellipse cx="104" cy="66" rx="16" ry="12" fill="url(#rpFurHighlight)" style={{ transform: "rotate(8deg)", transformOrigin: "104px 66px" }} />

        {/* ══════════════════ EYES ══════════════════ */}
        <g
          style={{
            transform: `translate(${isPeek ? 0 : eyeOffset.x}px, ${isPeek ? 4 : eyeOffset.y}px)`,
            transition: "transform 0.12s ease-out",
          }}
        >
          {/* Left eye white */}
          <motion.ellipse
            cx="56" cy="68"
            rx={isPeek ? 10 : 9}
            ry={isBlinking ? 1 : (isPeek ? 7 : 9)}
            fill="white"
            transition={{ duration: 0.1 }}
          />
          {/* Left iris */}
          <motion.ellipse
            cx="56" cy={isPeek ? 70 : 68}
            rx={isPeek ? 6 : 5}
            ry={isBlinking ? 0.5 : (isPeek ? 5.5 : 5.5)}
            fill="#2c1810"
            transition={{ duration: 0.25 }}
          />
          {/* Left pupil */}
          <motion.circle
            cx="56" cy={isPeek ? 70 : 68}
            r={isBlinking ? 0 : (isPeek ? 3.5 : 3)}
            fill="#0a0a0a"
            transition={{ duration: 0.2 }}
          />
          {/* Left eye highlights — two-point reflection */}
          <circle cx="59" cy={isPeek ? 66 : 64} r="2.8" fill="white" opacity={isBlinking ? 0 : 0.92} />
          <circle cx="54" cy={isPeek ? 72 : 70} r="1.3" fill="white" opacity={isBlinking ? 0 : 0.5} />

          {/* Right eye white */}
          <motion.ellipse
            cx="104" cy="68"
            rx={isPeek ? 10 : 9}
            ry={isBlinking ? 1 : (isPeek ? 7 : 9)}
            fill="white"
            transition={{ duration: 0.1 }}
          />
          {/* Right iris */}
          <motion.ellipse
            cx="104" cy={isPeek ? 70 : 68}
            rx={isPeek ? 6 : 5}
            ry={isBlinking ? 0.5 : (isPeek ? 5.5 : 5.5)}
            fill="#2c1810"
            transition={{ duration: 0.25 }}
          />
          {/* Right pupil */}
          <motion.circle
            cx="104" cy={isPeek ? 70 : 68}
            r={isBlinking ? 0 : (isPeek ? 3.5 : 3)}
            fill="#0a0a0a"
            transition={{ duration: 0.2 }}
          />
          {/* Right eye highlights */}
          <circle cx="107" cy={isPeek ? 66 : 64} r="2.8" fill="white" opacity={isBlinking ? 0 : 0.92} />
          <circle cx="102" cy={isPeek ? 72 : 70} r="1.3" fill="white" opacity={isBlinking ? 0 : 0.5} />
        </g>

        {/* ══════════════════ EYEBROWS — subtle, only in peek ══════════════════ */}
        <motion.path
          d="M40 54 Q56 48 68 54"
          stroke="#252525"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          animate={{ opacity: isPeek ? 0.7 : 0, d: isPeek ? "M40 52 Q56 46 68 54" : "M40 54 Q56 48 68 54" }}
          transition={{ duration: 0.4 }}
        />
        <motion.path
          d="M92 54 Q104 48 120 54"
          stroke="#252525"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          animate={{ opacity: isPeek ? 0.7 : 0, d: isPeek ? "M92 54 Q104 46 120 52" : "M92 54 Q104 48 120 54" }}
          transition={{ duration: 0.4 }}
        />

        {/* ══════════════════ NOSE ══════════════════ */}
        <motion.ellipse
          cx="80" cy="86" rx="7" ry="5"
          fill="url(#rpNose)"
          animate={{ ry: isIdle ? [5, 4.6, 5] : 5 }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        {/* Nose highlight / sheen */}
        <ellipse cx="78" cy="84" rx="3" ry="1.8" fill="#555" opacity="0.35" />
        {/* Nostrils */}
        <circle cx="77" cy="87" r="1.2" fill="#0a0a0a" opacity="0.5" />
        <circle cx="83" cy="87" r="1.2" fill="#0a0a0a" opacity="0.5" />

        {/* ══════════════════ MUZZLE SHAPE ══════════════════ */}
        {/* White fur muzzle */}
        <ellipse cx="80" cy="92" rx="18" ry="13" fill="#fafaf9" />
        <ellipse cx="80" cy="90" rx="14" ry="8" fill="#f5f5f3" opacity="0.6"/>

        {/* Vertical line nose → mouth */}
        <line x1="80" y1="90" x2="80" y2="95" stroke="#333" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />

        {/* ══════════════════ MOUTH ══════════════════ */}
        {isSuccess ? (
          <motion.path
            d="M68 100 Q80 112 92 100"
            stroke="#333"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35 }}
          />
        ) : isError ? (
          <path d="M72 106 Q80 98 88 106" stroke="#555" strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : isPeek ? (
          /* Curious little 'o' */
          <motion.ellipse
            cx="80" cy="100" rx="4" ry="3.5"
            fill="#5a4040"
            initial={{ ry: 0 }}
            animate={{ ry: 3.5 }}
            transition={{ duration: 0.35 }}
          />
        ) : (
          /* Chewing mouth */
          <path
            d={chewMouthPaths[chewPhase]}
            stroke="#444"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            style={{ transition: "d 0.12s ease" }}
          />
        )}

        {/* ══════════════════ CHEEK BLUSH ══════════════════ */}
        <ellipse cx="38" cy="90" rx="10" ry="6" fill="url(#rpBlush)" />
        <ellipse cx="122" cy="90" rx="10" ry="6" fill="url(#rpBlush)" />

        {/* ══════════════════ BODY ══════════════════ */}
        <ellipse cx="80" cy="132" rx="42" ry="30" fill="url(#rpFurWhite)" />
        <ellipse cx="80" cy="136" rx="38" ry="24" fill="url(#rpBodyShadow)" opacity="0.2" />
        {/* Belly — softer lighter white */}
        <ellipse cx="80" cy="130" rx="26" ry="18" fill="url(#rpBelly)" />

        {/* ══════════════════ ARMS ══════════════════ */}
        {/* Left arm */}
        <motion.path
          d={
            isPeek
              ? "M40 115 Q52 128 62 136 Q68 140 72 136 Q74 130 64 120 Z"
              : "M38 115 Q24 128 28 146 Q32 154 40 148 Q48 140 46 125 Z"
          }
          fill="url(#rpFurDark)"
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        />
        {/* Left arm highlight */}
        <motion.path
          d={
            isPeek
              ? "M44 118 Q54 128 62 134"
              : "M42 118 Q30 128 32 140"
          }
          stroke="#444"
          strokeWidth="0.8"
          fill="none"
          opacity="0.3"
          transition={{ duration: 0.5 }}
        />

        {/* Right arm */}
        <motion.path
          d={
            isPeek
              ? "M120 115 Q108 128 98 136 Q92 140 88 136 Q86 130 96 120 Z"
              : "M122 115 Q136 128 132 146 Q128 154 120 148 Q112 140 114 125 Z"
          }
          fill="url(#rpFurDark)"
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        />
        <motion.path
          d={
            isPeek
              ? "M116 118 Q106 128 98 134"
              : "M118 118 Q130 128 128 140"
          }
          stroke="#444"
          strokeWidth="0.8"
          fill="none"
          opacity="0.3"
          transition={{ duration: 0.5 }}
        />

        {/* ══════════════ PAW PADS (peek only) ══════════════ */}
        <AnimatePresence>
          {isPeek && (
            <>
              {/* Left paw */}
              <motion.ellipse
                cx="70" cy="136" rx="6" ry="4.5"
                fill="url(#rpPawPad)"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              />
              {/* Left toe beans */}
              <motion.circle cx="66" cy="133" r="1.6" fill="#c4a090" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.25 }} />
              <motion.circle cx="70" cy="132" r="1.6" fill="#c4a090" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.28 }} />
              <motion.circle cx="74" cy="133" r="1.6" fill="#c4a090" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.31 }} />

              {/* Right paw */}
              <motion.ellipse
                cx="90" cy="136" rx="6" ry="4.5"
                fill="url(#rpPawPad)"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3, delay: 0.18 }}
              />
              <motion.circle cx="86" cy="133" r="1.6" fill="#c4a090" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.25 }} />
              <motion.circle cx="90" cy="132" r="1.6" fill="#c4a090" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.28 }} />
              <motion.circle cx="94" cy="133" r="1.6" fill="#c4a090" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.31 }} />
            </>
          )}
        </AnimatePresence>

        {/* ═══════════ BAMBOO (idle only) ═══════════ */}
        <AnimatePresence>
          {isIdle && (
            <motion.g
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0, rotate: bambooAngle }}
              exit={{ opacity: 0, y: 8, x: -8 }}
              transition={{ duration: 0.5 }}
              style={{ transformOrigin: "22px 100px" }}
            >
              {/* Main stalk */}
              <rect x="14" y="60" width="8" height="60" rx="4" fill="url(#rpBamboo)" />
              {/* Segment nodes */}
              <rect x="13" y="72" width="10" height="2.5" rx="1" fill="#5B7F1A" opacity="0.7" />
              <rect x="13" y="88" width="10" height="2.5" rx="1" fill="#5B7F1A" opacity="0.7" />
              <rect x="13" y="104" width="10" height="2.5" rx="1" fill="#5B7F1A" opacity="0.7" />

              {/* Top leaf cluster */}
              <motion.path
                d="M18 60 Q8 48 4 38 Q10 44 18 56"
                fill="url(#rpLeaf)"
                animate={{ rotate: [-2, 3, -2] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.path
                d="M22 58 Q32 46 36 36 Q30 44 22 54"
                fill="url(#rpLeaf)"
                animate={{ rotate: [2, -3, 2] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              />
              <motion.path
                d="M16 62 Q6 56 2 48 Q8 54 16 60"
                fill="#43A047"
                opacity="0.8"
                animate={{ rotate: [-1, 2, -1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />

              {/* Bottom leaf */}
              <path d="M14 112 Q6 106 2 96 Q8 104 14 110" fill="#4CAF50" opacity="0.65" />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Left paw holding bamboo (idle only) */}
        <AnimatePresence>
          {isIdle && (
            <motion.g
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.35 }}
            >
              <ellipse cx="28" cy="98" rx="11" ry="9" fill="url(#rpFurDark)" />
              {/* Paw pad visible */}
              <ellipse cx="28" cy="100" rx="6" ry="4" fill="url(#rpPawPad)" opacity="0.5" />
              {/* Tiny claws */}
              <circle cx="22" cy="96" r="1" fill="#bfa090" opacity="0.4" />
              <circle cx="26" cy="94" r="1" fill="#bfa090" opacity="0.4" />
              <circle cx="30" cy="94" r="1" fill="#bfa090" opacity="0.4" />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ══════════════════ FEET ══════════════════ */}
        <ellipse cx="60" cy="158" rx="16" ry="6" fill="url(#rpFurDark)" />
        <ellipse cx="100" cy="158" rx="16" ry="6" fill="url(#rpFurDark)" />
        {/* Foot pad detail */}
        <ellipse cx="60" cy="159" rx="8" ry="3" fill="url(#rpPawPad)" opacity="0.35" />
        <ellipse cx="100" cy="159" rx="8" ry="3" fill="url(#rpPawPad)" opacity="0.35" />

        {/* ══════════════ FUR TEXTURE DETAIL ══════════════ */}
        {/* Subtle fur stroke lines on head edges */}
        <path d="M32 56 Q34 52 36 56" stroke="#d8d4d0" strokeWidth="0.6" fill="none" opacity="0.5" />
        <path d="M124 56 Q126 52 128 56" stroke="#d8d4d0" strokeWidth="0.6" fill="none" opacity="0.5" />
        <path d="M44 40 Q46 36 48 40" stroke="#d8d4d0" strokeWidth="0.6" fill="none" opacity="0.4" />
        <path d="M112 40 Q114 36 116 40" stroke="#d8d4d0" strokeWidth="0.6" fill="none" opacity="0.4" />
      </svg>

      {/* ═══ Curiosity indicator — "?" ═══ */}
      <AnimatePresence>
        {isPeek && (
          <motion.div
            className="absolute -top-2 -right-1"
            initial={{ opacity: 0, y: 6, scale: 0.3, rotate: -15 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: -6, scale: 0.3 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            <span className="text-2xl font-black text-[var(--ui-accent)] drop-shadow-[0_0_8px_rgba(var(--ui-accent-rgb),0.6)]">?</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Success sparkles ═══ */}
      <AnimatePresence>
        {isSuccess && (
          <>
            <motion.div className="absolute -top-3 left-1/2" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0 }}>
              <span className="text-lg">✨</span>
            </motion.div>
            <motion.div className="absolute top-0 left-4" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.1 }}>
              <span className="text-sm">⭐</span>
            </motion.div>
            <motion.div className="absolute top-0 right-4" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.2 }}>
              <span className="text-sm">⭐</span>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RealisticPandaMascot;
