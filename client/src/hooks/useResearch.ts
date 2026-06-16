// ============================================================
// useResearch — Main research session state hook
// ============================================================
import { useState, useCallback } from 'react';
import { api } from '../utils/api.js';
import { useSSE } from './useSSE.js';
import {
  ResearchStatus,
  ResearchPlan,
  ResearchReport,
  ResearchStep,
  SSEMessage,
  ResearchDepth,
} from '../types/index.js';

const makeStep = (
  id: string,
  label: string,
  description: string
): ResearchStep => ({
  id,
  label,
  description,
  status: 'pending',
  type: id,
});

const INITIAL_STEPS: ResearchStep[] = [
  makeStep('planning', 'Planning Research', 'Analyzing query and building research strategy'),
  makeStep('searching', 'Multi-Source Search', 'Searching Tavily, DuckDuckGo, Wikipedia & News'),
  makeStep('scraping', 'Deep Reading', 'Extracting full content from top sources'),
  makeStep('fact_checking', 'Fact Checking', 'Cross-referencing claims across all sources'),
  makeStep('synthesizing', 'Synthesizing', 'Writing your comprehensive research report'),
  makeStep('generating_pdf', 'Generating PDF', 'Creating beautifully formatted PDF report'),
];

export const useResearch = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<ResearchStatus | null>(null);
  const [steps, setSteps] = useState<ResearchStep[]>(INITIAL_STEPS);
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveMessages, setLiveMessages] = useState<string[]>([]);
  const [searchStats, setSearchStats] = useState<{
    webResults: number;
    wikiResults: number;
    newsResults: number;
    scraped: number;
    iteration: number;
  } | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);

  const [query, setQuery] = useState<string>('');

  const updateStep = useCallback(
    (stepId: string, updates: Partial<ResearchStep>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const pushMessage = useCallback((msg: string) => {
    setLiveMessages((prev) => [...prev.slice(-49), msg]); // Keep last 50
  }, []);

  const handleSSEMessage = useCallback(
    (msg: SSEMessage) => {
      const { type, data } = msg;
      const message = data.message || '';

      if (message) pushMessage(message);

      switch (type) {
        case 'session_created':
          setStatus('pending');
          break;

        case 'planning_started':
          setStatus('planning');
          updateStep('planning', { status: 'active', timestamp: msg.timestamp });
          break;

        case 'plan_ready':
          if (data.plan) setPlan(data.plan);
          updateStep('planning', { status: 'done', timestamp: msg.timestamp });
          setStatus('searching');
          updateStep('searching', { status: 'active', timestamp: msg.timestamp });
          break;

        case 'search_started':
          setStatus('searching');
          updateStep('searching', {
            status: 'active',
            description: `Iteration ${data.iteration}: searching ${data.queryCount} queries...`,
          });
          break;

        case 'search_results':
          setSearchStats({
            webResults: data.webResults || 0,
            wikiResults: data.wikiResults || 0,
            newsResults: data.newsResults || 0,
            scraped: 0,
            iteration: data.iteration || 1,
          });
          updateStep('searching', {
            status: 'done',
            description: `Found ${data.totalFound} sources: ${data.webResults} web, ${data.wikiResults} wiki, ${data.newsResults} news`,
          });
          break;

        case 'scraping_started':
          setStatus('scraping');
          updateStep('scraping', {
            status: 'active',
            description: `Reading ${data.urlCount} articles...`,
          });
          break;

        case 'scraping_done':
          setSearchStats((prev) =>
            prev ? { ...prev, scraped: data.scraped || 0 } : null
          );
          updateStep('scraping', {
            status: 'done',
            description: `Extracted content from ${data.scraped} pages`,
          });
          setStatus('fact_checking');
          updateStep('fact_checking', { status: 'active' });
          break;

        case 'fact_check_started':
          setStatus('fact_checking');
          updateStep('fact_checking', {
            status: 'active',
            description: `Verifying claims across ${data.sourceCount} sources...`,
          });
          break;

        case 'fact_check_result':
          setConfidenceScore(data.overallConfidence || null);
          updateStep('fact_checking', {
            status: 'done',
            description: `${data.factCheckCount} facts checked, ${data.overallConfidence}% confidence`,
          });
          break;

        case 'needs_more_research':
          // Reset searching step for next iteration
          updateStep('searching', { status: 'active', description: 'Running additional searches...' });
          updateStep('scraping', { status: 'pending' });
          updateStep('fact_checking', { status: 'pending' });
          break;

        case 'synthesis_started':
          setStatus('synthesizing');
          updateStep('synthesizing', { status: 'active' });
          break;

        case 'report_ready':
          setConfidenceScore(data.confidenceScore || null);
          updateStep('synthesizing', {
            status: 'done',
            description: `${data.sectionCount} sections, ${data.confidenceScore}% confidence`,
          });
          setStatus('generating_pdf');
          updateStep('generating_pdf', { status: 'active' });
          // Fetch full report
          if (sessionId) {
            api.getReport(sessionId).then((res) => {
              if (res.report) setReport(res.report);
            }).catch(console.error);
          }
          break;

        case 'pdf_ready':
          setPdfReady(true);
          updateStep('generating_pdf', { status: 'done' });
          setStatus('completed');
          break;

        case 'pdf_generating':
          updateStep('generating_pdf', { status: 'active' });
          break;

        case 'error':
          setError(data.message || 'Research failed');
          setStatus('error');
          setSteps((prev) =>
            prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s))
          );
          break;
      }
    },
    [sessionId, updateStep, pushMessage]
  );

  const { disconnect } = useSSE(
    sessionId,
    handleSSEMessage,
    () => setError('Connection to research stream lost')
  );

  const startResearch = useCallback(
    async (searchQuery: string, depth: ResearchDepth) => {
      setIsLoading(true);
      setError(null);
      setReport(null);
      setPlan(null);
      setPdfReady(false);
      setSearchStats(null);
      setConfidenceScore(null);
      setLiveMessages([]);
      setQuery(searchQuery);
      setSteps(
        INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' }))
      );

      try {
        const { sessionId: id } = await api.startResearch(searchQuery, depth);
        setSessionId(id);
        setStatus('pending');
      } catch (err) {
        setError((err as Error).message);
        setStatus('error');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    disconnect();
    setSessionId(null);
    setStatus(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' })));
    setPlan(null);
    setReport(null);
    setPdfReady(false);
    setError(null);
    setIsLoading(false);
    setLiveMessages([]);
    setSearchStats(null);
    setConfidenceScore(null);
    setQuery('');
  }, [disconnect]);

  return {
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
  };
};
