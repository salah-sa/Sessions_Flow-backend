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
};
