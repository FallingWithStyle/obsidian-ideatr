import type { ILLMService, ClassificationResult } from '../../types/classification';
import type { ILLMProvider } from '../../types/llm-provider';

/**
 * ProviderAdapter - Adapts ILLMProvider to ILLMService interface
 */
export class ProviderAdapter implements ILLMService {
    private provider: ILLMProvider;

    constructor(provider: ILLMProvider) {
        this.provider = provider;
    }

    async classify(text: string): Promise<ClassificationResult> {
        return await this.provider.classify(text);
    }

    isAvailable(): boolean {
        return this.provider.isAvailable();
    }

    /**
     * Ensure the LLM service is ready
     * For cloud providers, this just verifies configuration
     */
    ensureReady(): Promise<boolean> {
        if (!this.provider.isAvailable()) {
            return Promise.resolve(false);
        }
        // Cloud providers are typically always ready if configured
        // No additional setup needed
        return Promise.resolve(true);
    }

    /**
     * Generic completion method - delegates to provider if available
     * Note: Most cloud providers don't implement this yet, so this will throw for cloud providers
     * Local LLM (LlamaService) supports this
     */
    async complete?(
        prompt: string,
        options?: {
            temperature?: number;
            n_predict?: number;
            stop?: string[];
            grammar?: string;
        }
    ): Promise<string> {
        // Check if provider has complete method (optional)
        const providerWithComplete = this.provider as ILLMProvider & { complete?: (prompt: string, options?: { temperature?: number; n_predict?: number; stop?: string[]; grammar?: string }) => Promise<string> };
        if (providerWithComplete.complete && typeof providerWithComplete.complete === 'function') {
            return await providerWithComplete.complete(prompt, options);
        }

        throw new Error('Provider does not support generic completions. Use local LLM or a provider with complete() method.');
    }

    /**
     * Get the underlying provider (for logging/debugging)
     */
    getProvider(): ILLMProvider {
        return this.provider;
    }
}

