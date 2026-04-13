/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Production Observability System
 * Phase 95: Structured Logging & Telemetry
 * ═══════════════════════════════════════════════════════════
 */

import * as Sentry from "@sentry/react-native";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  event: string;
  level: LogLevel;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

class ProductionLogger {
  private static instance: ProductionLogger;
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  setUserId(id: string | null, username?: string) {
    this.userId = id;
    if (id) {
      Sentry.setUser({ id, username });
    } else {
      Sentry.setUser(null);
    }
  }

  private log(entry: LogEntry) {
    // Structured console logging
    const formatted = `[${entry.timestamp}] [${entry.level}] [${entry.event}] ${this.userId ? `[User:${this.userId}]` : ''} ${JSON.stringify(entry.metadata || {})}`;
    
    if (entry.level === "ERROR") {
      console.error(formatted, entry.error);
      
      // Send critical exceptions to Sentry
      Sentry.captureException(entry.error || new Error(entry.event), {
        extra: {
          event: entry.event,
          ...entry.metadata
        },
        tags: { event: entry.event }
      });
    } else if (entry.level === "WARN") {
      console.warn(formatted);
      
      // Capture warning messages in Sentry
      Sentry.captureMessage(entry.event, {
        level: "warning",
        extra: entry.metadata,
        tags: { event: entry.event }
      });
    } else {
      console.log(formatted);
      
      // Add breadcrumbs for non-critical flow tracing in Sentry
      if (entry.level === "INFO") {
        Sentry.addBreadcrumb({
          category: "action",
          message: entry.event,
          level: "info",
          data: entry.metadata,
          timestamp: new Date(entry.timestamp).getTime() / 1000
        });
      }
    }
  }

  track(event: string, metadata?: Record<string, any>) {
    this.log({
      event,
      level: "INFO",
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined,
      metadata,
    });
  }

  error(event: string, error: any, metadata?: Record<string, any>) {
    this.log({
      event,
      level: "ERROR",
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined,
      metadata,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }

  warn(event: string, metadata?: Record<string, any>) {
    this.log({
      event,
      level: "WARN",
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined,
      metadata,
    });
  }

  debug(event: string, metadata?: Record<string, any>) {
    if (__DEV__) {
      this.log({
        event,
        level: "DEBUG",
        timestamp: new Date().toISOString(),
        userId: this.userId || undefined,
        metadata,
      });
    }
  }
}

export const logger = ProductionLogger.getInstance();
