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
        }
    ): Promise<string> {
        // Check if provider has complete method (optional)
        if ((this.provider as any).complete && typeof (this.provider as any).complete === 'function') {
            return await (this.provider as any).complete(prompt, options);
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

