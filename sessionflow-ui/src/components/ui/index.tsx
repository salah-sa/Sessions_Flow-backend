import React from "react";
import { cn } from "../../lib/utils";
import { X, Shield, Activity, Target, AlertCircle, Inbox } from "lucide-react";

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-brand-500 text-white hover:bg-brand-400 shadow-glow shadow-brand-500/20 active:scale-95 border border-brand-400/20",
      secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 active:scale-95 border border-white/5",
      outline: "bg-transparent border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 active:scale-95",
      ghost: "bg-transparent text-slate-500 hover:text-white hover:bg-white/5 active:scale-95",
      danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white shadow-glow shadow-red-500/10 active:scale-95",
      success: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white shadow-glow shadow-emerald-500/10 active:scale-95",
    };
    const sizes = {
      sm: "px-4 py-1.5 text-[9px]",
      md: "px-6 py-2.5 text-[10px]",
      lg: "px-8 py-3.5 text-[12px]",
      icon: "p-2.5 rounded-xl",
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:pointer-events-none font-sora",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

// Card
export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl", className)}
    {...props}
  >
    {children}
  </div>
);

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "auth";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "text-[11px] font-black uppercase tracking-widest",
      auth: "text-sm font-medium tracking-normal normal-case",
    };
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-xl border border-white/5 bg-slate-950/60 px-5 py-3 text-white placeholder:text-slate-600 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 transition-all shadow-inner",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

// Badge
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "outline" | "secondary" | "glow";
}

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => {
  const variants: Record<string, string> = {
    default: "bg-slate-900 text-slate-500 border-white/5",
    primary: "bg-brand-500/10 text-brand-500 border-brand-500/20",
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    danger: "bg-red-500/10 text-red-500 border-red-500/20",
    outline: "bg-transparent border-white/10 text-slate-400",
    secondary: "bg-slate-800 text-slate-400 border-white/5",
    glow: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
  };
  return (
    <span
      className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] border inline-flex items-center justify-center", variants[variant], className)}
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className={cn("w-full max-w-xl bg-slate-950 border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_-20px_rgba(59,130,246,0.15)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="space-y-1">
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-brand-500 rounded-full" />
                <h2 className="text-xl font-sora font-black text-white tracking-widest uppercase">{title}</h2>
             </div>
             {subtitle && <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ps-4">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-10 py-10 font-sora">
          {children}
        </div>
      </div>
    </div>
  );
};

// Tabs (Simple implementation)
export const TabsList = ({ children, className }: any) => (
  <div className={cn("flex bg-slate-950 border border-white/5 p-1 rounded-2xl w-fit", className)}>{children}</div>
);

export const TabsTrigger = ({ active, onClick, children, className }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
      active ? "bg-brand-500 text-white shadow-glow shadow-brand-500/20" : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
      className
    )}
  >
    {children}
  </button>
);

// Skeleton
export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-white/[0.03] border border-white/5", className)}
      {...props}
    />
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
      <div className="space-y-6">
        <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            className="flex-1" 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button 
            className="flex-1" 
            variant={variant === "danger" ? "danger" : "primary"} 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : confirmLabel}
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
    <div className={cn("flex flex-col items-center justify-center p-12 text-center animate-fade-in", className)}>
      <div className="w-20 h-20 bg-slate-900/50 border border-white/5 rounded-[2rem] flex items-center justify-center mb-6 shadow-glow shadow-slate-900/50">
        <Icon className="w-8 h-8 text-slate-500" />
      </div>
      <h3 className="text-xl font-sora font-black text-white tracking-widest uppercase mb-2">
        {title}
      </h3>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] max-w-md mb-8">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

// Error State
interface ErrorStateProps {
  title?: string;
  error: Error | string | unknown;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState = ({ title = "System Error", error, onRetry, className }: ErrorStateProps) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center animate-fade-in", className)}>
      <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center justify-center mb-6 shadow-glow shadow-red-500/20">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-xl font-sora font-black text-red-500 tracking-widest uppercase mb-2">
        {title}
      </h3>
      <p className="text-[10px] text-red-400/80 font-bold uppercase tracking-[0.2em] max-w-md mb-8 p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
        {errorMessage}
      </p>
      {onRetry && (
        <Button variant="danger" onClick={onRetry}>
          Re-Initialize
        </Button>
      )}
    </div>
  );
};
