import React from 'react';

/**
 * F8: Unified skeleton loading components for consistent loading states across the app.
 * All components use CSS animations and match the dark theme aesthetic.
 */

const pulseClass = 'animate-pulse bg-white/[0.06] rounded';

/** Single-line text skeleton */
export function SkeletonLine({ width = '100%', height = '14px', className = '' }: {
  width?: string; height?: string; className?: string;
}) {
  return (
    <div
      className={`${pulseClass} ${className}`}
      style={{ width, height, borderRadius: '6px' }}
    />
  );
}

/** Rectangle skeleton — for cards, panels, charts */
export function SkeletonRect({ width = '100%', height = '120px', className = '' }: {
  width?: string; height?: string; className?: string;
}) {
  return (
    <div
      className={`${pulseClass} ${className}`}
      style={{ width, height, borderRadius: '12px' }}
    />
  );
}

/** Circular avatar skeleton */
export function SkeletonAvatar({ size = 40, className = '' }: {
  size?: number; className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-white/[0.06] rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Full card skeleton with avatar + lines (for lists) */
export function SkeletonCard({ lines = 3, className = '' }: {
  lines?: number; className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] ${className}`}>
      <SkeletonAvatar size={36} />
      <div className="flex-1 space-y-2">
        <SkeletonLine width="60%" height="12px" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <SkeletonLine key={i} width={`${80 - i * 15}%`} height="10px" />
        ))}
      </div>
    </div>
  );
}

/** Table row skeleton */
export function SkeletonTableRow({ columns = 4, className = '' }: {
  columns?: number; className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 p-3 ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonLine key={i} width={i === 0 ? '30%' : '20%'} height="12px" />
      ))}
    </div>
  );
}

/** Page-level skeleton that shows a branded loading state */
export function SkeletonPage({ title = 'Loading...', rows = 5 }: {
  title?: string; rows?: number;
}) {
  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <SkeletonRect width="32px" height="32px" />
        <SkeletonLine width="200px" height="20px" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </div>
  );
}
