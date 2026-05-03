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
  CALL_BUSY: "call:busy",
  CALL_OFFER: "call:offer",
  CALL_ANSWER: "call:answer",
  CALL_ICE: "call:ice",
  // Group Calls
  CALL_GROUP_STARTED: "call:group-started",
  CALL_GROUP_JOINED: "call:group-joined",
  CALL_GROUP_LEFT: "call:group-left",
  CALL_GROUP_OFFER: "call:group-offer",
  CALL_GROUP_ANSWER: "call:group-answer",
  CALL_GROUP_ICE: "call:group-ice",
  CALL_IN_CALL: "call:in-call",
  CALL_AVAILABLE: "call:available",

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

  // Wallet
  WALLET_BALANCE_UPDATED: "wallet:balance-updated",
  WALLET_TRANSACTION_RECEIVED: "wallet:transaction-received",
  WALLET_DEPOSIT_APPROVED: "wallet:deposit-approved",
  WALLET_DEPOSIT_REJECTED: "wallet:deposit-rejected",

  // Subscription
  SUBSCRIPTION_CHANGED: "subscription:changed",

  // Usage / Quotas
  USAGE_UPDATED: "usage:updated",

  // Feature Flags
  FLAG_UPDATED: "flag:updated",

  // Broadcast (platform-wide announcement popup)
  BROADCAST_MESSAGE: "broadcast:message",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
