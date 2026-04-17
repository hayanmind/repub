/**
 * AI Configuration Factory
 *
 * Reads API keys from environment variables and determines whether to run
 * in mock mode (no keys present) or real mode (at least one key provided).
 */

import type { AiConfig } from './types.js';

/**
 * Create an AiConfig by reading well-known environment variable names.
 *
 * If `env` is omitted, `process.env` is used.  When none of the API key
 * variables are set the config automatically falls back to mock mode.
 *
 * Recognised variables:
 * - GEMINI_API_KEY      (Google Gemini — preferred LLM provider)
 * - OPENAI_API_KEY      (OpenAI — fallback LLM provider)
 * - ANTHROPIC_API_KEY
 * - ELEVENLABS_API_KEY
 * - STABILITY_API_KEY
 * - USE_MOCK  (set to "true" / "1" to force mock mode even when keys exist)
 */
export function createAiConfig(
  env: Record<string, string | undefined> = process.env,
): AiConfig {
  const geminiApiKey = env.GEMINI_API_KEY?.trim() || undefined;
  const openaiApiKey = env.OPENAI_API_KEY?.trim() || undefined;
  const anthropicApiKey = env.ANTHROPIC_API_KEY?.trim() || undefined;
  const elevenlabsApiKey = env.ELEVENLABS_API_KEY?.trim() || undefined;
  const stabilityApiKey = env.STABILITY_API_KEY?.trim() || undefined;

  const forceMock =
    env.USE_MOCK === 'true' || env.USE_MOCK === '1';

  const hasAnyKey = !!(
    geminiApiKey ||
    openaiApiKey ||
    anthropicApiKey ||
    elevenlabsApiKey ||
    stabilityApiKey
  );

  return {
    geminiApiKey,
    openaiApiKey,
    anthropicApiKey,
    elevenlabsApiKey,
    stabilityApiKey,
    useMock: forceMock || !hasAnyKey,
  };
}

/**
 * Return `true` when the given config will use mock implementations.
 */
export function isMockMode(config: AiConfig): boolean {
  return config.useMock;
}

/**
 * Create an OpenAI-compatible client configured for the best available LLM.
 *
 * Priority: Gemini (via OpenAI-compat endpoint) > OpenAI.
 * Returns the client instance and the model name to use.
 */
export async function createLlmClient(
  config: AiConfig,
): Promise<{ client: InstanceType<typeof import('openai').default>; model: string }> {
  const { default: OpenAI } = await import('openai');

  if (config.geminiApiKey) {
    return {
      client: new OpenAI({
        apiKey: config.geminiApiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      }),
      model: 'gemini-2.0-flash',
    };
  }

  return {
    client: new OpenAI({ apiKey: config.openaiApiKey }),
    model: 'gpt-4',
  };
}
