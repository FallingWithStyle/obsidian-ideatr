import type { ClassificationResult } from './classification';

/**
 * Cloud LLM Provider interface
 */
export interface ILLMProvider {
    /**
     * Provider name (e.g., "Anthropic", "OpenAI")
     */
    name: string;

    /**
     * Authenticate with API key
     */
    authenticate(apiKey: string): Promise<boolean>;

    /**
     * Classify idea text
     */
    classify(text: string): Promise<ClassificationResult>;

    /**
     * Check if provider is available (has valid API key)
     */
    isAvailable(): boolean;
}

/**
 * Cloud provider type
 */
export type CloudProviderType = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'openrouter' | 'custom' | 'none';

/**
 * Provider-specific settings
 */
export interface ProviderSettings {
    openRouterModel?: string;
    customEndpointUrl?: string;
}

