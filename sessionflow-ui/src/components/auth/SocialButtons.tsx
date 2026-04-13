import React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface SocialButtonsProps {
  layout?: "row" | "column";
  mode?: "icon-only" | "full";
  theme?: "dark" | "light";
  onGoogleClick?: () => void;
  onFacebookClick?: () => void;
}

export const SocialButtons: React.FC<SocialButtonsProps> = ({ 
  layout = "row", 
  mode = "full",
  theme = "dark",
  onGoogleClick,
  onFacebookClick,
}) => {
  const isDark = theme === "dark";
  
  const containerClass = layout === "row" 
    ? "flex gap-3 justify-center w-full" 
    : "flex flex-col gap-3 w-full";

  const btnClass = mode === "icon-only"
    ? `w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer ${
        isDark 
          ? 'bg-slate-950/60 border border-white/[0.06] hover:bg-white/[0.06] hover:border-emerald-500/20 hover:shadow-[0_0_12px_rgba(16,185,129,0.1)]' 
          : 'bg-white border border-slate-200 hover:bg-slate-50 hover:shadow-slate-200'
      }`
    : `w-full h-11 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-md font-bold text-[10px] uppercase tracking-widest cursor-pointer ${
        isDark 
          ? 'bg-slate-950/60 border border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:text-white hover:border-emerald-500/20 hover:shadow-[0_0_12px_rgba(16,185,129,0.1)]' 
          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-slate-200'
      }`;

  const handleGoogleClick = () => {
    if (onGoogleClick) {
      onGoogleClick();
    } else {
      toast("Google Sign-In", {
        description: "Coming soon — social auth integration is in progress.",
        icon: "🔒",
      });
    }
  };

  const handleFacebookClick = () => {
    if (onFacebookClick) {
      onFacebookClick();
    } else {
      toast("Facebook Sign-In", {
        description: "Coming soon — social auth integration is in progress.",
        icon: "🔒",
      });
    }
  };

  return (
    <div className={containerClass}>
      <motion.button
        type="button"
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        className={btnClass}
        onClick={handleGoogleClick}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
          </g>
        </svg>
        {mode === "full" && <span>Google</span>}
      </motion.button>

      <motion.button
        type="button"
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        className={btnClass}
        onClick={handleFacebookClick}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        {mode === "full" && <span>Facebook</span>}
      </motion.button>
    </div>
  );
};
