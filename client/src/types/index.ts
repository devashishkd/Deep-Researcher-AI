// Client-side types mirroring server types

export interface ResearchPlan {
  mainQuestion: string;
  subQuestions: string[];
  searchQueries: string[];
  estimatedDuration: number;
}

export interface FactCheckResult {
  claim: string;
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  supportingSources: string[];
  contradictingSources: string[];
  explanation: string;
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

export interface ResearchReport {
  title: string;
  summary: string;
  sections: ReportSection[];
  factChecks: FactCheckResult[];
  sources: ResearchSource[];
  totalSourcesAnalyzed: number;
  researchDuration: number;
  confidenceScore: number;
  generatedAt: string;
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

export interface SSEMessage {
  type: string;
  sessionId: string;
  timestamp: string;
  data: {
    message?: string;
    plan?: ResearchPlan;
    iteration?: number;
    queryCount?: number;
    totalFound?: number;
    webResults?: number;
    wikiResults?: number;
    newsResults?: number;
    urlCount?: number;
    scraped?: number;
    sourceCount?: number;
    factCheckCount?: number;
    overallConfidence?: number;
    needsMoreResearch?: boolean;
    researchGaps?: string[];
    additionalQueries?: string[];
    sectionCount?: number;
    confidenceScore?: number;
    title?: string;
    downloadUrl?: string;
    status?: ResearchStatus;
    query?: string;
    gaps?: string[];
    failed?: number;
  };
}

export interface ResearchStep {
  id: string;
  type: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'done' | 'error';
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export type ResearchDepth = 'quick' | 'standard' | 'deep';
