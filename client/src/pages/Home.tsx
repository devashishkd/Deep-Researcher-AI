import { Microscope, Github } from 'lucide-react';
import { useResearch } from '../hooks/useResearch.js';
import { SearchPanel } from '../components/SearchPanel/SearchPanel.js';
import { ProgressTracker } from '../components/ProgressTracker/ProgressTracker.js';
import { ReportViewer } from '../components/ReportViewer/ReportViewer.js';
import { ResearchDepth } from '../types/index.js';
import './Home.css';

export const Home = () => {
  const {
    query,
    sessionId,
    status,
    steps,
    plan,
    report,
    pdfReady,
    error,
    isLoading,
    liveMessages,
    searchStats,
    confidenceScore,
    startResearch,
    reset,
  } = useResearch();

  const handleSubmit = (query: string, depth: ResearchDepth) => {
    startResearch(query, depth);
  };

  const isResearching =
    status &&
    status !== 'completed' &&
    status !== 'error';

  const showSearch = !status && !isLoading;
  const showProgress = isLoading || isResearching;
  const showReport = status === 'completed' && report;

  return (
    <div className="home">
      {/* Navigation */}
      <nav className="home__nav glass">
        <div className="container">
          <div className="home__nav-content">
            <div className="home__nav-logo">
              <Microscope size={20} color="var(--accent-light)" />
              <span>AI Deep Researcher</span>
            </div>
            <div className="home__nav-links">
              {status && (
                <button className="btn btn-ghost btn-sm" onClick={reset} id="nav-reset-btn">
                  ← New Research
                </button>
              )}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                aria-label="View on GitHub"
              >
                <Github size={16} />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Background Effects */}
      <div className="home__bg-effects" aria-hidden="true">
        <div className="home__bg-orb home__bg-orb--1" />
        <div className="home__bg-orb home__bg-orb--2" />
        <div className="home__bg-grid" />
      </div>

      {/* Main Content */}
      <main className="home__main" id="main-content">
        <div className="container">

          {/* Search view */}
          {showSearch && (
            <div className="home__section">
              <SearchPanel onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          )}

          {/* Progress view */}
          {showProgress && (
            <div className="home__section">
              <ProgressTracker
                query={plan?.mainQuestion || query || ''}
                steps={steps}
                plan={plan}
                liveMessages={liveMessages}
                confidenceScore={confidenceScore}
                searchStats={searchStats}
              />
            </div>
          )}

          {/* Error view */}
          {status === 'error' && error && (
            <div className="home__section home__error animate-fade-up">
              <div className="home__error-icon">⚠️</div>
              <h2 className="home__error-title">Research Failed</h2>
              <p className="home__error-message">{error}</p>
              <div className="home__error-tips">
                <p>Common causes:</p>
                <ul>
                  <li>Missing API keys in server <code>.env</code></li>
                  <li>Rate limit hit on Tavily or Gemini free tier</li>
                  <li>Network timeout on a slow connection</li>
                </ul>
              </div>
              <button className="btn btn-primary" onClick={reset} id="error-retry-btn">
                Try Again
              </button>
            </div>
          )}

          {/* Report view */}
          {showReport && sessionId && (
            <div className="home__section">
              <ReportViewer
                report={report!}
                sessionId={sessionId}
                pdfReady={pdfReady}
                onReset={reset}
              />
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="home__footer">
        <div className="container">
          <div className="home__footer-content">
            <div className="home__footer-stack">
              {['LangGraph.js', 'Tavily', 'DuckDuckGo', 'Wikipedia', 'NewsAPI', 'Gemini Flash', 'Puppeteer', 'React'].map((t) => (
                <span key={t} className="badge badge-neutral">{t}</span>
              ))}
            </div>
            <p className="home__footer-copy">
              Built for production · Placement-ready project
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
