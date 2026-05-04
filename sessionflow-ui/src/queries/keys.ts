export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    summary: ["dashboard", "summary"] as const,
  },
  studentDashboard: {
    all: ["student-dashboard"] as const,
    data: ["student-dashboard", "data"] as const,
  },
  groups: {
    all: ["groups"] as const,
    list: (filters: any) => ["groups", "list", filters] as const,
    infiniteList: (filters: any) => ["groups", "infiniteList", filters] as const,
    byId: (id: string) => ["groups", "detail", id] as const,
  },
  sessions: {
    all: ["sessions"] as const,
    list: (filters: any) => ["sessions", "list", filters] as const,
    byId: (id: string) => ["sessions", "detail", id] as const,
    byGroup: (groupId: string) => ["sessions", "list", { groupId }] as const,
  },
  chat: {
    all: ["chat"] as const,
    messages: (groupId: string) => ["chat", "messages", groupId] as const,
  },
  students: {
    all: ["students"] as const,
    list: (filters: any) => ["students", "list", filters] as const,
    byId: (id: string) => ["students", "detail", id] as const,
    locations: ["students", "locations"] as const,
  },
  timetable: {
    all: ["timetable"] as const,
    entries: ["timetable", "entries"] as const,
  },
  settings: {
    all: ["settings"] as const,
  },
  engineers: {
    all: ["engineers"] as const,
    codes: ["engineers", "codes"] as const,
    pending: ["engineers", "pending"] as const,
  },
  audit: {
    all: ["audit"] as const,
    logs: ["audit", "logs"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    recent: ["notifications", "recent"] as const,
  },
  support: {
    all: ["support"] as const,
    tickets: ["support", "tickets"] as const,
  },
  system: {
    all: ["system"] as const,
  },
  ai: {
    all: ["ai"] as const,
    presets: ["ai", "presets"] as const,
    logs: (page: number) => ["ai", "logs", page] as const,
    usage: ["ai", "usage"] as const,
    history: ["ai", "history"] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    overview: ["analytics", "overview"] as const,
    dau: (days: number) => ["analytics", "dau", days] as const,
    featureUsage: (days: number) => ["analytics", "feature-usage", days] as const,
    sessions: ["analytics", "sessions"] as const,
    roles: ["analytics", "roles"] as const,
  },
  flags: {
    all: ["flags"] as const,
    list: ["flags", "list"] as const,
  },
  broadcast: {
    all: ["broadcast"] as const,
    history: (page: number) => ["broadcast", "history", page] as const,
  },
  sessionTimeline: {
    all: ["session-timeline"] as const,
    byDays: (days: number) => ["session-timeline", days] as const,
  },
  walletDeposits: {
    pending: ["wallet", "deposits", "pending"] as const,
    all:     ["wallet", "deposits", "all"]     as const,
  },
  attendance: {
    all: ["attendance"] as const,
    heatmap: (year?: number, month?: number) => ["attendance", "heatmap", year, month] as const,
    summary: ["attendance", "summary"] as const,
    history: (page: number) => ["attendance", "history", page] as const,
  },

  // ── Phase 3: Innovative Features (#11–#20) ────────────────
  autopilot: {
    all: ["autopilot"] as const,
    recommendation: (groupId: string) => ["autopilot", "recommendation", groupId] as const,
  },
  momentum: {
    all: ["momentum"] as const,
    byStudent: (studentId: string) => ["momentum", studentId] as const,
  },
  sessionReplay: {
    all: ["session-replay"] as const,
    events: (sessionId: string) => ["session-replay", "events", sessionId] as const,
  },
  absencePrediction: {
    all: ["absence-prediction"] as const,
    bySession: (sessionId: string) => ["absence-prediction", sessionId] as const,
  },
  moodPulse: {
    all: ["mood-pulse"] as const,
    summary: (sessionId: string) => ["mood-pulse", "summary", sessionId] as const,
  },
  handoff: {
    all: ["handoff"] as const,
    devices: ["handoff", "devices"] as const,
  },

  // ── Phase 4: Premium Features (#21–#30) ────────────────────
  studyPath: {
    all: ["study-path"] as const,
    byStudent: (studentId: string) => ["study-path", studentId] as const,
  },
  deepAnalytics: {
    all: ["deep-analytics"] as const,
    cohort: (months: number) => ["deep-analytics", "cohort", months] as const,
    retention: (range: string) => ["deep-analytics", "retention", range] as const,
    forecast: (metric: string, range: string) => ["deep-analytics", "forecast", metric, range] as const,
    custom: (params: Record<string, string | undefined>) => ["deep-analytics", "custom", params] as const,
  },
  streaks: {
    all: ["streaks"] as const,
    byStudent: (studentId: string) => ["streaks", studentId] as const,
    leaderboard: (groupId: string) => ["streaks", "leaderboard", groupId] as const,
  },
  sessionRecordings: {
    all: ["session-recordings"] as const,
    bySession: (sessionId: string) => ["session-recordings", sessionId] as const,
  },
  scheduleOptimizer: {
    all: ["schedule-optimizer"] as const,
    suggestions: (engineerId: string) => ["schedule-optimizer", engineerId] as const,
  },
  reports: {
    all: ["reports"] as const,
    templates: ["reports", "templates"] as const,
    generated: (id: string) => ["reports", "generated", id] as const,
  },
  focusTimer: {
    all: ["focus-timer"] as const,
    stats: (studentId: string, range: string) => ["focus-timer", "stats", studentId, range] as const,
    groupStats: (groupId: string) => ["focus-timer", "group-stats", groupId] as const,
  },
  encryptedNotes: {
    all: ["encrypted-notes"] as const,
    byEntity: (type: string, id: string) => ["encrypted-notes", type, id] as const,
    list: ["encrypted-notes", "list"] as const,
  },
};
