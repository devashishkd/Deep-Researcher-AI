// ============================================================
// NewsAPI Service (Free tier: 100 req/day)
// ============================================================
import axios from 'axios';
import { ResearchSource } from '../types/index.js';
import { logger } from '../utils/logger.js';

const NEWS_API_URL = 'https://newsapi.org/v2/everything';

export const newsService = {
  search: async (query: string, maxResults = 5): Promise<ResearchSource[]> => {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      logger.warn('News API key not set, skipping news search');
      return [];
    }

    try {
      logger.debug(`NewsAPI search: "${query}"`);
      const { data } = await axios.get(NEWS_API_URL, {
        params: {
          q: query,
          language: 'en',
          sortBy: 'relevancy',
          pageSize: maxResults,
          apiKey,
        },
        timeout: 10000,
      });

      const articles = data.articles || [];
      return articles
        .filter((a: Record<string, unknown>) => a.url && a.title && a.description)
        .map((a: Record<string, unknown>) => ({
          url: a.url as string,
          title: a.title as string,
          snippet: a.description as string,
          content: [a.description, a.content].filter(Boolean).join('\n\n') as string,
          domain: new URL(a.url as string).hostname,
          publishedAt: a.publishedAt as string,
          sourceType: 'news' as const,
          relevanceScore: 0.8,
        }));
    } catch (err: unknown) {
      logger.error(`NewsAPI search failed: ${(err as Error).message}`);
      return [];
    }
  },
};
