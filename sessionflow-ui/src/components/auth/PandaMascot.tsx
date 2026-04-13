import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

type PandaState = "idle" | "watching" | "password" | "success" | "error";

interface PandaMascotProps {
  state: PandaState;
  passwordStrength?: number;
}

/**
 * Interactive 2D animated panda mascot for auth pages.
 *
 * Behaviors:
 * - idle / watching: Panda eats bamboo calmly, eyes track the mouse.
 * - password: Panda drops bamboo, leans forward curiously, and reaches
 *   its paws toward the password field to "peek".
 * - success: Happy bounce with sparkle eyes.
 * - error: Sad shake.
 *
 * Built entirely with inline SVG + Framer Motion for 60 fps transitions.
 */
const PandaMascot: React.FC<PandaMascotProps> = ({ state, passwordStrength = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [chewPhase, setChewPhase] = useState(0); // 0-3 for chewing cycle
  const animFrameRef = useRef<number>(0);
  const targetRef = useRef({ x: 0, y: 0 });

  /* ───── smooth eye-tracking ───── */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const max = 5;
    const f = Math.min(dist / 350, 1);
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
        x: p.x + (targetRef.current.x - p.x) * 0.1,
        y: p.y + (targetRef.current.y - p.y) * 0.1,
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

  /* ───── blinking ───── */
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 130);
    };
    const id = setInterval(blink, 2800 + Math.random() * 2200);
    return () => clearInterval(id);
  }, []);

  /* ───── chewing cycle (only when idle/watching) ───── */
  useEffect(() => {
    if (state === "idle" || state === "watching") {
      const id = setInterval(() => {
        setChewPhase((p) => (p + 1) % 4);
      }, 400);
      return () => clearInterval(id);
    }
  }, [state]);

  const isIdle = state === "idle" || state === "watching";
  const isPeek = state === "password";
  const isSuccess = state === "success";
  const isError = state === "error";

  // Chew mouth shapes
  const chewMouths = [
    "M56 82 Q60 86 64 82", // slightly open
    "M55 83 Q60 80 65 83", // closed (chewing)
    "M56 82 Q60 87 64 82", // open wider
    "M55 83 Q60 81 65 83", // closed again
  ];

  // Bamboo wobble based on chew
  const bambooRotation = isIdle ? [0, -3, 0, 3][chewPhase] : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-[160px] h-[160px] mx-auto select-none ${
        isSuccess ? "animate-bounce" : ""
      } ${isError ? "animate-shake" : ""}`}
      style={{ filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.35))" }}
    >
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Body Gradient — soft white-grey for panda belly */}
          <radialGradient id="pandaBody" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#e0e0e0" />
          </radialGradient>
          {/* Dark fur patches */}
          <radialGradient id="pandaDark" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#2d2d2d" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </radialGradient>
          {/* Bamboo */}
          <linearGradient id="bambooGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6B8E23" />
            <stop offset="50%" stopColor="#8FBC3F" />
            <stop offset="100%" stopColor="#6B8E23" />
          </linearGradient>
          {/* Leaf */}
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4CAF50" />
            <stop offset="100%" stopColor="#2E7D32" />
          </linearGradient>
          {/* Cheek blush */}
          <radialGradient id="blush">
            <stop offset="0%" stopColor="#FFB6C1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFB6C1" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ════════════════  EARS  ════════════════ */}
        {/* Left ear (dark) */}
        <motion.ellipse
          cx="38" cy="32" rx="18" ry="17"
          fill="url(#pandaDark)"
          animate={{ cy: isIdle ? [32, 30, 32] : 32 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Left ear inner pink */}
        <ellipse cx="38" cy="32" rx="9" ry="8" fill="#3d3d3d" />

        {/* Right ear (dark) */}
        <motion.ellipse
          cx="122" cy="32" rx="18" ry="17"
          fill="url(#pandaDark)"
          animate={{ cy: isIdle ? [32, 30, 32] : 32 }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        {/* Right ear inner */}
        <ellipse cx="122" cy="32" rx="9" ry="8" fill="#3d3d3d" />

        {/* ════════════════  HEAD  ════════════════ */}
        {/* Main head — white */}
        <motion.ellipse
          cx="80" cy="68" rx="48" ry="44"
          fill="url(#pandaBody)"
          stroke="#d4d4d4"
          strokeWidth="0.5"
          animate={{
            ry: isIdle ? [44, 43, 44] : 44,
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ════════════════  EYE PATCHES (dark)  ════════════════ */}
        {/* Left eye patch */}
        <motion.ellipse
          cx="58" cy="62" rx="19" ry="17"
          fill="url(#pandaDark)"
          animate={{
            rotate: isPeek ? -5 : 0,
          }}
          style={{ originX: "58px", originY: "62px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Right eye patch */}
        <motion.ellipse
          cx="102" cy="62" rx="19" ry="17"
          fill="url(#pandaDark)"
          animate={{
            rotate: isPeek ? 5 : 0,
          }}
          style={{ originX: "102px", originY: "62px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {/* ════════════════  EYES  ════════════════ */}
        <g
          style={{
            transform: `translate(${isPeek ? 0 : eyeOffset.x}px, ${isPeek ? 3 : eyeOffset.y}px)`,
            transition: "transform 0.1s ease-out",
          }}
        >
          {/* Left eye white */}
          <motion.ellipse
            cx="58" cy="62"
            rx="9" ry={isBlinking ? 1 : (isPeek ? 6 : 9)}
            fill="white"
            animate={{
              ry: isBlinking ? 1 : (isPeek ? 6 : 9),
            }}
            transition={{ duration: 0.1 }}
          />
          {/* Left pupil */}
          <motion.ellipse
            cx="58" cy="63"
            rx={isPeek ? 5 : 4.5}
            ry={isBlinking ? 0.5 : (isPeek ? 4.5 : 4.5)}
            fill="#1a1a1a"
            animate={{
              cy: isPeek ? 65 : 63,
              rx: isPeek ? 5 : 4.5,
            }}
            transition={{ duration: 0.3 }}
          />
          {/* Left eye highlight */}
          <circle cx="61" cy="59" r="2.5" fill="white" opacity={isBlinking ? 0 : 0.9} />
          <circle cx="55" cy="64" r="1.2" fill="white" opacity={isBlinking ? 0 : 0.5} />

          {/* Right eye white */}
          <motion.ellipse
            cx="102" cy="62"
            rx="9" ry={isBlinking ? 1 : (isPeek ? 6 : 9)}
            fill="white"
            animate={{
              ry: isBlinking ? 1 : (isPeek ? 6 : 9),
            }}
            transition={{ duration: 0.1 }}
          />
          {/* Right pupil */}
          <motion.ellipse
            cx="102" cy="63"
            rx={isPeek ? 5 : 4.5}
            ry={isBlinking ? 0.5 : (isPeek ? 4.5 : 4.5)}
            fill="#1a1a1a"
            animate={{
              cy: isPeek ? 65 : 63,
              rx: isPeek ? 5 : 4.5,
            }}
            transition={{ duration: 0.3 }}
          />
          {/* Right eye highlight */}
          <circle cx="105" cy="59" r="2.5" fill="white" opacity={isBlinking ? 0 : 0.9} />
          <circle cx="99" cy="64" r="1.2" fill="white" opacity={isBlinking ? 0 : 0.5} />
        </g>

        {/* ════════════════  CURIOUS EYEBROWS (password peek)  ════════════════ */}
        <motion.line
          x1="44" y1="47" x2="68" y2="47"
          stroke="#1a1a1a"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{
            y1: isPeek ? 43 : 47,
            y2: isPeek ? 46 : 47,
          }}
          transition={{ duration: 0.4 }}
          opacity={isPeek ? 1 : 0}
        />
        <motion.line
          x1="92" y1="47" x2="116" y2="47"
          stroke="#1a1a1a"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{
            y1: isPeek ? 46 : 47,
            y2: isPeek ? 43 : 47,
          }}
          transition={{ duration: 0.4 }}
          opacity={isPeek ? 1 : 0}
        />

        {/* ════════════════  NOSE  ════════════════ */}
        <motion.ellipse
          cx="80" cy="76" rx="6" ry="4.5"
          fill="#2d2d2d"
          animate={{ ry: isIdle ? [4.5, 4, 4.5] : 4.5 }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {/* Nose highlight */}
        <ellipse cx="78" cy="74.5" rx="2" ry="1.2" fill="#444" opacity="0.6" />

        {/* ════════════════  MOUTH  ════════════════ */}
        {isSuccess ? (
          /* Big happy smile */
          <motion.path
            d="M68 84 Q80 96 92 84"
            stroke="#2d2d2d"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
        ) : isError ? (
          /* Sad frown */
          <path
            d="M70 90 Q80 82 90 90"
            stroke="#2d2d2d"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        ) : isPeek ? (
          /* Small "o" of curiosity */
          <motion.ellipse
            cx="80" cy="86" rx="4" ry="3"
            fill="#444"
            initial={{ ry: 0 }}
            animate={{ ry: 3 }}
            transition={{ duration: 0.3 }}
          />
        ) : (
          /* Chewing mouth — animated */
          <motion.path
            d={chewMouths[chewPhase]}
            stroke="#2d2d2d"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            key={`chew-${chewPhase}`}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          />
        )}

        {/* Vertical line below nose to mouth */}
        <line x1="80" y1="79" x2="80" y2="82" stroke="#2d2d2d" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

        {/* ════════════════  CHEEK BLUSH  ════════════════ */}
        <ellipse cx="42" cy="78" rx="8" ry="5" fill="url(#blush)" />
        <ellipse cx="118" cy="78" rx="8" ry="5" fill="url(#blush)" />

        {/* ════════════════  BODY  ════════════════ */}
        <motion.ellipse
          cx="80" cy="120" rx="40" ry="30"
          fill="url(#pandaBody)"
          stroke="#d4d4d4"
          strokeWidth="0.5"
          animate={{
            ry: isIdle ? [30, 29, 30] : 30,
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Belly patch — lighter white */}
        <ellipse cx="80" cy="118" rx="25" ry="20" fill="#fafafa" />

        {/* ════════════════  ARMS / PAWS  ════════════════ */}
        {/* Left arm (dark) */}
        <motion.path
          d="M42 105 Q28 115 32 132 Q36 140 44 135 Q50 128 48 115 Z"
          fill="url(#pandaDark)"
          animate={{
            d: isPeek
              ? "M42 105 Q50 120 60 128 Q66 132 70 128 Q72 122 62 112 Z"
              : "M42 105 Q28 115 32 132 Q36 140 44 135 Q50 128 48 115 Z",
            rotate: isPeek ? 15 : 0,
          }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Right arm (dark) */}
        <motion.path
          d="M118 105 Q132 115 128 132 Q124 140 116 135 Q110 128 112 115 Z"
          fill="url(#pandaDark)"
          animate={{
            d: isPeek
              ? "M118 105 Q110 120 100 128 Q94 132 90 128 Q88 122 98 112 Z"
              : "M118 105 Q132 115 128 132 Q124 140 116 135 Q110 128 112 115 Z",
            rotate: isPeek ? -15 : 0,
          }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Paw pads (visible when peeking) */}
        <AnimatePresence>
          {isPeek && (
            <>
              <motion.ellipse
                cx="68" cy="127" rx="5" ry="4"
                fill="#e8d4c8"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              />
              <motion.ellipse
                cx="92" cy="127" rx="5" ry="4"
                fill="#e8d4c8"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
              />
              {/* Tiny toe beans */}
              <motion.circle cx="65" cy="124" r="1.5" fill="#d4b5a0" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.3 }} />
              <motion.circle cx="68" cy="123" r="1.5" fill="#d4b5a0" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.32 }} />
              <motion.circle cx="71" cy="124" r="1.5" fill="#d4b5a0" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.34 }} />
              <motion.circle cx="89" cy="124" r="1.5" fill="#d4b5a0" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.3 }} />
              <motion.circle cx="92" cy="123" r="1.5" fill="#d4b5a0" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.32 }} />
              <motion.circle cx="95" cy="124" r="1.5" fill="#d4b5a0" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }} transition={{ delay: 0.34 }} />
            </>
          )}
        </AnimatePresence>

        {/* ═══════════  BAMBOO STICK (visible when eating / idle)  ═══════════ */}
        <AnimatePresence>
          {isIdle && (
            <motion.g
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0, rotate: bambooRotation }}
              exit={{ opacity: 0, y: 10, x: -10 }}
              transition={{ duration: 0.5 }}
              style={{ originX: "28px", originY: "90px" }}
            >
              {/* Bamboo stalk */}
              <rect x="18" y="60" width="7" height="55" rx="3.5" fill="url(#bambooGrad)" />
              {/* Bamboo segments (nodes) */}
              <line x1="18" y1="72" x2="25" y2="72" stroke="#5B7A1A" strokeWidth="1.5" />
              <line x1="18" y1="85" x2="25" y2="85" stroke="#5B7A1A" strokeWidth="1.5" />
              <line x1="18" y1="98" x2="25" y2="98" stroke="#5B7A1A" strokeWidth="1.5" />
              {/* Top leaves */}
              <motion.path
                d="M21 60 Q12 50 8 42 Q14 46 21 57"
                fill="url(#leafGrad)"
                animate={{ rotate: [-2, 2, -2] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.path
                d="M24 58 Q32 48 36 40 Q30 46 24 55"
                fill="url(#leafGrad)"
                animate={{ rotate: [2, -2, 2] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
              {/* Small bottom leaf */}
              <path
                d="M18 105 Q10 100 6 92 Q12 98 18 103"
                fill="#4CAF50"
                opacity="0.7"
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Left paw holding bamboo (only when idle) */}
        <AnimatePresence>
          {isIdle && (
            <motion.g
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
            >
              {/* Small dark paw gripping the bamboo */}
              <ellipse cx="30" cy="88" rx="10" ry="8" fill="#2d2d2d" />
              {/* Paw pad */}
              <ellipse cx="30" cy="90" rx="5" ry="3.5" fill="#e8d4c8" opacity="0.6" />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ════════════════  FEET  ════════════════ */}
        <ellipse cx="60" cy="148" rx="14" ry="7" fill="url(#pandaDark)" />
        <ellipse cx="100" cy="148" rx="14" ry="7" fill="url(#pandaDark)" />
        {/* Foot pads */}
        <ellipse cx="60" cy="149" rx="7" ry="3.5" fill="#e8d4c8" opacity="0.4" />
        <ellipse cx="100" cy="149" rx="7" ry="3.5" fill="#e8d4c8" opacity="0.4" />
      </svg>

      {/* ═══  Success sparkles  ═══ */}
      {isSuccess && (
        <>
          <div className="absolute -top-2 left-1/2 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          <div className="absolute top-0 left-6 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: "100ms" }} />
          <div className="absolute top-0 right-6 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: "200ms" }} />
        </>
      )}

      {/* ═══  Curious question marks when peeking at password  ═══ */}
      <AnimatePresence>
        {isPeek && (
          <motion.div
            className="absolute -top-1 right-2 text-xl"
            initial={{ opacity: 0, y: 5, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.5 }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-fuchsia-400 font-bold drop-shadow-lg">?</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PandaMascot;
