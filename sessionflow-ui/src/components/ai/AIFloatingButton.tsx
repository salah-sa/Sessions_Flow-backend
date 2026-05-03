import React, { useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X } from 'lucide-react';
import { useAIAgentStore } from '../../store/stores';
import { cn } from '../../lib/utils';

export const AIFloatingButton: React.FC = () => {
  const isOpen = useAIAgentStore((s) => s.isOpen);
  const isThinking = useAIAgentStore((s) => s.isThinking);
  const fabPosition = useAIAgentStore((s) => s.fabPosition);
  const togglePanel = useAIAgentStore((s) => s.togglePanel);
  const setFabPosition = useAIAgentStore((s) => s.setFabPosition);

  // Drag state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(fabPosition);
  const moveDistanceRef = useRef(0);

  // Compute display position — default: bottom-24 right-6
  const btnSize = 56;
  const defaultX = window.innerWidth - btnSize - 24;
  const defaultY = window.innerHeight - btnSize - 96;
  const displayPos = currentPos ?? { x: defaultX, y: defaultY };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = false;
    moveDistanceRef.current = 0;
    dragStartRef.current = { x: e.clientX - displayPos.x, y: e.clientY - displayPos.y };
    positionRef.current = displayPos;
  }, [displayPos]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pressure === 0) return;
    const newX = Math.max(0, Math.min(window.innerWidth - btnSize, e.clientX - dragStartRef.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - btnSize, e.clientY - dragStartRef.current.y));
    const dx = newX - positionRef.current.x;
    const dy = newY - positionRef.current.y;
    moveDistanceRef.current += Math.sqrt(dx * dx + dy * dy);
    if (moveDistanceRef.current > 5) isDraggingRef.current = true;
    positionRef.current = { x: newX, y: newY };
    setCurrentPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback(() => {
    if (isDraggingRef.current) {
      setFabPosition(positionRef.current);
    }
  }, [setFabPosition]);

  const onClick = useCallback(() => {
    if (!isDraggingRef.current) {
      togglePanel();
    }
    isDraggingRef.current = false;
  }, [togglePanel]);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.5 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      style={{
        position: 'fixed',
        left: displayPos.x,
        top: displayPos.y,
        touchAction: 'none',
        cursor: isDraggingRef.current ? 'grabbing' : 'pointer',
      }}
      className={cn(
        'z-[9999] w-14 h-14 rounded-2xl flex items-center justify-center',
        'border select-none',
        'transition-all duration-300',
        isOpen
          ? 'bg-gradient-to-br from-violet-600 to-indigo-700 border-violet-400/30 shadow-[0_0_36px_rgba(139,92,246,0.7),0_8px_32px_rgba(0,0,0,0.4)]'
          : 'bg-gradient-to-br from-violet-500 to-indigo-600 border-white/15 shadow-[0_0_24px_rgba(139,92,246,0.45),0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_0_36px_rgba(139,92,246,0.7),0_8px_32px_rgba(0,0,0,0.4)]'
      )}
      aria-label="Toggle AI Assistant"
      id="ai-agent-fab"
    >
      {/* Thinking pulse rings */}
      <AnimatePresence>
        {isThinking && (
          <>
            <motion.span
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-2xl bg-violet-400/30"
            />
            <motion.span
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
              className="absolute inset-0 rounded-2xl bg-violet-400/20"
            />
          </>
        )}
      </AnimatePresence>

      {/* Icon swap */}
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X className="w-6 h-6 text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="bot"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Bot className="w-6 h-6 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
