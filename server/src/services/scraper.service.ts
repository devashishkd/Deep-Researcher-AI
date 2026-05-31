// ============================================================
// Web Scraper Service — Cheerio + Mozilla Readability
// ============================================================
import axios from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { ResearchSource } from '../types/index.js';
import { sanitizeUrl, truncateToTokens } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';

const SCRAPE_TIMEOUT = 12000;
const MAX_CONTENT_TOKENS = 2000;

const BLOCKED_DOMAINS = [
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
  'tiktok.com', 'youtube.com', 'linkedin.com',
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
];

const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/**
 * Extract clean article text using Mozilla Readability (like Firefox Reader Mode)
 */
const extractWithReadability = (html: string, url: string): string | null => {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    return article?.textContent?.replace(/\s+/g, ' ').trim() || null;
  } catch {
    return null;
  }
};

/**
 * Fallback: extract text with Cheerio by picking meaningful elements
 */
const extractWithCheerio = (html: string): string => {
  const $ = cheerio.load(html);

  // Remove noise
  $('script, style, nav, footer, header, aside, .ad, .ads, .advertisement, .popup, .cookie-banner').remove();

  // Collect content from article-like containers
  const selectors = ['article', 'main', '.content', '#content', '.post', '.article', '.entry'];
  for (const sel of selectors) {
    const text = $(sel).text().replace(/\s+/g, ' ').trim();
    if (text.length > 200) return text;
  }

  // Fallback to body
  return $('body').text().replace(/\s+/g, ' ').trim();
};

export const scraperService = {
  /**
   * Scrape a single URL and return structured content
   */
  scrapeUrl: async (
    url: string,
    existingSnippet?: string
  ): Promise<Partial<ResearchSource> | null> => {
    const cleanUrl = sanitizeUrl(url);
    if (!cleanUrl) return null;

    const domain = new URL(cleanUrl).hostname.replace('www.', '');
    if (BLOCKED_DOMAINS.some((d) => domain.includes(d))) {
      logger.debug(`Skipping blocked domain: ${domain}`);
      return null;
    }

    try {
      logger.debug(`Scraping: ${cleanUrl}`);
      const { data: html, headers } = await axios.get(cleanUrl, {
        headers: {
          'User-Agent': randomUA(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
        },
        timeout: SCRAPE_TIMEOUT,
        maxRedirects: 5,
        responseType: 'text',
      });

      const contentType = String(headers['content-type'] || '');
      if (!contentType.includes('text/html')) return null;

      // Try Readability first, fall back to Cheerio
      let content = extractWithReadability(html, cleanUrl);
      if (!content || content.length < 100) {
        content = extractWithCheerio(html);
      }

      if (!content || content.length < 50) return null;

      const truncated = truncateToTokens(content, MAX_CONTENT_TOKENS);

      return {
        url: cleanUrl,
        content: truncated,
        snippet: truncated.slice(0, 300),
        domain,
        sourceType: 'scraped',
      };
    } catch (err: unknown) {
      const error = err as Error & { code?: string; response?: { status: number } };
      if (error.code === 'ECONNREFUSED' || error.response?.status === 403) {
        logger.debug(`Scraping blocked/refused for ${cleanUrl}`);
      } else {
        logger.warn(`Scraping failed for ${cleanUrl}: ${error.message}`);
      }
      // Return snippet-only source if we have one
      if (existingSnippet) {
        return {
          url: cleanUrl,
          content: existingSnippet,
          snippet: existingSnippet,
          domain,
          sourceType: 'scraped',
        };
      }
      return null;
    }
  },

  /**
   * Scrape multiple URLs concurrently with rate limiting
   */
  scrapeUrls: async (
    urls: Array<{ url: string; snippet?: string }>,
    concurrency = 4
  ): Promise<Array<Partial<ResearchSource>>> => {
    const results: Array<Partial<ResearchSource>> = [];

    // Process in chunks to limit concurrency
    for (let i = 0; i < urls.length; i += concurrency) {
      const chunk = urls.slice(i, i + concurrency);
      const settled = await Promise.allSettled(
        chunk.map(({ url, snippet }) => scraperService.scrapeUrl(url, snippet))
      );
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        }
      }
      // Small delay between chunks
      if (i + concurrency < urls.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return results;
  },
};
