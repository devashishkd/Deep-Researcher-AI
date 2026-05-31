// ============================================================
// LangGraph Agent State Schema
// ============================================================
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import {
  ResearchPlan,
  ResearchSource,
  FactCheckResult,
  ResearchReport,
} from '../types/index.ts';

export const ResearchStateAnnotation = Annotation.Root({
  // Input
  sessionId: Annotation<string>,
  query: Annotation<string>,
  depth: Annotation<'quick' | 'standard' | 'deep'>,

  // Planning
  plan: Annotation<ResearchPlan | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // Search results
  searchResults: Annotation<Array<{ url: string; title: string; snippet: string; source: string }>>({
    reducer: (existing, next) => {
      // Merge deduplicating by URL
      const seen = new Set(existing.map((r) => r.url));
      const unique = next.filter((r) => !seen.has(r.url));
      return [...existing, ...unique];
    },
    default: () => [],
  }),

  // Scraped + enriched sources
  sources: Annotation<ResearchSource[]>({
    reducer: (existing, next) => {
      const seen = new Set(existing.map((s) => s.url));
      return [...existing, ...next.filter((s) => !seen.has(s.url))];
    },
    default: () => [],
  }),

  // Fact check results
  factChecks: Annotation<FactCheckResult[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Research iterations
  iterationCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  // Whether we need another search iteration
  needsMoreResearch: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),

  // Additional queries identified during fact-check
  additionalQueries: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  // Final report
  report: Annotation<ResearchReport | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // LangChain messages (for tracing)
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

export type ResearchState = typeof ResearchStateAnnotation.State;
