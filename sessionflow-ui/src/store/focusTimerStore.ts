import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FocusMode = "focus" | "break" | "idle";

interface FocusTimerState {
  isActive: boolean;
  mode: FocusMode;
  remaining: number; // seconds
  focusDuration: number; // minutes
  breakDuration: number; // minutes
  sessionsCompleted: number;
  totalFocusMinutes: number;

  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  switchToBreak: () => void;
  switchToFocus: () => void;
  setFocusDuration: (m: number) => void;
  setBreakDuration: (m: number) => void;
  completeSession: () => void;
}

export const useFocusTimerStore = create<FocusTimerState>()(
  persist(
    (set, get) => ({
      isActive: false,
      mode: "idle" as FocusMode,
      remaining: 25 * 60,
      focusDuration: 25,
      breakDuration: 5,
      sessionsCompleted: 0,
      totalFocusMinutes: 0,

      start: () => {
        const s = get();
        if (s.mode === "idle") {
          set({ isActive: true, mode: "focus", remaining: s.focusDuration * 60 });
        } else {
          set({ isActive: true });
        }
      },

      pause: () => set({ isActive: false }),

      reset: () => set({
        isActive: false,
        mode: "idle",
        remaining: get().focusDuration * 60,
      }),

      tick: () => {
        const s = get();
        if (!s.isActive || s.remaining <= 0) return;
        const next = s.remaining - 1;
        if (next <= 0) {
          if (s.mode === "focus") {
            // Focus complete → switch to break
            set({
              isActive: false,
              mode: "break",
              remaining: s.breakDuration * 60,
              sessionsCompleted: s.sessionsCompleted + 1,
              totalFocusMinutes: s.totalFocusMinutes + s.focusDuration,
            });
          } else {
            // Break complete → back to idle
            set({ isActive: false, mode: "idle", remaining: s.focusDuration * 60 });
          }
        } else {
          set({ remaining: next });
        }
      },

      switchToBreak: () => set({ mode: "break", remaining: get().breakDuration * 60, isActive: true }),
      switchToFocus: () => set({ mode: "focus", remaining: get().focusDuration * 60, isActive: true }),
      setFocusDuration: (m) => set({ focusDuration: m, remaining: m * 60 }),
      setBreakDuration: (m) => set({ breakDuration: m }),
      completeSession: () => set(s => ({
        sessionsCompleted: s.sessionsCompleted + 1,
        totalFocusMinutes: s.totalFocusMinutes + s.focusDuration,
      })),
    }),
    { name: "sessionflow-focus-timer" }
  )
);
