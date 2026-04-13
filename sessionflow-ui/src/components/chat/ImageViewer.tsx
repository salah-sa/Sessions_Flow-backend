import React, { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ZoomOut, Maximize, Download } from "lucide-react";
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

  if (!isOpen) return null;

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
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Top Toolbar */}
      <div 
        className="absolute top-4 right-4 rtl:left-4 rtl:right-auto flex items-center gap-3 z-[110]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 bg-slate-900 border border-white/10 p-1.5 rounded-2xl shadow-2xl">
          <button onClick={handleZoomOut} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-[10px] font-mono font-bold text-slate-300 w-12 text-center select-none">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={handleZoomIn} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={handleReset} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <Maximize className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <a href={src} download target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-xl transition-colors">
            <Download className="w-5 h-5" />
          </a>
        </div>
        
        <button 
          onClick={onClose}
          className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-2xl transition-all shadow-lg"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Image Area */}
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
      >
        <img
          src={src}
          alt={alt || "Image Viewer"}
          className={cn(
            "max-w-[90vw] max-h-[90vh] object-contain transition-transform duration-200 select-none shadow-2xl",
            scale > 1 ? "cursor-grab" : "cursor-default",
            isDragging && "cursor-grabbing duration-0"
          )}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
          draggable={false}
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  );
};
