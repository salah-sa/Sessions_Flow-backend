/**
 * ═══════════════════════════════════════════════════════════════
 * SessionFlow — API Request Monitor (Mobile Port)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Runtime safeguard that instruments ALL API calls flowing through
 * fetchWithAuth. Detects and warns about duplicate/redundant requests
 * in development mode.
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

const DUPLICATE_THRESHOLD_MS = 2000;
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
    this.enabled = __DEV__;
    if (this.enabled) {
      // @ts-ignore
      global.__SF_API_STATS = this;
      console.log(
        "%c[SessionFlow API Monitor] 🔍 Active — inspect via global.__SF_API_STATS",
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

    this.stats.history.push({
      endpoint,
      method,
      time: new Date(now).toISOString().slice(11, 23),
      duplicate: isDuplicate,
    });

    if (this.stats.history.length > MAX_HISTORY) {
      this.stats.history.shift();
    }

    console.debug(`[API] ${method} ${endpoint}${isDuplicate ? " ⚠️ DUPLICATE" : ""}`);
  }

  report(): void {
    if (!this.enabled) return;

    console.log(`[API Monitor Report] Total: ${this.stats.totalRequests}, Dupes: ${this.stats.duplicateWarnings}`);
  }

  getHistory() { return this.stats.history; }
  getDuplicates() { return this.stats.history.filter(h => h.duplicate); }

  reset(): void {
    this.stats = { totalRequests: 0, duplicateWarnings: 0, endpoints: new Map(), history: [] };
  }
}

export const apiMonitor = new ApiMonitor();
