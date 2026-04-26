/**
 * Standardized event contract names for the real-time system.
 * Mirror of the server-side EventContracts.cs — MUST be kept in sync.
 *
 * Every SignalR event listener and invocation MUST use these constants.
 */
export const Events = {
  // Messages
  MESSAGE_RECEIVE: "message:receive",
  MESSAGE_READ: "message:read",
  MESSAGE_TYPING: "message:typing",

  // Presence
  PRESENCE_ONLINE: "presence:online",
  PRESENCE_OFFLINE: "presence:offline",
  PRESENCE_AWAY: "presence:away",
  PRESENCE_SNAPSHOT: "presence:snapshot",

  // Calls
  CALL_INCOMING: "call:incoming",
  CALL_ACCEPTED: "call:accepted",
  CALL_REJECTED: "call:rejected",
  CALL_ENDED: "call:ended",
  CALL_OFFER: "call:offer",
  CALL_ANSWER: "call:answer",
  CALL_ICE: "call:ice",

  // Student Requests
  REQUEST_CREATED: "request:created",
  REQUEST_ACCEPTED: "request:accepted",
  REQUEST_REJECTED: "request:rejected",

  // Groups
  GROUP_CREATED: "group:created",
  GROUP_DELETED: "group:deleted",
  GROUP_COMPLETED: "group:completed",
  GROUP_DESCRIPTION_UPDATED: "group:description-updated",
  GROUP_STATUS_CHANGED: "group:status-changed",

  // Sessions
  SESSION_STATUS_CHANGED: "session:status-changed",
  SESSION_GENERATED: "session:generated",
  ATTENDANCE_UPDATED: "session:attendance-updated",

  // Notifications
  NOTIFICATION_CREATED: "notification:created",
  NOTIFICATION_READ: "notification:read",

  // Avatar
  AVATAR_UPDATED: "avatar:updated",

  // System / Sync
  SYNC_STATE: "sync:state",
  USER_UPDATED: "user:updated",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
