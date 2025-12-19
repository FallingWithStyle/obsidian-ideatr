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
                return new AnthropicProvider(apiKey, settings?.customModel);
            case 'openai':
                return new OpenAIProvider(apiKey, settings?.customModel);
            case 'gemini':
                return new GeminiProvider(apiKey, settings?.customModel);
            case 'groq':
                return new GroqProvider(apiKey, settings?.customModel);
            case 'openrouter':
                return new OpenRouterProvider(apiKey, settings?.openRouterModel);
            case 'custom': {
                if (!settings?.customEndpointUrl) {
                    throw new Error('Custom endpoint URL is required for custom provider');
                }
                // Detect format from URL or default to ollama
                const format = settings.customEndpointUrl.includes('/v1/chat/completions') ? 'openai' : 'ollama';
                return new CustomEndpointProvider(settings.customEndpointUrl, format);
            }
            case 'custom-model': {
                // Custom model: use the specified provider with a custom model
                if (!settings?.customModelProvider || !settings?.customModel) {
                    throw new Error('Custom model provider and model are required for custom-model provider');
                }
                const customProviderType = settings.customModelProvider;
                switch (customProviderType) {
                    case 'anthropic':
                        return new AnthropicProvider(apiKey, settings.customModel);
                    case 'openai':
                        return new OpenAIProvider(apiKey, settings.customModel);
                    case 'gemini':
                        return new GeminiProvider(apiKey, settings.customModel);
                    case 'groq':
                        return new GroqProvider(apiKey, settings.customModel);
                    default:
                        throw new Error(`Unsupported custom model provider: ${String(customProviderType)}`);
                }
            }
            case 'none':
                throw new Error('Cannot create provider for type "none"');
            default:
                throw new Error(`Unknown provider type: ${String(providerType)}`);
        }
    }
}

