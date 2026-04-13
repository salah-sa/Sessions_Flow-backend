import React, { useState, useEffect, useCallback, useRef } from "react";

type MascotState = "idle" | "watching" | "password" | "success" | "error";

interface LoginMascotProps {
  state: MascotState;
  /** How far the password field is filled (0-1) for hand-over-eyes spread */
  passwordStrength?: number;
}

/**
 * Interactive SVG mascot for auth pages.
 * - Eyes follow the cursor across the page
 * - "watching" state: leans forward curiously when hovering/focusing fields
 * - "password" state: covers eyes with hands (peeking animation)
 * - "success" state: happy celebration
 * - "error" state: shakes head sadly
 */
const LoginMascot: React.FC<LoginMascotProps> = ({ state, passwordStrength = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const animFrameRef = useRef<number>(0);
  const targetRef = useRef({ x: 0, y: 0 });

  // Smooth eye tracking
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxMove = 6;
    const factor = Math.min(dist / 300, 1);

    targetRef.current = {
      x: (dx / (dist || 1)) * maxMove * factor,
      y: (dy / (dist || 1)) * maxMove * factor,
    };
  }, []);

  // Animation loop for smooth eye movement
  useEffect(() => {
    let active = true;
    const animate = () => {
      if (!active) return;
      setEyeOffset((prev) => ({
        x: prev.x + (targetRef.current.x - prev.x) * 0.12,
        y: prev.y + (targetRef.current.y - prev.y) * 0.12,
      }));
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { active = false; cancelAnimationFrame(animFrameRef.current); };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // Random blinking
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    };
    const interval = setInterval(blink, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const isPasswordMode = state === "password";
  const isWatching = state === "watching";
  const isSuccess = state === "success";
  const isError = state === "error";

  // How far hands cover eyes (0 = not at all, 1 = fully covered)
  const handCover = isPasswordMode ? 1 : 0;

  // Eye squint for watching mode (curious)
  const eyeSquint = isWatching ? 0.85 : 1;

  return (
    <div
      ref={containerRef}
      className={`relative w-[120px] h-[120px] mx-auto select-none transition-transform duration-500 ${
        isWatching ? "scale-110 translate-y-1" : ""
      } ${isSuccess ? "animate-bounce" : ""} ${isError ? "animate-shake" : ""}`}
      style={{ filter: "drop-shadow(0 8px 24px rgba(8, 217, 214, 0.15))" }}
    >
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* === BODY === */}
        {/* Main body (rounded robot/owl shape) */}
        <ellipse
          cx="60"
          cy="68"
          rx="42"
          ry="38"
          className="transition-all duration-300"
          fill="url(#bodyGrad)"
          stroke="rgba(8,217,214,0.3)"
          strokeWidth="1.5"
        />

        {/* Inner glow */}
        <ellipse cx="60" cy="65" rx="34" ry="30" fill="url(#innerGlow)" opacity="0.4" />

        {/* === EARS === */}
        <path d="M22 42 L30 28 L38 42" fill="url(#bodyGrad)" stroke="rgba(8,217,214,0.4)" strokeWidth="1"/>
        <path d="M82 42 L90 28 L98 42" fill="url(#bodyGrad)" stroke="rgba(8,217,214,0.4)" strokeWidth="1"/>
        {/* Ear inner glow */}
        <path d="M26 40 L30 32 L34 40" fill="rgba(8,217,214,0.15)"/>
        <path d="M86 40 L90 32 L94 40" fill="rgba(8,217,214,0.15)"/>

        {/* === EYE SOCKETS === */}
        <ellipse cx="42" cy="62" rx="14" ry="13" fill="#0a0f1a" stroke="rgba(8,217,214,0.2)" strokeWidth="1"/>
        <ellipse cx="78" cy="62" rx="14" ry="13" fill="#0a0f1a" stroke="rgba(8,217,214,0.2)" strokeWidth="1"/>

        {/* === EYES (with tracking) === */}
        <g
          className="transition-all duration-100"
          style={{
            transform: `translate(${isPasswordMode ? 0 : eyeOffset.x}px, ${isPasswordMode ? 0 : eyeOffset.y}px)`,
          }}
        >
          {/* Eye whites / iris  */}
          <ellipse
            cx="42"
            cy="62"
            rx="8"
            ry={isBlinking ? 1 : 8 * eyeSquint}
            fill="#08d9d6"
            className="transition-all duration-100"
            opacity={isPasswordMode ? 0.3 : 1}
          />
          <ellipse
            cx="78"
            cy="62"
            rx="8"
            ry={isBlinking ? 1 : 8 * eyeSquint}
            fill="#08d9d6"
            className="transition-all duration-100"
            opacity={isPasswordMode ? 0.3 : 1}
          />

          {/* Pupils */}
          <ellipse
            cx="42"
            cy="62"
            rx="4"
            ry={isBlinking ? 0.5 : 4 * eyeSquint}
            fill="#020617"
            className="transition-all duration-100"
            opacity={isPasswordMode ? 0 : 1}
          />
          <ellipse
            cx="78"
            cy="62"
            rx="4"
            ry={isBlinking ? 0.5 : 4 * eyeSquint}
            fill="#020617"
            className="transition-all duration-100"
            opacity={isPasswordMode ? 0 : 1}
          />

          {/* Eye highlights */}
          <circle
            cx="45"
            cy="59"
            r="2"
            fill="white"
            opacity={isBlinking || isPasswordMode ? 0 : 0.8}
            className="transition-opacity duration-100"
          />
          <circle
            cx="81"
            cy="59"
            r="2"
            fill="white"
            opacity={isBlinking || isPasswordMode ? 0 : 0.8}
            className="transition-opacity duration-100"
          />
        </g>

        {/* === EYEBROWS (express emotion) === */}
        {/* Left eyebrow */}
        <line
          x1={isWatching ? "32" : "30"}
          y1={isWatching ? "46" : isError ? "50" : "48"}
          x2={isWatching ? "52" : "54"}
          y2={isWatching ? "44" : isError ? "46" : "48"}
          stroke="#08d9d6"
          strokeWidth="2"
          strokeLinecap="round"
          className="transition-all duration-300"
          opacity="0.6"
        />
        {/* Right eyebrow */}
        <line
          x1={isWatching ? "68" : "66"}
          y1={isWatching ? "44" : isError ? "46" : "48"}
          x2={isWatching ? "88" : "90"}
          y2={isWatching ? "46" : isError ? "50" : "48"}
          stroke="#08d9d6"
          strokeWidth="2"
          strokeLinecap="round"
          className="transition-all duration-300"
          opacity="0.6"
        />

        {/* === NOSE === */}
        <ellipse cx="60" cy="72" rx="3" ry="2" fill="rgba(8,217,214,0.3)" />

        {/* === MOUTH === */}
        {isSuccess ? (
          /* Happy mouth - big smile */
          <path
            d="M48 80 Q60 92 72 80"
            stroke="#08d9d6"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-300"
          />
        ) : isError ? (
          /* Sad mouth */
          <path
            d="M48 86 Q60 78 72 86"
            stroke="#ff6b6b"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-300"
          />
        ) : isPasswordMode ? (
          /* Nervous/closed mouth */
          <line
            x1="50"
            y1="82"
            x2="70"
            y2="82"
            stroke="rgba(8,217,214,0.4)"
            strokeWidth="2"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        ) : (
          /* Gentle smile */
          <path
            d="M50 80 Q60 86 70 80"
            stroke="rgba(8,217,214,0.5)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-300"
          />
        )}

        {/* === HANDS (for covering eyes during password) === */}
        {/* Left hand */}
        <g
          className="transition-all duration-500 ease-out"
          style={{
            transform: `translate(${handCover ? -2 : -40}px, ${handCover ? 0 : 30}px)`,
            opacity: handCover ? 1 : 0,
          }}
        >
          <ellipse cx="38" cy="62" rx="16" ry="14" fill="url(#handGrad)" />
          {/* Finger lines */}
          <line x1="28" y1="58" x2="28" y2="66" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5"/>
          <line x1="33" y1="56" x2="33" y2="68" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5"/>
          <line x1="38" y1="55" x2="38" y2="69" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5"/>
          <line x1="43" y1="56" x2="43" y2="68" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5"/>
        </g>

        {/* Right hand */}
        <g
          className="transition-all duration-500 ease-out"
          style={{
            transform: `translate(${handCover ? 2 : 40}px, ${handCover ? 0 : 30}px)`,
            opacity: handCover ? 1 : 0,
          }}
        >
          <ellipse cx="82" cy="62" rx="16" ry="14" fill="url(#handGrad)" />
          <line x1="76" y1="56" x2="76" y2="68" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5"/>
          <line x1="81" y1="55" x2="81" y2="69" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5"/>
          <line x1="86" y1="56" x2="86" y2="68" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5"/>
          <line x1="91" y1="58" x2="91" y2="66" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5"/>
        </g>

        {/* === BELLY GLOW INDICATOR === */}
        <ellipse
          cx="60"
          cy="88"
          rx="8"
          ry="5"
          className="transition-all duration-700"
          fill={isSuccess ? "#08d9d6" : isError ? "#ff6b6b" : "rgba(8,217,214,0.15)"}
          opacity={isSuccess || isError ? 0.6 : 0.3}
        />

        {/* ==== PASSWORD STRENGTH METER (little dots on belly) ==== */}
        {isPasswordMode && (
          <g>
            {[0, 1, 2, 3].map((i) => (
              <circle
                key={i}
                cx={48 + i * 8}
                cy="94"
                r="2.5"
                fill={passwordStrength > i * 0.25 ? "#08d9d6" : "rgba(255,255,255,0.1)"}
                className="transition-all duration-300"
              />
            ))}
          </g>
        )}

        {/* === GRADIENTS === */}
        <defs>
          <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1a2744" />
            <stop offset="100%" stopColor="#0e1629" />
          </radialGradient>
          <radialGradient id="innerGlow" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#08d9d6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="handGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1e3050" />
            <stop offset="100%" stopColor="#152238" />
          </radialGradient>
        </defs>
      </svg>

      {/* Floating particles around mascot when watching */}
      {isWatching && (
        <>
          <div className="absolute top-2 right-0 w-1.5 h-1.5 bg-brand-500/40 rounded-full animate-float-slow" />
          <div className="absolute top-6 left-0 w-1 h-1 bg-brand-500/30 rounded-full animate-float-medium" />
          <div className="absolute bottom-4 right-4 w-1 h-1 bg-brand-500/50 rounded-full animate-float-fast" />
        </>
      )}

      {/* Success sparkles */}
      {isSuccess && (
        <>
          <div className="absolute -top-2 left-1/2 w-2 h-2 bg-brand-500 rounded-full animate-ping" />
          <div className="absolute top-0 left-4 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping delay-100" />
          <div className="absolute top-0 right-4 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping delay-200" />
        </>
      )}
    </div>
  );
};

export default LoginMascot;
