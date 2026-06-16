// ============================================================
// useSSE — Server-Sent Events consumer hook
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import { SSEMessage } from '../types/index.js';
import { api } from '../utils/api.js';
type SSEHandler = (message: SSEMessage) => void;

export const useSSE = (
  sessionId: string | null,
  onMessage: SSEHandler,
  onError?: (err: Event) => void
) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    disconnect();

    const es = api.createSSEStream(sessionId);
    eventSourceRef.current = es;

    // Generic message handler for all event types we care about
    const eventTypes = [
      'session_created',
      'planning_started',
      'plan_ready',
      'search_started',
      'search_results',
      'scraping_started',
      'scraping_done',
      'fact_check_started',
      'fact_check_result',
      'needs_more_research',
      'synthesis_started',
      'report_ready',
      'pdf_generating',
      'pdf_ready',
      'error',
    ];

    for (const eventType of eventTypes) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as SSEMessage;
          onMessageRef.current(data);
        } catch {
          console.warn(`Failed to parse SSE event: ${eventType}`);
        }
      });
    }

    es.onerror = (err) => {
      console.warn('SSE connection error:', err);
      onErrorRef.current?.(err);
    };

    return disconnect;
  }, [sessionId, disconnect]);

  return { disconnect };
};
