// ============================================================
// Fact-Checker Node — Cross-references claims & decides loop
// ============================================================
import { ResearchState } from '../state.js';
import { geminiService } from '../../services/gemini.service.js';
import { sseRegistry } from '../../utils/cache.js';
import { truncateToTokens } from '../../utils/sanitize.js';
import { logger } from '../../utils/logger.js';
import { FactCheckResult } from '../../types/index.js';

const MAX_ITERATIONS = parseInt(process.env.MAX_RESEARCH_ITERATIONS || '3', 10);

export const factCheckerNode = async (state: ResearchState): Promise<Partial<ResearchState>> => {
  logger.info(`[FactChecker] Checking facts from ${state.sources.length} sources`);

  sseRegistry.broadcast(state.sessionId, 'fact_check_started', {
    sourceCount: state.sources.length,
    message: `Fact-checking claims across ${state.sources.length} sources...`,
  });

  // Build a condensed context from all sources
  const sourceContext = state.sources
    .slice(0, 15)
    .map((s, i) => `[Source ${i + 1}: ${s.domain}]\n${truncateToTokens(s.content, 400)}`)
    .join('\n\n---\n\n');

  const subQuestions = state.plan?.subQuestions.join('\n- ') || state.query;

  const prompt = `You are a rigorous fact-checker and research quality analyst. 

RESEARCH TOPIC: "${state.query}"

KEY QUESTIONS TO ANSWER:
- ${subQuestions}

COLLECTED SOURCES (${state.sources.length} total):
${truncateToTokens(sourceContext, 6000)}

Your tasks:
1. Extract the 5-7 most important factual claims from the sources
2. Cross-reference each claim across multiple sources
3. Assess confidence (high/medium/low) based on:
   - Number of sources confirming the claim
   - Quality/authority of those sources
   - Whether sources contradict each other
4. Identify any knowledge gaps or contradictions
5. Determine if more research is needed

Respond with ONLY this JSON (no markdown):
{
  "factChecks": [
    {
      "claim": "Clear statement of the claim",
      "verified": true,
      "confidence": "high",
      "supportingSources": ["domain1.com", "domain2.com"],
      "contradictingSources": [],
      "explanation": "Why this confidence level"
    }
  ],
  "overallConfidence": 75,
  "needsMoreResearch": false,
  "additionalQueries": [],
  "researchGaps": ["Gap 1", "Gap 2"]
}

Set needsMoreResearch to true only if:
- Overall confidence is below 60%
- There are major contradictions between sources
- Key sub-questions remain completely unanswered
- This is iteration ${state.iterationCount} (max: ${MAX_ITERATIONS})`;

  const result = await geminiService.generateJSON<{
    factChecks: FactCheckResult[];
    overallConfidence: number;
    needsMoreResearch: boolean;
    additionalQueries: string[];
    researchGaps: string[];
  }>(prompt);

  // Force no more research if we've hit max iterations
  const needsMore = result.needsMoreResearch && state.iterationCount < MAX_ITERATIONS;

  logger.info(
    `[FactChecker] Confidence: ${result.overallConfidence}%, NeedsMore: ${needsMore}`
  );

  sseRegistry.broadcast(state.sessionId, 'fact_check_result', {
    factCheckCount: result.factChecks.length,
    overallConfidence: result.overallConfidence,
    needsMoreResearch: needsMore,
    researchGaps: result.researchGaps || [],
    message: needsMore
      ? `Confidence at ${result.overallConfidence}% — running additional research to fill gaps...`
      : `Fact-check complete: ${result.overallConfidence}% confidence across ${result.factChecks.length} claims`,
  });

  if (needsMore) {
    sseRegistry.broadcast(state.sessionId, 'needs_more_research', {
      additionalQueries: result.additionalQueries,
      gaps: result.researchGaps,
      message: `Identified ${result.additionalQueries.length} additional queries to improve accuracy`,
    });
  }

  return {
    factChecks: result.factChecks,
    needsMoreResearch: needsMore,
    additionalQueries: result.additionalQueries || [],
  };
};
