/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Adaptive Intelligence Store
 * Phase 105: Predictive Failure Prevention
 * ═══════════════════════════════════════════════════════════
 */

import { create } from "zustand";
import { logger } from "../lib/logger";
import * as Sentry from "@sentry/react-native";

export type AnomalyType = "LATENCY_SPIKE" | "ERROR_SPIKE" | "STABLE";

interface MetricEntry {
  value: number;
  time: number;
}

interface AdaptiveState {
  // Metrics
  apiLatency: MetricEntry[];
  errorRate: MetricEntry[]; // 1 for error, 0 for success
  
  // System Mode
  mode: "NORMAL" | "SLOW" | "SAFE";
  lastAnomaly: AnomalyType;
  
  // Config
  disableHeavyFeatures: boolean;
  requestDelay: number;
  maxRetries: number;
  useCacheFirst: boolean;

  // Actions
  recordMetric: (type: "apiLatency" | "errorRate", value: number) => void;
  analyze: () => void;
  resetToNormal: () => void;
}

const METRIC_LIMIT = 50;

export const useAdaptiveStore = create<AdaptiveState>((set, get) => ({
  apiLatency: [],
  errorRate: [],
  mode: "NORMAL",
  lastAnomaly: "STABLE",
  disableHeavyFeatures: false,
  requestDelay: 0,
  maxRetries: 3,
  useCacheFirst: false,

  recordMetric: (type, value) => {
    set((state) => {
      const next = [...state[type], { value, time: Date.now() }];
      if (next.length > METRIC_LIMIT) next.shift();
      return { [type]: next };
    });
  },

  analyze: () => {
    const { apiLatency, errorRate, mode } = get();
    
    if (apiLatency.length < 5) return; // Need minimum baseline

    const avgLatency = apiLatency.reduce((a, b) => a + b.value, 0) / apiLatency.length;
    const errorCount = errorRate.filter(e => e.value === 1).length;
    
    let nextAnomaly: AnomalyType = "STABLE";
    
    if (errorCount > 5) {
      nextAnomaly = "ERROR_SPIKE";
    } else if (avgLatency > 2000) {
      nextAnomaly = "LATENCY_SPIKE";
    }

    if (nextAnomaly === get().lastAnomaly) return;

    if (nextAnomaly === "ERROR_SPIKE") {
      logger.warn("PREDICTIVE_ALERT: ERROR_SPIKE", { errorCount, avgLatency });
      Sentry.captureMessage("PREDICTIVE_ALERT: ERROR_SPIKE", { level: "warning" });
      set({ 
        mode: "SAFE", 
        lastAnomaly: "ERROR_SPIKE",
        disableHeavyFeatures: true,
        useCacheFirst: true,
        maxRetries: 1
      });
    } else if (nextAnomaly === "LATENCY_SPIKE") {
      logger.warn("PREDICTIVE_ALERT: LATENCY_SPIKE", { avgLatency });
      Sentry.captureMessage("PREDICTIVE_ALERT: LATENCY_SPIKE", { level: "warning" });
      set({ 
        mode: "SLOW", 
        lastAnomaly: "LATENCY_SPIKE",
        requestDelay: 500,
        maxRetries: 1,
        disableHeavyFeatures: false,
        useCacheFirst: false
      });
    } else if (nextAnomaly === "STABLE" && mode !== "NORMAL") {
      logger.track("SYSTEM_RECOVERED");
      get().resetToNormal();
    }
  },

  resetToNormal: () => {
    set({
      mode: "NORMAL",
      lastAnomaly: "STABLE",
      disableHeavyFeatures: false,
      requestDelay: 0,
      maxRetries: 3,
      useCacheFirst: false
    });
  }
}));

// Start the predictive engine loop
setInterval(() => {
  useAdaptiveStore.getState().analyze();
}, 5000);
