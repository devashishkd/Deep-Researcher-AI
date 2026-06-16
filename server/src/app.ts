// ============================================================
// Express App Entry Point
// ============================================================
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler.js';
import { researchRateLimiter, generalRateLimiter } from './middleware/rateLimiter.js';
import researchRoutes from './routes/research.routes.js';
import pdfRoutes from './routes/pdf.routes.js';
import { logger } from './utils/logger.js';

const app = express();
app.set('trust proxy', 1);
const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ── Security ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow SSE
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: [CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ── Parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Logging ─────────────────────────────────────────────────
app.use(requestLogger);

// ── Rate Limiting ────────────────────────────────────────────
app.use('/api/', generalRateLimiter);
app.use('/api/research', researchRateLimiter);

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    status: 'healthy',
    service: 'ai-deep-researcher-server',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/research', researchRoutes);
app.use('/api/pdf', pdfRoutes);

// ── Error Handling ───────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 AI Deep Researcher Server running on port ${PORT}`);
  logger.info(`📡 CORS allowed from: ${CORS_ORIGIN}`);
  logger.info(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? '✓ configured' : '✗ MISSING'}`);
  logger.info(`🔍 Tavily API: ${process.env.TAVILY_API_KEY ? '✓ configured' : '✗ MISSING'}`);
  logger.info(`📰 News API: ${process.env.NEWS_API_KEY ? '✓ configured' : '○ optional'}`);
});

export default app;
