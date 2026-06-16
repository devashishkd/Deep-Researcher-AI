// ============================================================
// Searcher Node — Multi-source parallel search
// ============================================================
import { ResearchState } from '../state.js';
import { tavilyService } from '../../services/tavily.service.js';
import { duckduckgoService } from '../../services/duckduckgo.service.js';
import { wikipediaService } from '../../services/wikipedia.service.js';
import { newsService } from '../../services/news.service.js';
import { sseRegistry } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';
import { ResearchSource, SearchResult } from '../../types/index.js';

import { checkCancelled } from '../graph.js';

export const searcherNode = async (state: ResearchState): Promise<Partial<ResearchState>> => {
  checkCancelled(state.sessionId);
  if (!state.plan) throw new Error('No research plan available');

  logger.info(`[Searcher] Starting search iteration ${state.iterationCount + 1}`);

  const queries = state.iterationCount === 0
    ? state.plan.searchQueries
    : state.additionalQueries;

  sseRegistry.broadcast(state.sessionId, 'search_started', {
    iteration: state.iterationCount + 1,
    queryCount: queries.length,
    message: `Searching ${queries.length} queries across Tavily, DuckDuckGo, Wikipedia, and News...`,
  });

  // Run all search sources in PARALLEL for maximum speed
  const [tavilyResults, ddgResults, wikiSources, newsSources] = await Promise.allSettled([
    // Tavily: split queries into batches
    tavilyService.searchMultiple(queries.slice(0, 6), {
      searchDepth: state.depth === 'deep' ? 'advanced' : 'basic',
      maxResults: 6,
    }),

    // DuckDuckGo: different queries for diversity
    duckduckgoService.searchMultiple(queries.slice(0, 4)),

    // Wikipedia: top-level query for factual grounding
    wikipediaService.search(state.plan.mainQuestion, 3),

    // News: recent developments
    newsService.search(state.plan.mainQuestion, 5),
  ]);

  // Normalize Tavily + DDG results to SearchResult[]
  const rawResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  const addResults = (results: SearchResult[]) => {
    for (const r of results) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        rawResults.push(r);
      }
    }
  };

  if (tavilyResults.status === 'fulfilled') addResults(tavilyResults.value);
  if (ddgResults.status === 'fulfilled') addResults(ddgResults.value);

  // Normalize Wikipedia sources into ResearchSource[]
  const wikiSourcesList: ResearchSource[] =
    wikiSources.status === 'fulfilled' ? wikiSources.value : [];

  const newsSourcesList: ResearchSource[] =
    newsSources.status === 'fulfilled' ? newsSources.value : [];

  const totalFound =
    rawResults.length + wikiSourcesList.length + newsSourcesList.length;

  logger.info(
    `[Searcher] Found: ${rawResults.length} web, ${wikiSourcesList.length} wiki, ${newsSourcesList.length} news`
  );

  sseRegistry.broadcast(state.sessionId, 'search_results', {
    totalFound,
    webResults: rawResults.length,
    wikiResults: wikiSourcesList.length,
    newsResults: newsSourcesList.length,
    message: `Found ${totalFound} sources: ${rawResults.length} web pages, ${wikiSourcesList.length} Wikipedia articles, ${newsSourcesList.length} news articles`,
  });

  return {
    searchResults: rawResults,
    sources: [...wikiSourcesList, ...newsSourcesList],
    iterationCount: state.iterationCount + 1,
  };
};
