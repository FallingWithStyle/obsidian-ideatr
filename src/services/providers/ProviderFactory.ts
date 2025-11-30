import type { ILLMProvider, CloudProviderType, ProviderSettings } from '../../types/llm-provider';
import { AnthropicProvider } from './AnthropicProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';
import { OpenRouterProvider } from './OpenRouterProvider';
import { CustomEndpointProvider } from './CustomEndpointProvider';

/**
 * Provider Factory - Creates LLM provider instances
 */
export class ProviderFactory {
    /**
     * Create a provider instance based on type
     */
    static createProvider(
        providerType: CloudProviderType,
        apiKey: string,
        settings?: ProviderSettings
    ): ILLMProvider {
        switch (providerType) {
            case 'anthropic':
                return new AnthropicProvider(apiKey);
            case 'openai':
                return new OpenAIProvider(apiKey);
            case 'gemini':
                return new GeminiProvider(apiKey);
            case 'groq':
                return new GroqProvider(apiKey);
            case 'openrouter':
                return new OpenRouterProvider(apiKey, settings?.openRouterModel);
            case 'custom':
                if (!settings?.customEndpointUrl) {
                    throw new Error('Custom endpoint URL is required for custom provider');
                }
                // Detect format from URL or default to ollama
                const format = settings.customEndpointUrl.includes('/v1/chat/completions') ? 'openai' : 'ollama';
                return new CustomEndpointProvider(settings.customEndpointUrl, format);
            case 'none':
                throw new Error('Cannot create provider for type "none"');
            default:
                throw new Error(`Unknown provider type: ${providerType}`);
        }
    }
}

