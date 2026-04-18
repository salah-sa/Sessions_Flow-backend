import React, { useEffect, useState, useRef } from "react";
import Magnetic from "./Magnetic";

import { cn } from "../../lib/utils";
import { X, AlertCircle, Inbox, Zap, Info, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";

// Global interaction refractions
const useCursorGlow = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);
  return mousePosition;
};

// Button
interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "glow";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-[var(--ui-accent)] text-white shadow-xl hover:opacity-90 shadow-[var(--ui-accent)]/20 active:scale-[0.98]",
      secondary: "bg-[var(--ui-bg)] text-slate-100 border border-white/5 hover:bg-white/[0.05] hover:border-white/10",
      outline: "bg-transparent border border-white/10 text-slate-300 hover:text-white hover:border-[var(--ui-accent)]/50 hover:bg-[var(--ui-accent)]/10",
      ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-white/5",
      danger: "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20",
      success: "bg-[var(--ui-accent)]/10 text-white border border-[var(--ui-accent)]/20 hover:bg-[var(--ui-accent)]/20",
      glow: "bg-[var(--ui-accent)] text-white shadow-glow shadow-[var(--ui-accent)]/40",
    };
    const sizes = {
      sm: "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest",
      md: "px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest",
      lg: "px-8 py-3.5 text-[12px] font-bold uppercase tracking-widest",
      icon: "p-2.5 rounded-xl",
    };

    const button = (
      <motion.button
        whileTap={{ scale: 0.98 }}
        ref={ref}
        className={cn(
          "inline-flex relative overflow-hidden items-center justify-center rounded-xl font-bold transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );

    if (variant === "primary" || variant === "glow") {
      return <Magnetic strength={0.3}>{button}</Magnetic>;
    }

    return button;
  }
);
Button.displayName = "Button";

export { Magnetic };

// Card
export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & Omit<HTMLMotionProps<"div">, "ref">) => (
  <motion.div
    transition={{ duration: 0.3, ease: "easeOut" }}
    className={cn(
      "group relative bg-[var(--ui-sidebar-bg)]/80 backdrop-blur-3xl border border-white/5 rounded-xl overflow-hidden shadow-2xl",
      className
    )}
    {...props}
  >
    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    {children}
  </motion.div>
);

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "auth";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div className="relative group/input">
        <input
          ref={ref}
          className={cn(
            "flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-5 py-2 text-white text-[12px] font-medium placeholder:text-slate-700 placeholder:uppercase placeholder:font-bold placeholder:tracking-widest focus:outline-none focus:border-[var(--ui-accent)]/50 focus:bg-black/60 transition-all",
            className
          )}
          {...props}
        />
        <div className="absolute bottom-0 inset-x-1/2 -translate-x-1/2 w-0 h-px bg-[var(--ui-accent)] group-focus-within/input:w-[90%] transition-all duration-500" />
      </div>
    );
  }
);
Input.displayName = "Input";

// Badge
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "outline" | "secondary" | "glow";
}

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => {
  const variants: Record<string, string> = {
      default: "bg-white/[0.02] text-slate-500 border border-white/5",
      primary: "bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border border-[var(--ui-accent)]/20 shadow-glow shadow-[var(--ui-accent)]/5",
      success: "bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border border-[var(--ui-accent)]/20",
      warning: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      danger: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      outline: "bg-transparent border border-white/10 text-slate-500",
      secondary: "bg-black/40 text-slate-400 border border-white/5",
      glow: "bg-[var(--ui-accent)]/20 text-[var(--ui-accent)] border border-[var(--ui-accent)]/40 shadow-glow shadow-[var(--ui-accent)]/10",
  };
  return (
    <span
      className={cn("px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] inline-flex items-center justify-center", variants[variant], className)}
      {...props}
    />
  );
};

// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  subtitle?: string;
}

export const Modal = ({ isOpen, onClose, title, subtitle, children, className }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" role="presentation">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
          />
          
          <motion.div 
            role="dialog" 
            aria-modal="true"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            className={cn("relative w-full max-w-xl bg-[var(--ui-sidebar-bg)]/95 backdrop-blur-3xl border border-white/10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden", className)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--ui-accent)]/40 to-transparent" />
            
            <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 id="modal-title" className="text-xl font-bold text-white uppercase tracking-widest">{title}</h2>
                {subtitle && <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">{subtitle}</p>}
              </div>
              <button 
                onClick={onClose}
                className="p-3 text-slate-500 hover:text-white bg-white/5 rounded-xl transition-all border border-white/5 hover:border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-10 py-10">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Tabs
export const TabsList = ({ children, className }: any) => (
  <div className={cn("flex bg-black/40 p-1.5 rounded-xl border border-white/5 w-fit", className)}>{children}</div>
);

export const TabsTrigger = ({ active, onClick, children, className }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 relative",
      active 
        ? "bg-[var(--ui-accent)] text-white shadow-glow shadow-[var(--ui-accent)]/20" 
        : "text-slate-500 hover:text-white"
    )}
  >
    {children}
  </button>
);

// Skeleton
export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-white/[0.02] border border-white/5 relative overflow-hidden", className)}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[var(--ui-accent)]/5 to-transparent animate-[shimmer_3s_infinite]" />
    </div>
  );
};

// Confirm Dialog
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  isLoading = false
}: ConfirmDialogProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-8">
        <p className="text-slate-400 text-[13px] font-medium leading-relaxed">{description}</p>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button 
            className="flex-1" 
            variant="secondary" 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button 
            className="flex-1" 
            variant={variant === "danger" ? "danger" : "glow"} 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Empty State
interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col items-center justify-center p-16 text-center", className)}
    >
      <div className="relative mb-10 group">
        <div className="absolute inset-0 bg-[var(--ui-accent)]/20 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="relative w-24 h-24 bg-[var(--ui-bg)] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 hover:border-[var(--ui-accent)]/50 hover:-translate-y-2">
          <Icon className="w-10 h-10 text-slate-600 group-hover:text-[var(--ui-accent)] transition-colors" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-black/80 border border-white/10 flex items-center justify-center">
           <Zap className="w-4 h-4 text-[var(--ui-accent)]" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-4">
        {title}
      </h3>
      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em] max-w-sm mb-10 leading-loose">
        {description}
      </p>
      {action && <div className="animate-fade-in [animation-delay:500ms]">{action}</div>}
    </motion.div>
  );
};

// Error State
interface ErrorStateProps {
  title?: string;
  error: Error | string | unknown;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState = ({ title = "Neural Link Error", error, onRetry, className }: ErrorStateProps) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center p-16 text-center", className)}
    >
      <div className="relative w-24 h-24 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-center justify-center mb-10 shadow-2xl">
        <ShieldAlert className="w-10 h-10 text-rose-500" />
        <div className="absolute inset-0 bg-rose-500/10 blur-2xl rounded-full" />
      </div>
      <h3 className="text-2xl font-bold text-rose-500 uppercase tracking-widest mb-4">
        {title}
      </h3>
      <div className="relative overflow-hidden mb-10 px-8 py-6 bg-rose-500/[0.02] border border-rose-500/10 rounded-xl max-w-md">
        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest leading-relaxed">
          {errorMessage}
        </p>
      </div>
      {onRetry && (
        <Button variant="danger" size="lg" onClick={onRetry} className="rounded-xl">
          RE-INITIALIZE LINK
        </Button>
      )}
    </motion.div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    className={cn("w-5 h-5 border-2 border-[var(--ui-accent)]/20 border-t-[var(--ui-accent)] rounded-[2px]", className)}
  />
);
