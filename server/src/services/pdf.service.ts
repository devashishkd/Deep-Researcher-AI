// ============================================================
// PDF Generation Service — Puppeteer
// ============================================================
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { ResearchReport } from '../types/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_DIR = path.join(process.cwd(), 'generated-pdfs');

// Lazy PDF dir initialization (called before first PDF generation)
const ensurePdfDir = async () => {
  await fs.mkdir(PDF_DIR, { recursive: true }).catch(() => {});
};

const buildReportHTML = (report: ResearchReport): string => {
  const sectionsHTML = report.sections
    .map(
      (section) => `
      <section class="report-section">
        <h2>${section.heading}</h2>
        <div class="section-content">${section.content.replace(/\n/g, '<br>')}</div>
        ${
          section.citations.length > 0
            ? `<div class="citations">
            ${section.citations
              .map(
                (c) =>
                  `<span class="citation-tag">[${c.index}] <a href="${c.url}">${c.title}</a></span>`
              )
              .join('')}
          </div>`
            : ''
        }
      </section>
    `
    )
    .join('');

  const sourcesHTML = report.sources
    .slice(0, 20)
    .map(
      (s, i) => `
      <tr>
        <td class="source-num">[${i + 1}]</td>
        <td>
          <a href="${s.url}" class="source-link">${s.title || s.url}</a>
          <span class="source-domain">${s.domain}</span>
        </td>
        <td class="source-type">${s.sourceType}</td>
      </tr>
    `
    )
    .join('');

  const factChecksHTML = report.factChecks
    .map(
      (fc) => `
      <div class="fact-check-item ${fc.confidence}">
        <div class="fact-claim">${fc.claim}</div>
        <div class="fact-meta">
          <span class="confidence-badge ${fc.confidence}">${fc.confidence.toUpperCase()} CONFIDENCE</span>
          <span class="verified-badge ${fc.verified ? 'verified' : 'unverified'}">
            ${fc.verified ? '✓ VERIFIED' : '⚠ UNVERIFIED'}
          </span>
        </div>
        <div class="fact-explanation">${fc.explanation}</div>
      </div>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap');

    :root {
      --primary: #6366f1;
      --primary-light: #818cf8;
      --bg: #ffffff;
      --surface: #f8fafc;
      --border: #e2e8f0;
      --text: #1e293b;
      --text-muted: #64748b;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --high-conf: #d1fae5;
      --medium-conf: #fef3c7;
      --low-conf: #fee2e2;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      font-size: 14px;
    }

    /* Cover Page */
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 60px;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
      color: white;
      page-break-after: always;
    }

    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(99,102,241,0.2);
      border: 1px solid rgba(99,102,241,0.4);
      border-radius: 100px;
      padding: 6px 16px;
      font-size: 12px;
      color: #a5b4fc;
      font-weight: 500;
      margin-bottom: 32px;
      width: fit-content;
    }

    .cover h1 {
      font-family: 'Playfair Display', serif;
      font-size: 42px;
      line-height: 1.2;
      margin-bottom: 24px;
      background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cover-summary {
      font-size: 16px;
      color: #94a3b8;
      max-width: 600px;
      line-height: 1.8;
      margin-bottom: 48px;
    }

    .cover-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      max-width: 600px;
    }

    .meta-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px;
    }

    .meta-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 6px;
    }

    .meta-value {
      font-size: 20px;
      font-weight: 700;
      color: #a5b4fc;
    }

    .cover-footer {
      margin-top: auto;
      padding-top: 48px;
      border-top: 1px solid rgba(255,255,255,0.1);
      font-size: 12px;
      color: #475569;
    }

    /* Content */
    .content {
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 40px;
    }

    .report-section {
      margin-bottom: 48px;
      padding-bottom: 48px;
      border-bottom: 1px solid var(--border);
    }

    .report-section:last-child {
      border-bottom: none;
    }

    h2 {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      color: var(--text);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--primary);
      display: inline-block;
    }

    .section-content {
      color: #334155;
      line-height: 1.8;
    }

    .citations {
      margin-top: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .citation-tag {
      font-size: 11px;
      background: #eef2ff;
      color: var(--primary);
      padding: 3px 10px;
      border-radius: 100px;
      border: 1px solid #c7d2fe;
    }

    .citation-tag a {
      color: var(--primary);
      text-decoration: none;
    }

    /* Fact Checks */
    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      color: var(--text);
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 3px solid var(--primary);
    }

    .fact-check-item {
      margin-bottom: 20px;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid transparent;
    }

    .fact-check-item.high { background: var(--high-conf); border-color: var(--success); }
    .fact-check-item.medium { background: var(--medium-conf); border-color: var(--warning); }
    .fact-check-item.low { background: var(--low-conf); border-color: var(--danger); }

    .fact-claim {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 10px;
      color: var(--text);
    }

    .fact-meta {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }

    .confidence-badge, .verified-badge {
      font-size: 10px;
      padding: 2px 10px;
      border-radius: 100px;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .confidence-badge.high { background: #059669; color: white; }
    .confidence-badge.medium { background: #d97706; color: white; }
    .confidence-badge.low { background: #dc2626; color: white; }

    .verified-badge.verified { background: #d1fae5; color: #065f46; }
    .verified-badge.unverified { background: #fee2e2; color: #991b1b; }

    .fact-explanation {
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Sources Table */
    .sources-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 12px;
    }

    .sources-table th {
      background: var(--surface);
      padding: 10px 14px;
      text-align: left;
      border-bottom: 2px solid var(--border);
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 10px;
    }

    .sources-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    .source-num {
      font-weight: 700;
      color: var(--primary);
      width: 40px;
    }

    .source-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
      display: block;
    }

    .source-domain {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
      display: block;
    }

    .source-type {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: capitalize;
    }

    /* Confidence bar */
    .confidence-overview {
      margin: 32px 0;
      padding: 24px;
      background: var(--surface);
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .conf-bar-container {
      margin-top: 12px;
      background: var(--border);
      border-radius: 100px;
      height: 10px;
      overflow: hidden;
    }

    .conf-bar {
      height: 100%;
      border-radius: 100px;
      background: linear-gradient(90deg, var(--primary), var(--primary-light));
      transition: width 0.3s ease;
    }

    @page {
      margin: 0;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover">
    <div class="cover-badge">🔬 AI Deep Research Report</div>
    <h1>${report.title}</h1>
    <p class="cover-summary">${report.summary}</p>
    <div class="cover-meta">
      <div class="meta-card">
        <div class="meta-label">Sources Analyzed</div>
        <div class="meta-value">${report.totalSourcesAnalyzed}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Confidence Score</div>
        <div class="meta-value">${report.confidenceScore}%</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Research Time</div>
        <div class="meta-value">${(report.researchDuration / 1000).toFixed(0)}s</div>
      </div>
    </div>
    <div class="cover-footer">
      Generated by AI Deep Researcher &bull; ${new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>

  <!-- Report Body -->
  <div class="content">
    
    <div class="confidence-overview">
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">Overall Research Confidence</div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Based on ${report.totalSourcesAnalyzed} sources across ${report.sections.length} topic areas</div>
      <div class="conf-bar-container">
        <div class="conf-bar" style="width: ${report.confidenceScore}%"></div>
      </div>
      <div style="text-align: right; font-size: 12px; color: var(--primary); font-weight: 700; margin-top: 6px;">${report.confidenceScore}%</div>
    </div>

    ${sectionsHTML}

    <h2 class="section-title">Fact-Check Analysis</h2>
    ${factChecksHTML}

    <h2 class="section-title" style="margin-top: 48px;">Sources & References</h2>
    <table class="sources-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Source</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        ${sourcesHTML}
      </tbody>
    </table>
  </div>

</body>
</html>`;
};

export const pdfService = {
  generate: async (report: ResearchReport, sessionId: string): Promise<string> => {
    const filename = `report-${sessionId}.pdf`;
    const outputPath = path.join(PDF_DIR, filename);

    await ensurePdfDir();
    logger.info(`Generating PDF for session ${sessionId}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    try {
      const page = await browser.newPage();
      const html = buildReportHTML(report);

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      logger.info(`PDF saved to ${outputPath}`);
      return outputPath;
    } finally {
      await browser.close();
    }
  },

  getPath: (sessionId: string): string =>
    path.join(PDF_DIR, `report-${sessionId}.pdf`),

  exists: async (sessionId: string): Promise<boolean> => {
    try {
      await fs.access(pdfService.getPath(sessionId));
      return true;
    } catch {
      return false;
    }
  },
};
