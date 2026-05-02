/**
 * AI Agent Service Layer
 * ─────────────────────
 * Mock implementation active. To plug in a real API:
 *   1. Implement `IAIAgentService` with your real endpoint
 *   2. Replace `export const aiAgentService = mockAIService` at bottom
 *   3. Zero changes needed in components
 */

import type { AIMessage } from '../store/stores';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendMessagePayload {
  content: string;
  sessionId: string;
  history: Pick<AIMessage, 'role' | 'content'>[];
}

export interface IAIAgentService {
  sendMessage(payload: SendMessagePayload): Promise<string>; // returns agent reply text
  /** Future: streaming support */
  streamMessage?(payload: SendMessagePayload, onChunk: (chunk: string) => void): Promise<void>;
}

// ─── Mock Response Bank ───────────────────────────────────────────────────────

const MOCK_RESPONSES: { pattern: RegExp; reply: string }[] = [
  { pattern: /hello|hi|hey|مرحبا/i, reply: "Hello! I'm your SessionFlow AI assistant. How can I help you today? 🤖" },
  { pattern: /session/i, reply: "Sessions are managed from your Dashboard. You can schedule, skip, or review any session from there. Want me to navigate you there?" },
  { pattern: /group/i, reply: "Groups are the core unit in SessionFlow. Each group has its own schedule, students, and session history. What would you like to know?" },
  { pattern: /student/i, reply: "Student management is available in the Students section. You can view attendance, send credentials, and manage access." },
  { pattern: /attendance/i, reply: "Attendance is tracked per session. You can mark students as present, absent, or late — and export reports at any time." },
  { pattern: /chat/i, reply: "The group chat allows real-time communication between engineers and students within each group." },
  { pattern: /wallet/i, reply: "The Wallet feature allows verified users to manage their financial transactions within the platform." },
  { pattern: /plan|subscription|upgrade|premium/i, reply: "SessionFlow offers Free, Pro, Ultra, and Enterprise tiers. Enterprise includes unlimited groups, advanced analytics, and priority support." },
  { pattern: /help|what can you do/i, reply: "I can help you navigate SessionFlow, answer questions about features, explain workflows, or assist with administrative tasks. What do you need?" },
  { pattern: /broadcast/i, reply: "The Admin Broadcast module (in the Users page) lets you send bulk announcements to all users via Email or In-App notifications." },
];

function getMockReply(input: string): string {
  for (const { pattern, reply } of MOCK_RESPONSES) {
    if (pattern.test(input)) return reply;
  }
  const generic = [
    "I understand. Could you provide more details so I can assist you better?",
    "That's a great question. Let me help you with that — what specifically are you trying to accomplish?",
    "Got it! This sounds like something I can help with. Can you elaborate a bit more?",
    "I'm here to help. Could you clarify what you need and I'll guide you through it.",
  ];
  return generic[Math.floor(Math.random() * generic.length)];
}

// ─── Mock Service ─────────────────────────────────────────────────────────────

const mockAIService: IAIAgentService = {
  async sendMessage({ content }) {
    // Simulate realistic API latency
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 700));
    return getMockReply(content);
  },
};

// ─── Real Service Template (plug in when API is ready) ────────────────────────
// import { fetchWithAuth } from '../lib/fetchWithAuth';
//
// const realAIService: IAIAgentService = {
//   async sendMessage({ content, sessionId, history }) {
//     const res = await fetchWithAuth('/api/ai/chat', {
//       method: 'POST',
//       body: JSON.stringify({ message: content, sessionId, history }),
//     });
//     const data = await res.json();
//     return data.reply as string;
//   },
//   async streamMessage({ content, sessionId }, onChunk) {
//     const res = await fetchWithAuth('/api/ai/stream', {
//       method: 'POST',
//       body: JSON.stringify({ message: content, sessionId }),
//     });
//     const reader = res.body!.getReader();
//     const decoder = new TextDecoder();
//     while (true) {
//       const { done, value } = await reader.read();
//       if (done) break;
//       onChunk(decoder.decode(value));
//     }
//   },
// };

// ─── Active Export ────────────────────────────────────────────────────────────
export const aiAgentService: IAIAgentService = mockAIService;
