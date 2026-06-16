// ============================================================
// In-Memory Session & SSE Cache
// ============================================================
import { ResearchSession } from '../types/index.js';
import { Response } from 'express';
import { logger } from './logger.js';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'sessions.json');

// Ensure data dir exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// Load initial sessions
let initialSessions: [string, ResearchSession][] = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    initialSessions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  }
} catch (e) {
  logger.error('Failed to load sessions from disk');
}

// Session store
const sessions = new Map<string, ResearchSession>(initialSessions);

// SSE client registry: sessionId -> list of SSE response objects
const sseClients = new Map<string, Response[]>();

const persist = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(Array.from(sessions.entries())));
  } catch (e) {
    logger.error('Failed to save sessions to disk');
  }
};

export const sessionStore = {
  get: (id: string): ResearchSession | undefined => sessions.get(id),

  set: (session: ResearchSession): void => {
    sessions.set(session.id, session);
    persist();
  },

  update: (id: string, updates: Partial<ResearchSession>): ResearchSession | null => {
    const session = sessions.get(id);
    if (!session) return null;
    const updated = { ...session, ...updates, updatedAt: new Date() };
    sessions.set(id, updated);
    persist();
    return updated;
  },

  delete: (id: string): void => {
    sessions.delete(id);
    persist();
  },

  getAll: (): ResearchSession[] => {
    return Array.from(sessions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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

// Cleanup removed to persist history indefinitely
