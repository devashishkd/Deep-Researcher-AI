// ============================================================
// Input Sanitization & Validation
// ============================================================
import { z } from 'zod';

export const ResearchQuerySchema = z.object({
  query: z
    .string()
    .min(5, 'Query must be at least 5 characters')
    .max(500, 'Query must be under 500 characters')
    .transform((q) => q.trim()),
  depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
  language: z.string().default('en'),
});

export type ResearchQueryInput = z.infer<typeof ResearchQuerySchema>;

/**
 * Sanitize a string to prevent prompt injection attacks.
 * Removes common injection patterns while preserving readability.
 */
export function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control chars
    .replace(/```[\s\S]*?```/g, '[CODE_BLOCK]') // Strip code blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Strip script tags
    .replace(/<[^>]+>/g, '') // Strip HTML tags
    .replace(/\bignore\s+(previous|above|all)\s+instructions?\b/gi, '')
    .replace(/\bsystem\s*:\s*/gi, '')
    .trim();
}

/**
 * Sanitize a URL — ensure it's a valid http/https URL.
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    // Block private/internal IPs
    const hostname = parsed.hostname;
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname === '0.0.0.0'
    ) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Truncate text to a maximum token approximation (1 token ≈ 4 chars)
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '...[truncated]';
}
