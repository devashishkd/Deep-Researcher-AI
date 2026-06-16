// ============================================================
// API Client
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
  startResearch: async (query: string, depth: string): Promise<{ sessionId: string }> => {
    const res = await fetch(`${BASE_URL}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, depth }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Network error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  getReport: async (sessionId: string) => {
    const res = await fetch(`${BASE_URL}/research/${sessionId}/report`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  getStatus: async (sessionId: string) => {
    const res = await fetch(`${BASE_URL}/research/${sessionId}/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  cancelResearch: async (sessionId: string) => {
    const res = await fetch(`${BASE_URL}/research/${sessionId}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  downloadPdf: (sessionId: string): void => {
    window.open(`${BASE_URL}/pdf/${sessionId}`, '_blank');
  },

  createSSEStream: (sessionId: string): EventSource => {
    return new EventSource(`${BASE_URL}/research/${sessionId}/stream`);
  },
};
