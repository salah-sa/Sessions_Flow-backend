/**
 * ═══════════════════════════════════════════════════════════════
 * SessionFlow — Production API Monitor
 * ═══════════════════════════════════════════════════════════════
 * 
 * Instruments ALL API calls. Tracks timing, errors, and performance.
 * Integrates with structured logging for full observability.
 */

import { logger } from "./logger";
import * as Sentry from "@sentry/react-native";

interface RequestRecord {
  id: string;
  endpoint: string;
  method: string;
  startTime: number;
}

class ApiMonitor {
  private activeRequests = new Map<string, RequestRecord>();

  start(id: string, endpoint: string, method: string = "GET"): void {
    const startTime = Date.now();
    this.activeRequests.set(id, { id, endpoint, method, startTime });
    
    logger.debug("API_REQUEST_START", { id, endpoint, method });
  }

  end(id: string, status: number): void {
    const record = this.activeRequests.get(id);
    if (!record) return;

    const duration = Date.now() - record.startTime;
    this.activeRequests.delete(id);

    const metadata = {
      id,
      endpoint: record.endpoint,
      method: record.method,
      status,
      durationMs: duration,
    };

    // Sentry breadcrumb for all completions
    Sentry.addBreadcrumb({
      category: "api",
      message: `${record.method} ${record.endpoint} completed`,
      level: status >= 400 ? "error" : "info",
      data: metadata,
    });

    if (duration > 2000) {
      logger.warn("API_SLOW_RESPONSE", metadata);
    }

    if (status >= 500) {
      // Critical server failures go to Sentry as exceptions
      Sentry.captureException(new Error(`API_CRITICAL_FAILURE_${status}`), {
        extra: metadata,
        tags: { endpoint: record.endpoint, status: String(status) }
      });
      logger.error("API_FAILURE", new Error(`Status ${status}`), metadata);
    } else if (status >= 400) {
      logger.error("API_FAILURE", new Error(`Status ${status}`), metadata);
    } else {
      logger.track("API_SUCCESS", metadata);
    }
  }

  error(id: string, error: any): void {
    const record = this.activeRequests.get(id);
    if (!record) return;

    const duration = Date.now() - record.startTime;
    this.activeRequests.delete(id);

    // Sentry exception for network errors
    Sentry.captureException(error, {
      extra: {
        id,
        endpoint: record.endpoint,
        method: record.method,
        durationMs: duration,
      },
      tags: { type: "network_error" }
    });

    logger.error("API_NETWORK_ERROR", error, {
      id,
      endpoint: record.endpoint,
      method: record.method,
      durationMs: duration,
    });
  }
}

export const apiMonitor = new ApiMonitor();
