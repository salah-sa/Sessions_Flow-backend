/**
 * ═══════════════════════════════════════════════════════════
 * SessionFlow Mobile — Resilience Engine
 * Phase 102: Self-Healing & Smart Recovery
 * ═══════════════════════════════════════════════════════════
 */

import { logger } from "./logger";

export type RetryConfig = {
  retries: number;
  delay: number;
  backoff: number;
  silent?: boolean;
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retries: 3,
  delay: 1000,
  backoff: 2,
  silent: true,
};

/**
 * Executes an async function with exponential backoff.
 */
export async function smartRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: string = "UNKNOWN"
): Promise<T> {
  let attempt = 0;

  while (attempt < config.retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      
      const errorType = classifyError(err);
      
      if (attempt >= config.retries || errorType === 'AUTH') {
        throw err;
      }

      const wait = config.delay * Math.pow(config.backoff, attempt - 1);
      
      if (!config.silent) {
        logger.warn("RETRY_ATTEMPT", { 
          context, 
          attempt, 
          waitMs: wait, 
          errorType,
          message: err.message 
        });
      }

      await new Promise(res => setTimeout(res, wait));
    }
  }
  
  throw new Error("RETRY_LIMIT_EXCEEDED");
}

export type ErrorCategory = 'NETWORK' | 'AUTH' | 'SERVER' | 'UNKNOWN';

/**
 * Classifies errors into actionable categories.
 */
export function classifyError(error: any): ErrorCategory {
  const message = error.message || "";
  const status = error.status || (error.response?.status);

  if (
    message.includes('Network') || 
    message.includes('Network request failed') ||
    message.includes('TIMEOUT') ||
    message.includes('Aborted')
  ) {
    return 'NETWORK';
  }

  if (status === 401) {
    return 'AUTH';
  }

  if (status >= 500 || status === 502 || status === 503 || status === 504) {
    return 'SERVER';
  }

  return 'UNKNOWN';
}
