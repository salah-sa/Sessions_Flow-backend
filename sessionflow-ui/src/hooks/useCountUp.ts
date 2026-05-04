import { useState, useEffect, useRef } from "react";

/**
 * Smoothly animates a number from its previous value to the target.
 * Uses requestAnimationFrame for silky 60fps transitions.
 */
export function useCountUp(
  target: number,
  duration: number = 600,
  options?: { decimals?: number; easing?: (t: number) => number }
): number {
  const decimals = options?.decimals ?? 2;
  const easing = options?.easing ?? easeOutExpo;

  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    prevRef.current = to;

    if (from === to) return;

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      const current = from + (to - from) * easedProgress;
      setDisplay(parseFloat(current.toFixed(decimals)));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, decimals, easing]);

  return display;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
