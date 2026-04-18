import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Drawer = ({ open, onOpenChange, children }: DrawerProps) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          {/* Drawer Surface */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative h-full w-full max-w-2xl bg-[var(--ui-sidebar-bg)]/95 backdrop-blur-3xl border-l border-white/5 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Ambient Lighting Background */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--ui-accent)]/5 blur-[100px] rounded-full pointer-events-none -z-10" />
            
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface DrawerContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DrawerContent = ({ children, className }: DrawerContentProps) => {
  return (
    <div className={cn("flex-1 h-full overflow-y-auto custom-scrollbar relative z-10", className)}>
      {children}
    </div>
  );
};
