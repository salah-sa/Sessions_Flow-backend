import React, { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ZoomOut, Maximize, Download, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface ImageViewerProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, isOpen, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartInfo = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      document.body.style.overflow = "auto";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartInfo.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    const dx = e.clientX - dragStartInfo.current.x;
    const dy = e.clientY - dragStartInfo.current.y;
    setPosition({
      x: dragStartInfo.current.posX + dx,
      y: dragStartInfo.current.posY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.2, 4));
    } else {
      setScale((prev) => Math.max(prev - 0.2, 0.5));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={onClose}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Floating Toolbar */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[110]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 bg-[#0c0e12]/80 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl">
              <button onClick={handleZoomOut} className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                <ZoomOut className="w-5 h-5" />
              </button>
              
              <div className="px-3 min-w-[4rem] text-center">
                <span className="text-[11px] font-bold text-white tabular-nums">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              <button onClick={handleZoomIn} className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                <ZoomIn className="w-5 h-5" />
              </button>

              <div className="w-px h-6 bg-white/5 mx-1" />

              <button onClick={handleReset} title="Reset View" className="p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                <Maximize className="w-5 h-5" />
              </button>

              <a 
                href={src} 
                download 
                target="_blank" 
                rel="noreferrer" 
                className="p-3 bg-[var(--chat-accent-warm)]/10 text-[var(--chat-accent-warm)] hover:bg-[var(--chat-accent-warm)] hover:text-white rounded-2xl transition-all shadow-lg shadow-[var(--chat-accent-warm)]/20"
                title="Download Image"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
            
            <button 
              onClick={onClose}
              className="p-4 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-[1.5rem] transition-all shadow-xl"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>

          {/* Image Area */}
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onMouseDown={handleMouseDown}
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: scale, opacity: 1 }}
              src={src}
              alt={alt || "Image Preview"}
              className={cn(
                "max-w-[90vw] max-h-[90vh] object-contain select-none shadow-2xl rounded-lg",
                scale > 1 ? "cursor-grab" : "cursor-default",
                isDragging && "cursor-grabbing"
              )}
              style={{
                x: position.x,
                y: position.y,
              }}
              draggable={false}
              onClick={e => e.stopPropagation()}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

