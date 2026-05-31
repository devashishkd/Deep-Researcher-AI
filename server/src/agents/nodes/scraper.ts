// ============================================================
// Scraper Node — Deep-scrapes top URLs with Readability
// ============================================================
import { ResearchState } from '../state.js';
import { scraperService } from '../../services/scraper.service.js';
import { sseRegistry } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';
import { ResearchSource } from '../../types/index.js';

const MAX_URLS_TO_SCRAPE = 12;

export const scraperNode = async (state: ResearchState): Promise<Partial<ResearchState>> => {
  logger.info(`[Scraper] Starting deep scrape of ${state.searchResults.length} URLs`);

  sseRegistry.broadcast(state.sessionId, 'scraping_started', {
    urlCount: Math.min(state.searchResults.length, MAX_URLS_TO_SCRAPE),
    message: `Deep-reading top ${Math.min(state.searchResults.length, MAX_URLS_TO_SCRAPE)} articles...`,
  });

  // Prioritize URLs: take top unique results
  const urlsToScrape = state.searchResults
    .slice(0, MAX_URLS_TO_SCRAPE)
    .map((r) => ({ url: r.url, snippet: r.snippet }));

  const scrapedResults = await scraperService.scrapeUrls(urlsToScrape, 4);

  // Merge scraped content with existing search metadata
  const enrichedSources: ResearchSource[] = [];

  for (const scraped of scrapedResults) {
    if (!scraped.url || !scraped.content) continue;

    // Find the original search result for metadata
    const original = state.searchResults.find((r) => r.url === scraped.url);

    enrichedSources.push({
      url: scraped.url,
      title: original?.title || scraped.domain || 'Unknown',
      snippet: scraped.snippet || original?.snippet || '',
      content: scraped.content,
      domain: scraped.domain || new URL(scraped.url).hostname,
      sourceType: 'scraped',
      relevanceScore: original ? 0.8 : 0.6,
    });
  }

  logger.info(`[Scraper] Successfully scraped ${enrichedSources.length} pages`);

  sseRegistry.broadcast(state.sessionId, 'scraping_done', {
    scraped: enrichedSources.length,
    failed: urlsToScrape.length - enrichedSources.length,
    message: `Extracted content from ${enrichedSources.length} pages`,
  });

  return {
    sources: enrichedSources,
  };
};
