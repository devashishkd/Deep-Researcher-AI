// ============================================================
// DuckDuckGo Search Service (No API Key Required)
// ============================================================
import axios from 'axios';
import { parse } from 'node-html-parser';
import { SearchResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

const DDG_URL = 'https://html.duckduckgo.com/html/';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118.0.0.0 Safari/537.36',
];

const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

export const duckduckgoService = {
  search: async (query: string, maxResults = 8): Promise<SearchResult[]> => {
    try {
      logger.debug(`DuckDuckGo search: "${query}"`);
      const { data } = await axios.post(
        DDG_URL,
        new URLSearchParams({ q: query, kl: 'us-en' }),
        {
          headers: {
            'User-Agent': randomUA(),
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'text/html',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 10000,
        }
      );

      const root = parse(data);
      const results: SearchResult[] = [];

      const resultDivs = root.querySelectorAll('.result');
      for (const div of resultDivs.slice(0, maxResults)) {
        const titleEl = div.querySelector('.result__title a');
        const snippetEl = div.querySelector('.result__snippet');
        const urlEl = div.querySelector('.result__url');

        if (!titleEl) continue;

        // DDG hides the real URL in a redirect — extract from href
        const rawHref = titleEl.getAttribute('href') || '';
        let url = '';
        try {
          const urlParam = new URL('https://duckduckgo.com' + rawHref).searchParams.get('uddg');
          url = urlParam ? decodeURIComponent(urlParam) : rawHref;
          new URL(url); // validate
        } catch {
          continue;
        }

        results.push({
          url,
          title: titleEl.text.trim(),
          snippet: snippetEl?.text.trim() || '',
          domain: urlEl?.text.trim() || new URL(url).hostname,
          source: 'duckduckgo',
        });
      }

      logger.debug(`DuckDuckGo returned ${results.length} results for "${query}"`);
      return results;
    } catch (err: unknown) {
      logger.error(`DuckDuckGo search failed: ${(err as Error).message}`);
      return [];
    }
  },

  searchMultiple: async (queries: string[]): Promise<SearchResult[]> => {
    const results = await Promise.allSettled(
      queries.map((q) => duckduckgoService.search(q))
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
