// ============================================================
// Planner Node — Decomposes the query into a research plan
// ============================================================
import { ResearchState } from '../state.js';
import { geminiService } from '../../services/gemini.service.js';
import { sseRegistry } from '../../utils/cache.js';
import { sanitizeForPrompt } from '../../utils/sanitize.js';
import { logger } from '../../utils/logger.js';
import { ResearchPlan } from '../../types/index.js';

import { checkCancelled } from '../graph.js';

const DEPTH_CONFIG = {
  quick: { subQuestions: 3, searchQueries: 4, estimatedDuration: 30 },
  standard: { subQuestions: 5, searchQueries: 8, estimatedDuration: 90 },
  deep: { subQuestions: 8, searchQueries: 14, estimatedDuration: 180 },
};

export const plannerNode = async (state: ResearchState): Promise<Partial<ResearchState>> => {
  checkCancelled(state.sessionId);
  logger.info(`[Planner] Starting for session ${state.sessionId}`);

  sseRegistry.broadcast(state.sessionId, 'planning_started', {
    message: 'Analyzing your query and building research plan...',
  });

  const config = DEPTH_CONFIG[state.depth] || DEPTH_CONFIG.standard;
  const safeQuery = sanitizeForPrompt(state.query);

  const prompt = `You are an expert research planner. A user wants to deeply research the following topic:

QUERY: "${safeQuery}"

Create a comprehensive research plan by:
1. Breaking it into ${config.subQuestions} specific sub-questions that cover different angles
2. Generating ${config.searchQueries} diverse search queries (mix of factual, recent, analytical, comparative)
3. Estimating research duration

IMPORTANT: Make search queries specific and varied. Include:
- Direct factual queries
- "latest 2024/2025" queries for recent info
- "how does X compare to Y" queries
- "criticism of X" or "problems with X" queries for balanced coverage
- Domain-specific terms

Respond with this exact JSON structure:
{
  "mainQuestion": "Refined version of the user's question",
  "subQuestions": [
    "Sub-question 1?",
    "Sub-question 2?"
  ],
  "searchQueries": [
    "search query 1",
    "search query 2"
  ],
  "estimatedDuration": ${config.estimatedDuration}
}`;

  const plan = await geminiService.generateJSON<ResearchPlan>(prompt);

  logger.info(`[Planner] Generated plan with ${plan.searchQueries.length} queries`);

  sseRegistry.broadcast(state.sessionId, 'plan_ready', {
    plan,
    message: `Research plan ready: ${plan.subQuestions.length} angles, ${plan.searchQueries.length} search queries`,
  });

  return { plan };
};
