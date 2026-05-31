// ============================================================
// Shared TypeScript Types
// ============================================================

export interface ResearchSource {
  url: string;
  title: string;
  snippet: string;
  content: string;
  domain: string;
  publishedAt?: string;
  sourceType: 'tavily' | 'duckduckgo' | 'wikipedia' | 'news' | 'scraped';
  relevanceScore?: number;
}

export interface ResearchPlan {
  mainQuestion: string;
  subQuestions: string[];
  searchQueries: string[];
  estimatedDuration: number; // seconds
}

export interface FactCheckResult {
  claim: string;
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  supportingSources: string[]; // URLs
  contradictingSources: string[];
  explanation: string;
}

export interface ResearchReport {
  title: string;
  summary: string;
  sections: ReportSection[];
  factChecks: FactCheckResult[];
  sources: ResearchSource[];
  totalSourcesAnalyzed: number;
  researchDuration: number; // ms
  confidenceScore: number; // 0-100
  generatedAt: string;
}

export interface ReportSection {
  heading: string;
  content: string;
  citations: Citation[];
}

export interface Citation {
  index: number;
  url: string;
  title: string;
  domain: string;
}

export interface ResearchSession {
  id: string;
  query: string;
  status: ResearchStatus;
  plan?: ResearchPlan;
  report?: ResearchReport;
  pdfPath?: string;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export type ResearchStatus =
  | 'pending'
  | 'planning'
  | 'searching'
  | 'scraping'
  | 'fact_checking'
  | 'synthesizing'
  | 'generating_pdf'
  | 'completed'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  sessionId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export type SSEEventType =
  | 'session_created'
  | 'plan_ready'
  | 'search_started'
  | 'search_results'
  | 'scraping_started'
  | 'scraping_done'
  | 'fact_check_started'
  | 'fact_check_result'
  | 'needs_more_research'
  | 'synthesis_started'
  | 'report_ready'
  | 'pdf_ready'
  | 'error';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  source: string;
}
