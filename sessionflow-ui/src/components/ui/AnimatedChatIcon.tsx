import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

interface AnimatedChatIconProps {
  size?: number;
  state?: "idle" | "ping" | "active";
  className?: string;
}

const AnimatedChatIcon: React.FC<AnimatedChatIconProps> = ({ 
  size = 24, 
  state = "idle", 
  className 
}) => {
  const shouldReduceMotion = useReducedMotion();

  const variants = {
    idle: {
      scale: [1, 1.05, 1],
      y: [0, -2, 0],
      rotate: [0, -2, 2, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    ping: {
      scale: [1, 1.15, 1],
      y: [0, -5, 0],
      rotate: [0, -8, 8, 0],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        repeatType: "mirror" as const,
        ease: "easeInOut",
      },
    },
    active: {
      scale: 1.15,
      y: -2,
      filter: "drop-shadow(0 0 12px rgba(16, 185, 129, 0.6))",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10,
      },
    },
  };

  // If motion should be reduced, we disable the repeating animations
  const animateState = shouldReduceMotion ? (state === "active" ? "active" : undefined) : state;

  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        variants={variants}
        animate={animateState}
        style={{ width: size, height: size }}
        className={cn(
          "transition-colors duration-300",
          state === "active" ? "text-emerald-500" : "text-current"
        )}
      >
        <path
          d="M21 11.5C21 15.6421 17.6421 19 13.5 19C12.3387 19 11.246 18.7354 10.2713 18.2625L10 18.25L6 20L7.45 16.1C6.5411 14.8687 6 13.346 6 11.5C6 7.35786 9.35786 4 13.5 4C17.6421 4 21 7.35786 21 11.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 12H10.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.5 12H13.51"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 12H17.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
      
      {state === "ping" && !shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-var(--ui-accent) opacity-0"
          animate={{
            scale: [1, 1.8],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      )}
    </div>
  );
};

export default AnimatedChatIcon;

