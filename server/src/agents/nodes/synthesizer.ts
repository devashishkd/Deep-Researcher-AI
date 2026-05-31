// ============================================================
// Synthesizer Node — Generates the final structured report
// ============================================================
import { ResearchState } from '../state.js';
import { geminiService } from '../../services/gemini.service.js';
import { sseRegistry } from '../../utils/cache.js';
import { truncateToTokens } from '../../utils/sanitize.js';
import { logger } from '../../utils/logger.js';
import { ResearchReport, ReportSection, Citation } from '../../types/index.js';

export const synthesizerNode = async (
  state: ResearchState,
  startTime: number
): Promise<Partial<ResearchState>> => {
  logger.info(`[Synthesizer] Building final report from ${state.sources.length} sources`);

  sseRegistry.broadcast(state.sessionId, 'synthesis_started', {
    sourceCount: state.sources.length,
    message: 'Synthesizing research into a comprehensive report...',
  });

  // Build rich context
  const sourceContext = state.sources
    .slice(0, 20)
    .map((s, i) => `[${i + 1}] ${s.title || s.domain} (${s.url})\n${truncateToTokens(s.content, 500)}`)
    .join('\n\n---\n\n');

  const factCheckSummary = state.factChecks
    .map((fc) => `• ${fc.claim} [${fc.confidence} confidence, ${fc.verified ? 'verified' : 'unverified'}]`)
    .join('\n');

  const subQuestions = state.plan?.subQuestions || [];

  const prompt = `You are an expert research writer. Create a comprehensive, well-structured research report.

RESEARCH TOPIC: "${state.query}"

SUB-QUESTIONS TO ADDRESS:
${subQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

VERIFIED FACTS (from fact-check):
${factCheckSummary}

SOURCES (use [N] citation notation):
${truncateToTokens(sourceContext, 10000)}

Write a professional, in-depth research report. Requirements:
- Create 5-7 well-titled sections that each address different angles
- Each section should be 200-400 words
- Use specific facts, statistics, and examples from the sources
- Include [N] citations in-text where appropriate (N = source number above)
- Balance multiple perspectives (not just one viewpoint)
- Include a section on limitations/what remains unknown
- Be objective and analytical, not just descriptive

Respond with ONLY this JSON:
{
  "title": "Research Report: [Topic]",
  "summary": "2-3 sentence executive summary of key findings",
  "sections": [
    {
      "heading": "Section Title",
      "content": "Section content with [1] citation markers...",
      "citationIndices": [1, 2, 3]
    }
  ]
}`;

  const raw = await geminiService.generateJSON<{
    title: string;
    summary: string;
    sections: Array<{ heading: string; content: string; citationIndices: number[] }>;
  }>(prompt);

  // Build fully resolved citations
  const sections: ReportSection[] = raw.sections.map((s) => {
    const citations: Citation[] = (s.citationIndices || [])
      .filter((idx) => idx >= 1 && idx <= state.sources.length)
      .map((idx) => {
        const source = state.sources[idx - 1];
        return {
          index: idx,
          url: source.url,
          title: source.title,
          domain: source.domain,
        };
      });

    return {
      heading: s.heading,
      content: s.content,
      citations,
    };
  });

  const overallConfidence =
    state.factChecks.length > 0
      ? Math.round(
          state.factChecks.reduce((sum, fc) => {
            const score = fc.confidence === 'high' ? 90 : fc.confidence === 'medium' ? 65 : 40;
            return sum + score;
          }, 0) / state.factChecks.length
        )
      : 70;

  const report: ResearchReport = {
    title: raw.title,
    summary: raw.summary,
    sections,
    factChecks: state.factChecks,
    sources: state.sources.slice(0, 25),
    totalSourcesAnalyzed: state.sources.length,
    researchDuration: Date.now() - startTime,
    confidenceScore: overallConfidence,
    generatedAt: new Date().toISOString(),
  };

  logger.info(`[Synthesizer] Report generated: ${sections.length} sections, ${report.confidenceScore}% confidence`);

  sseRegistry.broadcast(state.sessionId, 'report_ready', {
    title: report.title,
    sectionCount: sections.length,
    sourceCount: report.sources.length,
    confidenceScore: report.confidenceScore,
    message: `Report complete: ${sections.length} sections, ${report.totalSourcesAnalyzed} sources analyzed`,
  });

  return { report };
};
