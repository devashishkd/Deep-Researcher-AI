// ============================================================
// Tavily Search Service
// ============================================================
import axios from 'axios';
import { SearchResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

const TAVILY_API_URL = 'https://api.tavily.com/search';

export interface TavilySearchOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeRawContent?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
  topic?: 'general' | 'news';
}

export const tavilyService = {
  search: async (
    query: string,
    options: TavilySearchOptions = {}
  ): Promise<SearchResult[]> => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      logger.warn('Tavily API key not set, skipping Tavily search');
      return [];
    }

    try {
      logger.debug(`Tavily search: "${query}"`);
      const { data } = await axios.post(
        TAVILY_API_URL,
        {
          api_key: apiKey,
          query,
          search_depth: options.searchDepth || 'basic',
          max_results: options.maxResults || 7,
          include_raw_content: options.includeRawContent || false,
          include_domains: options.includeDomains,
          exclude_domains: options.excludeDomains,
          topic: options.topic || 'general',
        },
        { timeout: 15000 }
      );

      return (data.results || []).map((r: Record<string, unknown>) => ({
        url: r.url as string,
        title: r.title as string,
        snippet: r.content as string,
        domain: new URL(r.url as string).hostname,
        source: 'tavily',
      }));
    } catch (err: unknown) {
      logger.error(`Tavily search failed for "${query}": ${(err as Error).message}`);
      return [];
    }
  },

  searchMultiple: async (
    queries: string[],
    options: TavilySearchOptions = {}
  ): Promise<SearchResult[]> => {
    const results = await Promise.allSettled(
      queries.map((q) => tavilyService.search(q, options))
    );

    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const r of result.value) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            allResults.push(r);
          }
        }
      }
    }

    return allResults;
  },
};
