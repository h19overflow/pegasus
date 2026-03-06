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

/**
 * Opens an EventSource connection, parses JSON messages,
 * and auto-reconnects on error. Returns a cleanup function.
 */
export function connectSseStream(options: SseOptions): () => void {
  const { url, onMessage, onStatusChange, reconnectDelay = 3000 } = options;
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function connect() {
    if (disposed) return;

    eventSource = new EventSource(url);

    eventSource.onopen = () => {
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
      if (!disposed) {
        reconnectTimer = setTimeout(connect, reconnectDelay);
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
