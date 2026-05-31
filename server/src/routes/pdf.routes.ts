// ============================================================
// PDF Download Route
// ============================================================
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { sessionStore } from '../utils/cache.js';
import { pdfService } from '../services/pdf.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/pdf/:id — Download PDF report
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const session = sessionStore.get(id);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (session.status !== 'completed') {
    res.status(202).json({
      error: 'Research not yet complete',
      status: session.status,
    });
    return;
  }

  const pdfPath = session.pdfPath || pdfService.getPath(id);

  if (!fs.existsSync(pdfPath)) {
    // Try regenerating
    if (!session.report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    try {
      logger.info(`Regenerating PDF for session ${id}`);
      await pdfService.generate(session.report, id);
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate PDF' });
      return;
    }
  }

  const fileName = `research-report-${id.slice(0, 8)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const stream = fs.createReadStream(pdfPath);
  stream.on('error', (err) => {
    logger.error(`PDF stream error: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream PDF' });
    }
  });

  stream.pipe(res);
});

export default router;
