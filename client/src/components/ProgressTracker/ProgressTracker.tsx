import { useRef, useEffect } from 'react';
import {
  CheckCircle2, Circle, AlertCircle, Loader2,
  Search, Globe, BookOpen, ShieldCheck, PenLine, FileText
} from 'lucide-react';
import { ResearchStep, ResearchPlan } from '../../types/index.js';
import './ProgressTracker.css';

interface ProgressTrackerProps {
  query: string;
  steps: ResearchStep[];
  plan: ResearchPlan | null;
  liveMessages: string[];
  confidenceScore: number | null;
  searchStats: {
    webResults: number;
    wikiResults: number;
    newsResults: number;
    scraped: number;
    iteration: number;
  } | null;
  onCancel?: () => void;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  planning: <PenLine size={18} />,
  searching: <Search size={18} />,
  scraping: <Globe size={18} />,
  fact_checking: <ShieldCheck size={18} />,
  synthesizing: <BookOpen size={18} />,
  generating_pdf: <FileText size={18} />,
};

const StepIcon = ({ step }: { step: ResearchStep }) => {
  if (step.status === 'done') return <CheckCircle2 size={18} />;
  if (step.status === 'active') return <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />;
  if (step.status === 'error') return <AlertCircle size={18} />;
  return STEP_ICONS[step.id] || <Circle size={18} />;
};

export const ProgressTracker = ({
  query,
  steps,
  plan,
  liveMessages,
  confidenceScore,
  searchStats,
  onCancel,
}: ProgressTrackerProps) => {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [liveMessages]);

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const overallPct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="progress-tracker">
      {/* Header */}
      <div className="progress-tracker__header">
        <div className="progress-tracker__query">"{query}"</div>
        <div className="progress-tracker__meta">
          <span className="badge badge-accent">Researching</span>
          {plan && (
            <span className="badge badge-neutral">
              {plan.subQuestions.length} angles · {plan.searchQueries.length} queries
            </span>
          )}
          {searchStats && searchStats.iteration > 1 && (
            <span className="badge badge-warning">
              Iteration {searchStats.iteration}
            </span>
          )}
          {onCancel && (
            <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ marginLeft: 'auto', color: 'var(--error-main)' }}>
              Stop Research
            </button>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      <div className="progress-tracker__overall-bar">
        <div className="progress-tracker__overall-label">
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Overall Progress</span>
          <span className="progress-tracker__overall-pct">{overallPct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* Steps */}
      <div className="progress-tracker__steps">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`progress-tracker__step progress-tracker__step--${step.status}`}
            role="listitem"
            aria-label={`${step.label}: ${step.status}`}
          >
            <div className="progress-tracker__step-icon">
              <StepIcon step={step} />
            </div>
            <div className="progress-tracker__step-content">
              <div className="progress-tracker__step-label">{step.label}</div>
              <div className="progress-tracker__step-desc">{step.description}</div>
            </div>
            {step.status === 'active' && (
              <div className="progress-tracker__step-dots typing-dots">
                <span /><span /><span />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Search Stats */}
      {searchStats && (
        <div className="progress-tracker__stats">
          <div className="progress-tracker__stat-card">
            <div className="progress-tracker__stat-value">{searchStats.webResults}</div>
            <div className="progress-tracker__stat-label">Web Sources</div>
          </div>
          <div className="progress-tracker__stat-card">
            <div className="progress-tracker__stat-value">{searchStats.wikiResults}</div>
            <div className="progress-tracker__stat-label">Wikipedia</div>
          </div>
          <div className="progress-tracker__stat-card">
            <div className="progress-tracker__stat-value">{searchStats.newsResults}</div>
            <div className="progress-tracker__stat-label">News Articles</div>
          </div>
          <div className="progress-tracker__stat-card">
            <div className="progress-tracker__stat-value">{searchStats.scraped}</div>
            <div className="progress-tracker__stat-label">Pages Read</div>
          </div>
        </div>
      )}

      {/* Confidence Score */}
      {confidenceScore !== null && (
        <div className="progress-tracker__confidence">
          <div>
            <div className="progress-tracker__confidence-label">Confidence</div>
            <div className="progress-tracker__confidence-value">{confidenceScore}%</div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="progress-tracker__confidence-bar">
              <div
                className="progress-tracker__confidence-fill"
                style={{ width: `${confidenceScore}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Live Activity Log */}
      {liveMessages.length > 0 && (
        <div className="progress-tracker__log" ref={logRef} aria-live="polite" aria-label="Research activity log">
          {liveMessages.map((msg, i) => (
            <div key={i} className="progress-tracker__log-entry">
              <span className="progress-tracker__log-time">›</span>
              <span className="progress-tracker__log-msg">{msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
