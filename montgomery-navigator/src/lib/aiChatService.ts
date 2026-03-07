/**
 * AI Chatbot API client.
 *
 * Calls POST /api/chat on the backend. If the backend is unreachable,
 * falls back to the existing getDemoResponse() for graceful degradation.
 * Maintains a session-level conversation_id for context memory.
 */

import type { AiChatResponse, ChatMessage } from "./types";
import { getDemoResponse } from "./demoResponses";

interface ChatRequestBody {
  message: string;
  conversation_id?: string;
  context?: Record<string, unknown>;
}

// Session-level conversation ID (persists until page reload)
const _conversationId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Send a message to the AI chatbot backend.
 * Returns a structured AiChatResponse on success, or null on failure.
 */
export async function sendChatMessage(
  message: string,
  conversationId?: string,
): Promise<AiChatResponse | null> {
  try {
    const body: ChatRequestBody = {
      message,
      conversation_id: conversationId || _conversationId,
    };

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) return null;
    return (await response.json()) as AiChatResponse;
  } catch {
    return null;
  }
}

/**
 * Convert an AiChatResponse into a ChatMessage for the existing UI.
 */
export function aiResponseToChatMessage(ai: AiChatResponse): ChatMessage {
  let content = ai.answer;
  if (ai.follow_up_question) {
    content += `\n\n${ai.follow_up_question}`;
  }

  return {
    id: Date.now().toString(),
    role: "assistant",
    content,
    type: "text",
    chips: ai.chips.length > 0 ? ai.chips : undefined,
  };
}

/**
 * Smart chat handler: tries AI backend first, falls back to demo responses.
 */
export async function getSmartResponse(message: string): Promise<ChatMessage> {
  const aiResponse = await sendChatMessage(message);

  if (aiResponse) {
    return aiResponseToChatMessage(aiResponse);
  }

  // Fallback to existing demo responses
  return getDemoResponse(message);
}
