import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, RotateCcw, Share2, BookMarked, ShieldCheck } from 'lucide-react';
import { ResearchReport } from '../../types/index.js';
import { FactBadge } from '../FactBadge/FactBadge.js';
import { SourceCard } from '../SourceCard/SourceCard.js';
import { api } from '../../utils/api.js';
import './ReportViewer.css';

interface ReportViewerProps {
  report: ResearchReport;
  sessionId: string;
  pdfReady: boolean;
  onReset: () => void;
}

export const ReportViewer = ({
  report,
  sessionId,
  pdfReady,
  onReset,
}: ReportViewerProps) => {
  const handleDownloadPdf = () => {
    api.downloadPdf(sessionId);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  return (
    <article className="report-viewer" aria-label="Research Report">
      {/* Report Header */}
      <div className="report-viewer__header">
        <div className="report-viewer__badges">
          <span className="badge badge-success">✓ Research Complete</span>
          <span className="badge badge-neutral">{report.totalSourcesAnalyzed} sources</span>
          <span className="badge badge-neutral">{formatDuration(report.researchDuration)}</span>
        </div>

        <h1 className="report-viewer__title">{report.title}</h1>

        {/* Confidence Score Gauge */}
        <div className="report-viewer__confidence">
          <div className="report-viewer__conf-circle" aria-label={`Confidence score: ${report.confidenceScore}%`}>
            <svg viewBox="0 0 100 100" className="report-viewer__conf-svg">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-surface)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke={
                  report.confidenceScore >= 75 ? '#10b981' :
                  report.confidenceScore >= 50 ? '#f59e0b' : '#f43f5e'
                }
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(report.confidenceScore / 100) * 251.2} 251.2`}
                transform="rotate(-90 50 50)"
                className="report-viewer__conf-arc"
              />
              <text x="50" y="46" textAnchor="middle" className="report-viewer__conf-pct">
                {report.confidenceScore}%
              </text>
              <text x="50" y="60" textAnchor="middle" className="report-viewer__conf-label-svg">
                confidence
              </text>
            </svg>
          </div>

          <div className="report-viewer__conf-meta">
            <div className="report-viewer__conf-stat">
              <span className="report-viewer__conf-stat-value">{(report.sections || []).length}</span>
              <span className="report-viewer__conf-stat-label">Sections</span>
            </div>
            <div className="report-viewer__conf-stat">
              <span className="report-viewer__conf-stat-value">{(report.factChecks || []).length}</span>
              <span className="report-viewer__conf-stat-label">Facts Verified</span>
            </div>
            <div className="report-viewer__conf-stat">
              <span className="report-viewer__conf-stat-value">{(report.sources || []).length}</span>
              <span className="report-viewer__conf-stat-label">Citations</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="report-viewer__summary">
          <div className="report-viewer__summary-label">
            <BookMarked size={14} /> Executive Summary
          </div>
          <p className="report-viewer__summary-text">{report.summary}</p>
        </div>

        {/* Action buttons */}
        <div className="report-viewer__actions">
          <button
            id="download-pdf-btn"
            className={`btn btn-primary ${!pdfReady ? 'btn--loading' : ''}`}
            onClick={handleDownloadPdf}
            disabled={!pdfReady}
            aria-label="Download PDF report"
          >
            {pdfReady ? (
              <>
                <Download size={16} />
                Download PDF Report
              </>
            ) : (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                Generating PDF...
              </>
            )}
          </button>

          <button
            id="new-research-btn"
            className="btn btn-secondary"
            onClick={onReset}
            aria-label="Start new research"
          >
            <RotateCcw size={16} />
            New Research
          </button>
        </div>
      </div>

      <div className="divider" />

      {/* Report Sections */}
      <div className="report-viewer__body">
        {(report.sections || []).map((section, i) => (
          <section
            key={i}
            className="report-viewer__section animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
            aria-label={section.heading}
          >
            <h2 className="report-viewer__section-heading">
              <span className="report-viewer__section-num">{String(i + 1).padStart(2, '0')}</span>
              {section.heading}
            </h2>
            <div className="report-viewer__section-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {section.content}
              </ReactMarkdown>
            </div>
            {(section.citations || []).length > 0 && (
              <div className="report-viewer__section-citations">
                {(section.citations || []).map((c) => (
                  <a
                    key={c.index}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="report-viewer__citation-chip"
                    title={c.title}
                  >
                    [{c.index}] {c.domain}
                  </a>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="divider" />

      {/* Fact Checks */}
      <section className="report-viewer__fact-checks" aria-label="Fact checks">
        <div className="report-viewer__section-title">
          <ShieldCheck size={20} />
          Fact-Check Analysis
          <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>
            {(report.factChecks || []).filter((f) => f.confidence === 'high').length} high confidence
          </span>
        </div>
        <div className="report-viewer__fact-grid">
          {(report.factChecks || []).map((fc, i) => (
            <FactBadge key={i} factCheck={fc} index={i} />
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Sources */}
      <section className="report-viewer__sources" aria-label="Sources">
        <div className="report-viewer__section-title">
          <BookMarked size={20} />
          Sources & References
          <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>
            {(report.sources || []).length} sources
          </span>
        </div>
        <div className="report-viewer__sources-list">
          {(report.sources || []).map((source, i) => (
            <SourceCard key={source.url} source={source} index={i} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="report-viewer__footer">
        <div className="report-viewer__footer-meta">
          Generated by <strong>AI Deep Researcher</strong> ·{' '}
          {new Date(report.generatedAt).toLocaleString()} ·{' '}
          Powered by LangGraph · Gemini · Tavily · DuckDuckGo · Wikipedia
        </div>
        <div className="report-viewer__footer-actions">
          <button className="btn btn-ghost btn-sm" onClick={onReset}>
            <RotateCcw size={14} />
            New Research
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleDownloadPdf}
            disabled={!pdfReady}
          >
            <Download size={14} />
            PDF
          </button>
        </div>
      </div>
    </article>
  );
};
