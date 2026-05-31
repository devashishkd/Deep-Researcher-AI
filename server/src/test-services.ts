import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env') });

import { tavilyService } from './services/tavily.service.js';
import { duckduckgoService } from './services/duckduckgo.service.js';
import { wikipediaService } from './services/wikipedia.service.js';
import { newsService } from './services/news.service.js';
import { scraperService } from './services/scraper.service.js';
import { geminiService } from './services/gemini.service.js';
import { z } from 'zod';

async function runTests() {
  console.log('\n🧪 Starting API Integration Tests...\n');

  // 1. DuckDuckGo (No API Key)
  try {
    console.log('--- Testing DuckDuckGo ---');
    const ddgResults = await duckduckgoService.search('Solid state batteries 2024');
    console.log(`✅ Success! Found ${ddgResults.length} results.`);
    console.log(`   Sample: ${ddgResults[0]?.title}`);
  } catch (err: any) {
    console.error(`❌ DuckDuckGo Error: ${err.message}`);
  }

  // 2. Wikipedia (No API Key)
  try {
    console.log('\n--- Testing Wikipedia ---');
    const wikiResults = await wikipediaService.search('Quantum computing');
    console.log(`✅ Success! Found ${wikiResults.length} results.`);
    console.log(`   Sample: ${wikiResults[0]?.title}`);
  } catch (err: any) {
    console.error(`❌ Wikipedia Error: ${err.message}`);
  }

  // 3. Tavily (API Key Required)
  try {
    console.log('\n--- Testing Tavily ---');
    const tavilyResults = await tavilyService.search('Who won the super bowl in 2024?', 'standard');
    console.log(`✅ Success! Found ${tavilyResults.length} results.`);
    console.log(`   Sample: ${tavilyResults[0]?.title}`);
  } catch (err: any) {
    console.error(`❌ Tavily Error: ${err.message}`);
  }

  // 4. NewsAPI (API Key Required)
  try {
    console.log('\n--- Testing NewsAPI ---');
    const newsResults = await newsService.search('AI agents');
    console.log(`✅ Success! Found ${newsResults.length} articles.`);
    if (newsResults.length > 0) {
      console.log(`   Sample: ${newsResults[0]?.title}`);
    } else {
      console.log('   No recent articles found.');
    }
  } catch (err: any) {
    console.error(`❌ NewsAPI Error: ${err.message}`);
  }

  // 5. Scraper Service
  try {
    console.log('\n--- Testing Web Scraper ---');
    const scrapeResult = await scraperService.scrapeUrl('https://en.wikipedia.org/wiki/Artificial_intelligence');
    if (scrapeResult) {
      console.log(`✅ Success! Scraped ${scrapeResult.content?.length} characters from Wikipedia.`);
    } else {
      console.log('❌ Scrape returned null.');
    }
  } catch (err: any) {
    console.error(`❌ Scraper Error: ${err.message}`);
  }

  // 6. Gemini LLM (API Key Required)
  try {
    console.log('\n--- Testing Gemini LLM ---');
    const llmResult = await geminiService.generateJSON<{ answer: string; confidence: number }>(
      'System: You are a helpful assistant.\nUser: What is 2 + 2?\n\nRespond with JSON matching this schema: { "answer": "...", "confidence": 1.0 }'
    );

    console.log(`✅ Success! Received valid JSON from Gemini.`);
    console.log(`   Answer: ${llmResult.answer}, Confidence: ${llmResult.confidence}`);
  } catch (err: any) {
    console.error(`❌ Gemini Error: ${err.message}`);
  }

  console.log('\n🏁 Tests Completed.\n');
  process.exit(0);
}

runTests();
