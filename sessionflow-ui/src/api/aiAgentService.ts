/**
 * AI Agent Service Layer — Real SSE Streaming via Groq/OpenAI Backend
 * ─────────────────────────────────────────────────────────────────────
 * Streams tokens from POST /api/ai/chat (SSE) in real-time.
 * Falls back to accumulated response if streaming fails.
 */

import type { AIMessage } from '../store/stores';
import { useAuthStore } from '../store/stores';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendMessagePayload {
  content: string;
  sessionId: string;
  history: Pick<AIMessage, 'role' | 'content'>[];
}

export interface IAIAgentService {
  /** Stream message chunks from the AI backend via SSE. */
  streamMessage(
    payload: SendMessagePayload,
    onChunk: (accumulated: string) => void
  ): Promise<string>;
}

// ─── API Base URL (same pattern as client.ts) ─────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_URL ?? '') + '/api';

// ─── Real SSE Streaming Service ───────────────────────────────────────────────

const realAIService: IAIAgentService = {
  async streamMessage({ content, sessionId, history }, onChunk) {
    const { token } = useAuthStore.getState();

    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message: content,
        sessionId,
        history: history.map((h) => ({
          role: h.role === 'agent' ? 'assistant' : h.role,
          content: h.content,
        })),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || `AI request failed (${res.status})`);
    }

    // ── Read SSE stream ────────────────────────────────────────────────
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines from buffer
      const lines = buffer.split('\n');
      // Keep last incomplete line in buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice('data: '.length);
        if (data === '[DONE]') continue;

        // Unescape newlines that the backend escaped for SSE transport
        const chunk = data.replace(/\\n/g, '\n').replace(/\\r/g, '');
        accumulated += chunk;
        onChunk(accumulated);
      }
    }

    return accumulated;
  },
};

// ─── Active Export ────────────────────────────────────────────────────────────
export const aiAgentService: IAIAgentService = realAIService;
