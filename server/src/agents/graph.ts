// ============================================================
// LangGraph Research Agent Graph
// ============================================================
import { StateGraph, START, END } from '@langchain/langgraph';
import { ResearchStateAnnotation, ResearchState } from './state.js';
import { plannerNode } from './nodes/planner.js';
import { searcherNode } from './nodes/searcher.js';
import { scraperNode } from './nodes/scraper.js';
import { factCheckerNode } from './nodes/factChecker.js';
import { synthesizerNode } from './nodes/synthesizer.js';
import { pdfService } from '../services/pdf.service.js';
import { sessionStore, sseRegistry } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

// ============================================================
// Node wrappers (to inject startTime into synthesizer)
// ============================================================

const createResearchGraph = (startTime: number) => {
  const graph = new StateGraph(ResearchStateAnnotation)

  // --- Add all nodes ---
  .addNode('planner', plannerNode)
  .addNode('searcher', searcherNode)
  .addNode('scraper', scraperNode)
  .addNode('factChecker', factCheckerNode)
  .addNode('synthesizer', (state: ResearchState) =>
    synthesizerNode(state, startTime)
  )

  // --- Define edges ---

  // Linear: START → planner → searcher → scraper → factChecker
  .addEdge(START, 'planner')
  .addEdge('planner', 'searcher')
  .addEdge('searcher', 'scraper')
  .addEdge('scraper', 'factChecker')

  // CONDITIONAL EDGE: factChecker → (synthesizer | searcher)
  // This is the key agentic loop!
  .addConditionalEdges(
    'factChecker',
    (state: ResearchState) => {
      if (state.needsMoreResearch && state.additionalQueries.length > 0) {
        logger.info(`[Graph] Looping back to searcher (iteration ${state.iterationCount})`);
        return 'searcher'; // Loop back for more research
      }
      return 'synthesizer'; // Proceed to final report
    },
    {
      searcher: 'searcher',
      synthesizer: 'synthesizer',
    }
  )

  // End after synthesis
  .addEdge('synthesizer', END);

  return graph.compile();
};

export const checkCancelled = (sessionId: string) => {
  const session = sessionStore.get(sessionId);
  if (session?.status === 'cancelled') {
    throw new Error('Research cancelled by user');
  }
};

// ============================================================
// Main research runner
// ============================================================
export const runResearchAgent = async (
  sessionId: string,
  query: string,
  depth: 'quick' | 'standard' | 'deep' = 'standard'
): Promise<void> => {
  const startTime = Date.now();

  logger.info(`[Graph] Starting research agent for session ${sessionId}`);

  // Update session status
  sessionStore.update(sessionId, { status: 'planning' });

  const app = createResearchGraph(startTime);

  try {
    const initialState: Partial<ResearchState> = {
      sessionId,
      query,
      depth,
      plan: null,
      searchResults: [],
      sources: [],
      factChecks: [],
      iterationCount: 0,
      needsMoreResearch: false,
      additionalQueries: [],
      report: null,
      messages: [],
    };

    // Run the graph — LangGraph handles state transitions automatically
    const finalState = await app.invoke(initialState, {
      recursionLimit: 25, // Safety limit
    });

    checkCancelled(sessionId);

    // Generate PDF after report is ready
    if (finalState.report) {
      sessionStore.update(sessionId, { status: 'generating_pdf' });
      sseRegistry.broadcast(sessionId, 'pdf_generating', {
        message: 'Generating PDF report...',
      });

      try {
        const pdfPath = await pdfService.generate(finalState.report, sessionId);
        
        checkCancelled(sessionId);

        sessionStore.update(sessionId, {
          status: 'completed',
          report: finalState.report,
          pdfPath,
        });

        sseRegistry.broadcast(sessionId, 'pdf_ready', {
          downloadUrl: `/api/pdf/${sessionId}`,
          message: 'PDF ready for download!',
        });
      } catch (pdfErr) {
        if ((pdfErr as Error).message === 'Research cancelled by user') throw pdfErr;
        // PDF failure shouldn't fail the whole research
        logger.error(`PDF generation failed: ${(pdfErr as Error).message}`);
        sessionStore.update(sessionId, {
          status: 'completed',
          report: finalState.report,
        });
      }
    }

    logger.info(`[Graph] Research complete in ${(Date.now() - startTime) / 1000}s`);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'Research cancelled by user') {
      logger.info(`[Graph] Research cancelled for session ${sessionId}`);
      return;
    }

    logger.error(`[Graph] Research failed: ${error.message}`);
    sessionStore.update(sessionId, {
      status: 'error',
      error: error.message,
    });
    sseRegistry.broadcast(sessionId, 'error', {
      message: error.message,
    });
  }
};
