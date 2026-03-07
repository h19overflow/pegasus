/**
 * Framework-agnostic SSE client with auto-reconnect.
 */

export interface SseMessage {
  type: string;
  data: unknown;
}

export interface SseOptions {
  url: string;
  onMessage: (msg: SseMessage) => void;
  onStatusChange?: (connected: boolean) => void;
  reconnectDelay?: number;
}

const MAX_RETRIES = 4;
const BASE_DELAY  = 2000;
const MAX_DELAY   = 30_000;

/**
 * Opens an EventSource connection, parses JSON messages,
 * and auto-reconnects with exponential backoff.
 * Gives up after MAX_RETRIES consecutive failures.
 * Returns a cleanup function.
 */
export function connectSseStream(options: SseOptions): () => void {
  const { url, onMessage, onStatusChange } = options;
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let attempts = 0;

  function connect() {
    if (disposed) return;
    if (attempts >= MAX_RETRIES) {
      console.warn(`[SSE] Giving up after ${MAX_RETRIES} failed attempts — no live stream.`);
      return;
    }

    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      attempts = 0;
      onStatusChange?.(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed: SseMessage = JSON.parse(event.data);
        onMessage(parsed);
      } catch {
        console.warn("[SSE] Failed to parse message:", event.data);
      }
    };

    eventSource.onerror = () => {
      onStatusChange?.(false);
      eventSource?.close();
      eventSource = null;
      attempts += 1;
      if (!disposed && attempts < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY * 2 ** (attempts - 1), MAX_DELAY);
        reconnectTimer = setTimeout(connect, delay);
      }
    };
  }

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    eventSource?.close();
    eventSource = null;
    onStatusChange?.(false);
  };
}
