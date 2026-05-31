// ============================================================
// In-Memory Session & SSE Cache
// ============================================================
import { ResearchSession } from '../types/index.js';
import { Response } from 'express';
import { logger } from './logger.js';

// Session store
const sessions = new Map<string, ResearchSession>();

// SSE client registry: sessionId -> list of SSE response objects
const sseClients = new Map<string, Response[]>();

export const sessionStore = {
  get: (id: string): ResearchSession | undefined => sessions.get(id),

  set: (session: ResearchSession): void => {
    sessions.set(session.id, session);
  },

  update: (id: string, updates: Partial<ResearchSession>): ResearchSession | null => {
    const session = sessions.get(id);
    if (!session) return null;
    const updated = { ...session, ...updates, updatedAt: new Date() };
    sessions.set(id, updated);
    return updated;
  },

  delete: (id: string): void => {
    sessions.delete(id);
  },

  cleanup: (): void => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, session] of sessions.entries()) {
      if (session.updatedAt < oneHourAgo) {
        sessions.delete(id);
        logger.debug(`Cleaned up session ${id}`);
      }
    }
  },
};

export const sseRegistry = {
  register: (sessionId: string, res: Response): void => {
    const existing = sseClients.get(sessionId) || [];
    existing.push(res);
    sseClients.set(sessionId, existing);
    logger.debug(`SSE client registered for session ${sessionId}`);
  },

  unregister: (sessionId: string, res: Response): void => {
    const clients = sseClients.get(sessionId);
    if (!clients) return;
    const filtered = clients.filter((c) => c !== res);
    if (filtered.length === 0) {
      sseClients.delete(sessionId);
    } else {
      sseClients.set(sessionId, filtered);
    }
  },

  emit: (sessionId: string, event: string, data: unknown): void => {
    const clients = sseClients.get(sessionId);
    if (!clients || clients.length === 0) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      try {
        client.write(payload);
      } catch {
        logger.warn(`Failed to write SSE to client for session ${sessionId}`);
      }
    }
  },

  broadcast: (sessionId: string, eventType: string, data: unknown): void => {
    sseRegistry.emit(sessionId, eventType, {
      sessionId,
      timestamp: new Date().toISOString(),
      type: eventType,
      data,
    });
  },
};

// Run cleanup every 30 minutes
setInterval(() => sessionStore.cleanup(), 30 * 60 * 1000);
