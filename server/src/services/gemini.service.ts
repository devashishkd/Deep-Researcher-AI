// ============================================================
// Gemini LLM Service using @langchain/google-genai
// ============================================================
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const getModel = (modelName = 'gemini-2.5-flash') => {
  return new ChatGoogleGenerativeAI({
    modelName: modelName,
    temperature: 0.7,
    maxOutputTokens: 8192,
    safetySettings,
    apiKey: process.env.GEMINI_API_KEY,
  });
};

export const geminiService = {
  /**
   * Generate text using Gemini with retry logic
   */
  generate: async (prompt: string, modelName?: string): Promise<string> => {
    const model = getModel(modelName);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.debug(`Gemini generate attempt ${attempt}`);
        const response = await model.invoke(prompt);
        if (!response.content) throw new Error('Empty response from Gemini');
        return response.content as string;
      } catch (err: unknown) {
        lastError = err as Error;
        logger.warn(`Gemini attempt ${attempt} failed: ${(err as Error).message}`);
        if (attempt < 3) {
          // Exponential backoff: 2s, 4s
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }

    throw new Error(`Gemini failed after 3 attempts: ${lastError?.message}`);
  },

  generateJSON: async <T>(prompt: string): Promise<T> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const raw = await geminiService.generate(
          prompt + '\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown fences, no explanation.'
        );
        
        // Clean up markdown fences
        let cleaned = raw
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
          
        // Fix common LLM JSON issue: trailing commas
        cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

        try {
          return JSON.parse(cleaned) as T;
        } catch {
          // Try to extract JSON from the response if it's mixed with text
          const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as T;
          }
          throw new Error(`No JSON object/array found in response: ${cleaned.slice(0, 200)}...`);
        }
      } catch (err: unknown) {
        lastError = err as Error;
        logger.warn(`Gemini JSON parse attempt ${attempt} failed: ${lastError.message}`);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }
    throw new Error(`Failed to parse Gemini JSON response after 3 attempts: ${lastError?.message}`);
  },
};
