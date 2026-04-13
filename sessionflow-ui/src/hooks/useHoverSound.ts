import { useCallback, useRef } from 'react';
import { sounds } from '../lib/sounds';

/**
 * Hook to provide a throttled hover sound handler.
 * Throttled to 50ms to prevent "buzzing" when moving mouse rapidly over elements.
 */
export const useHoverSound = () => {
  const lastPlayTime = useRef(0);

  const playHover = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTime.current > 50) {
      sounds.playHover();
      lastPlayTime.current = now;
    }
  }, []);

  return playHover;
};
