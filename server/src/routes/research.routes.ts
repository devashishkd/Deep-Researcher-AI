// ============================================================
// Research Routes
// ============================================================
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ResearchQuerySchema } from '../utils/sanitize.js';
import { sessionStore, sseRegistry } from '../utils/cache.js';
import { runResearchAgent } from '../agents/graph.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/research — Start a new research session
router.post('/', async (req: Request, res: Response) => {
  const parsed = ResearchQuerySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { query, depth } = parsed.data;
  const sessionId = uuidv4();

  // Create session
  sessionStore.set({
    id: sessionId,
    query,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  logger.info(`[Routes] New session: ${sessionId}, query: "${query.slice(0, 60)}..."`);

  // Start research in background (non-blocking)
  setImmediate(() => {
    runResearchAgent(sessionId, query, depth as 'quick' | 'standard' | 'deep').catch((err) => {
      logger.error(`Background research error: ${err.message}`);
    });
  });

  res.status(201).json({
    sessionId,
    message: 'Research started',
    streamUrl: `/api/research/${sessionId}/stream`,
    reportUrl: `/api/research/${sessionId}/report`,
  });
});

// GET /api/research/:id/stream — SSE stream of research progress
router.get('/:id/stream', (req: Request, res: Response) => {
  const { id } = req.params;
  const session = sessionStore.get(id);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Send initial status
  const initial = JSON.stringify({
    sessionId: id,
    timestamp: new Date().toISOString(),
    type: 'session_created',
    data: {
      status: session.status,
      query: session.query,
      message: 'Connected to research stream',
    },
  });
  res.write(`event: session_created\ndata: ${initial}\n\n`);

  // Register this client
  sseRegistry.register(id, res);

  // Heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseRegistry.unregister(id, res);
    logger.debug(`SSE client disconnected for session ${id}`);
  });
});

// GET /api/research/:id/report — Get final report JSON
router.get('/:id/report', (req: Request, res: Response) => {
  const { id } = req.params;
  const session = sessionStore.get(id);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (session.status === 'error') {
    res.status(500).json({ error: session.error || 'Research failed' });
    return;
  }

  if (!session.report) {
    res.status(202).json({
      status: session.status,
      message: 'Research still in progress',
    });
    return;
  }

  res.json({
    sessionId: id,
    status: session.status,
    report: session.report,
    pdfAvailable: !!session.pdfPath,
  });
});

// GET /api/research/:id/status — Quick status check
router.get('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const session = sessionStore.get(id);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json({
    sessionId: id,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
});

// POST /api/research/:id/cancel — Cancel an ongoing research session
router.post('/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;
  const session = sessionStore.get(id);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (session.status === 'completed' || session.status === 'error' || session.status === 'cancelled') {
    res.status(400).json({ error: `Cannot cancel a session in '${session.status}' state` });
    return;
  }

  // Update status to cancelled
  sessionStore.update(id, { status: 'cancelled' });
  
  // Broadcast cancellation to clients
  sseRegistry.broadcast(id, 'error', {
    message: 'Research cancelled by user',
  });

  logger.info(`[Routes] Session ${id} cancelled by user`);

  res.json({ message: 'Research cancelled successfully' });
});

export default router;
