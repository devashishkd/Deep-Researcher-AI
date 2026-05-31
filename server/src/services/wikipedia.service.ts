// ============================================================
// Wikipedia API Service (Completely Free)
// ============================================================
import axios from 'axios';
import { ResearchSource } from '../types/index.js';
import { logger } from '../utils/logger.js';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1';

export const wikipediaService = {
  /**
   * Search Wikipedia and return article summaries
   */
  search: async (query: string, limit = 3): Promise<ResearchSource[]> => {
    try {
      logger.debug(`Wikipedia search: "${query}"`);

      // Step 1: Search for article titles
      const searchRes = await axios.get(WIKI_API, {
        headers: { 'User-Agent': 'AIDeepResearcher/1.0 (contact@example.com)' },
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          srlimit: limit,
          format: 'json',
          origin: '*',
        },
        timeout: 8000,
      });

      const searchResults = searchRes.data?.query?.search || [];
      if (!searchResults.length) return [];

      // Step 2: Fetch full extracts for top results
      const sources: ResearchSource[] = [];

      await Promise.allSettled(
        searchResults.slice(0, limit).map(async (item: Record<string, unknown>) => {
          const title = item.title as string;
          try {
            // Get full article extract
            const extractRes = await axios.get(WIKI_API, {
              headers: { 'User-Agent': 'AIDeepResearcher/1.0 (contact@example.com)' },
              params: {
                action: 'query',
                titles: title,
                prop: 'extracts|info',
                exintro: false,
                exchars: 5000,
                inprop: 'url',
                format: 'json',
                origin: '*',
              },
              timeout: 8000,
            });

            const pages = extractRes.data?.query?.pages || {};
            const page = Object.values(pages)[0] as Record<string, unknown>;
            if (!page || (page.missing !== undefined)) return;

            const extract = (page.extract as string) || '';
            const cleanText = extract
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            sources.push({
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
              title: title,
              snippet: cleanText.slice(0, 300),
              content: cleanText,
              domain: 'en.wikipedia.org',
              sourceType: 'wikipedia',
              relevanceScore: 0.85,
            });
          } catch {
            // Skip failed individual article fetches
          }
        })
      );

      logger.debug(`Wikipedia returned ${sources.length} sources for "${query}"`);
      return sources;
    } catch (err: unknown) {
      logger.error(`Wikipedia search failed: ${(err as Error).message}`);
      return [];
    }
  },

  /**
   * Get a Wikipedia article summary directly by title
   */
  getSummary: async (title: string): Promise<string | null> => {
    try {
      const { data } = await axios.get(
        `${WIKI_REST}/page/summary/${encodeURIComponent(title)}`,
        { timeout: 8000 }
      );
      return data.extract || null;
    } catch {
      return null;
    }
  },
};
