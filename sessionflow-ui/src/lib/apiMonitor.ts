/**
 * ═══════════════════════════════════════════════════════════════
 * SessionFlow — API Request Monitor
 * ═══════════════════════════════════════════════════════════════
 * 
 * Runtime safeguard that instruments ALL API calls flowing through
 * fetchWithAuth. Detects and warns about duplicate/redundant requests
 * in development mode.
 * 
 * Usage: Imported automatically in client.ts — zero configuration.
 * 
 * In DEV mode, this will:
 *   1. Log every API request with timestamps
 *   2. Flag duplicate requests to the same endpoint within 2 seconds
 *   3. Track request frequency per endpoint
 *   4. Expose `window.__SF_API_STATS` for console inspection
 * 
 * In PROD mode, this is a complete no-op (tree-shaken away).
 */

interface RequestRecord {
  endpoint: string;
  method: string;
  timestamp: number;
  callCount: number;
}

interface ApiStats {
  totalRequests: number;
  duplicateWarnings: number;
  endpoints: Map<string, RequestRecord>;
  history: Array<{ endpoint: string; method: string; time: string; duplicate: boolean }>;
}

const DUPLICATE_THRESHOLD_MS = 2000; // Flag if same endpoint called within 2 seconds
const MAX_HISTORY = 200;

class ApiMonitor {
  private stats: ApiStats = {
    totalRequests: 0,
    duplicateWarnings: 0,
    endpoints: new Map(),
    history: [],
  };

  private enabled: boolean;

  constructor() {
    this.enabled = import.meta.env.DEV;
    if (this.enabled) {
      (window as any).__SF_API_STATS = this;
      console.log(
        "%c[SessionFlow API Monitor] 🔍 Active — inspect via window.__SF_API_STATS",
        "color: #10b981; font-weight: bold; font-size: 12px;"
      );
    }
  }

  track(endpoint: string, method: string = "GET"): void {
    if (!this.enabled) return;

    const now = Date.now();
    const key = `${method}:${endpoint}`;
    this.stats.totalRequests++;

    const existing = this.stats.endpoints.get(key);
    let isDuplicate = false;

    if (existing) {
      const elapsed = now - existing.timestamp;
      existing.callCount++;
      
      if (elapsed < DUPLICATE_THRESHOLD_MS) {
        isDuplicate = true;
        this.stats.duplicateWarnings++;
        console.warn(
          `%c[API DUPLICATE] ⚠️ ${method} ${endpoint} called again after ${elapsed}ms (${existing.callCount} total calls)`,
          "color: #f59e0b; font-weight: bold;",
          "\nThis may indicate unnecessary re-fetching. Ensure this request goes through TanStack Query."
        );
      }
      
      existing.timestamp = now;
    } else {
      this.stats.endpoints.set(key, {
        endpoint,
        method,
        timestamp: now,
        callCount: 1,
      });
    }

    // Keep rolling history
    this.stats.history.push({
      endpoint,
      method,
      time: new Date(now).toISOString().slice(11, 23),
      duplicate: isDuplicate,
    });

    if (this.stats.history.length > MAX_HISTORY) {
      this.stats.history.shift();
    }

    // Normal request log
    const style = isDuplicate 
      ? "color: #f59e0b;" 
      : "color: #64748b;";
    console.debug(
      `%c[API] ${method} ${endpoint}${isDuplicate ? " ⚠️ DUPLICATE" : ""}`,
      style
    );
  }

  /** Print a summary table to the console */
  report(): void {
    if (!this.enabled) return;

    console.group("%c[API Monitor Report]", "color: #10b981; font-weight: bold; font-size: 14px;");
    console.log(`Total Requests: ${this.stats.totalRequests}`);
    console.log(`Duplicate Warnings: ${this.stats.duplicateWarnings}`);
    console.log("\nEndpoint Frequency:");
    
    const sorted = [...this.stats.endpoints.entries()]
      .sort((a, b) => b[1].callCount - a[1].callCount);
    
    console.table(
      sorted.map(([key, val]) => ({
        Endpoint: key,
        Calls: val.callCount,
        "Last Call": new Date(val.timestamp).toISOString().slice(11, 23),
      }))
    );

    if (this.stats.duplicateWarnings > 0) {
      console.warn(
        `\n⚠️ ${this.stats.duplicateWarnings} duplicate requests detected. ` +
        `Review the history: window.__SF_API_STATS.getHistory()`
      );
    } else {
      console.log("\n✅ No duplicate requests detected.");
    }

    console.groupEnd();
  }

  /** Get recent request history */
  getHistory() {
    return this.stats.history;
  }

  /** Get duplicate-only history */
  getDuplicates() {
    return this.stats.history.filter(h => h.duplicate);
  }

  /** Reset stats */
  reset(): void {
    this.stats = {
      totalRequests: 0,
      duplicateWarnings: 0,
      endpoints: new Map(),
      history: [],
    };
  }
}

export const apiMonitor = new ApiMonitor();
