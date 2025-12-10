import type { ILLMService, ClassificationResult } from '../../types/classification';
import type { ILLMProvider } from '../../types/llm-provider';
import { requestUrl } from 'obsidian';
import { Logger } from '../../utils/logger';

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
     * Generic completion method - uses provider's chat API
     * Supports OpenAI, Anthropic, Groq, Gemini, and other providers with chat APIs
     */
    async complete(
        prompt: string,
        options?: {
            temperature?: number;
            n_predict?: number;
            stop?: string[];
            grammar?: string;
        }
    ): Promise<string> {
        // Check if provider has complete method (optional - for local LLMs)
        const providerWithComplete = this.provider as ILLMProvider & { complete?: (prompt: string, options?: { temperature?: number; n_predict?: number; stop?: string[]; grammar?: string }) => Promise<string> };
        if (providerWithComplete.complete && typeof providerWithComplete.complete === 'function') {
            return await providerWithComplete.complete(prompt, options);
        }

        // Use provider's chat API for cloud providers
        return await this.completeWithChatAPI(prompt, options);
    }

    /**
     * Complete using provider's chat API
     */
    private async completeWithChatAPI(
        prompt: string,
        options?: {
            temperature?: number;
            n_predict?: number;
            stop?: string[];
            grammar?: string;
        }
    ): Promise<string> {
        if (!this.provider.isAvailable()) {
            throw new Error('Provider is not available');
        }

        const providerName = this.provider.name;
        const maxTokens = options?.n_predict ?? 1000;
        const temperature = options?.temperature ?? 0.7;
        const stop = options?.stop;

        try {
            // Use provider name for reliable identification (works in bundled/minified code)
            const providerAny = this.provider as any;
            
            // OpenAI-compatible providers (OpenAI, Groq)
            if (providerName === 'OpenAI' || providerName === 'Groq') {
                if (providerAny.getClient) {
                    const client = providerAny.getClient();
                    const model = providerAny.model;
                    
                    const response = await client.chat.completions.create({
                        model: model,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        max_tokens: maxTokens,
                        temperature: temperature,
                        stop: stop
                    });

                    const content = response.choices[0]?.message?.content;
                    if (!content) {
                        throw new Error(`No content in ${providerName} response`);
                    }
                    return content;
                }
            }

            // Anthropic
            if (providerName === 'Anthropic') {
                if (providerAny.getClient) {
                    const client = providerAny.getClient();
                    const model = providerAny.model;
                    
                    const response = await client.messages.create({
                        model: model,
                        max_tokens: maxTokens,
                        temperature: temperature,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    });

                    const content = response.content[0];
                    if (content.type !== 'text') {
                        throw new Error('Unexpected response type from Anthropic API');
                    }
                    return content.text;
                }
            }

            // Gemini
            if (providerName === 'Gemini') {
                if (providerAny.getClient) {
                    const client = providerAny.getClient();
                    const model = providerAny.model;
                    
                    const genModel = client.getGenerativeModel({ 
                        model: model,
                        generationConfig: {
                            maxOutputTokens: maxTokens,
                            temperature: temperature,
                            stopSequences: stop
                        }
                    });
                    const result = await genModel.generateContent(prompt);
                    const response = result.response;
                    return response.text();
                }
            }

            // CustomEndpointProvider
            if (providerName === 'Custom Endpoint') {
                const endpointUrl = providerAny.endpointUrl;
                const format = providerAny.format; // 'ollama' or 'openai'

                let requestBody: Record<string, unknown>;
                let responsePath: string;

                if (format === 'ollama') {
                    requestBody = {
                        model: 'llama3.2',
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        stream: false,
                        options: {
                            temperature: temperature,
                            num_predict: maxTokens,
                            stop: stop
                        }
                    };
                    responsePath = 'message.content';
                } else {
                    // OpenAI-compatible format
                    requestBody = {
                        model: 'gpt-4o-mini',
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        max_tokens: maxTokens,
                        temperature: temperature,
                        stop: stop
                    };
                    responsePath = 'choices[0].message.content';
                }

                const response = await requestUrl({
                    url: endpointUrl,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody),
                    throw: false
                });

                if (response.status < 200 || response.status >= 300) {
                    const errorJson: unknown = typeof response.json === 'function' ? await (response.json as () => Promise<unknown>)() : response.json;
                    const errorData = (errorJson as { error?: string } | null) ?? {};
                    throw new Error(`Custom endpoint error: ${typeof errorData.error === 'string' ? errorData.error : 'Request failed'}`);
                }

                const jsonData: unknown = typeof response.json === 'function' ? await (response.json as () => Promise<unknown>)() : response.json;
                const data = jsonData as {
                    message?: { content?: string };
                    choices?: Array<{ message?: { content?: string } }>;
                };
                
                let content: string;
                if (responsePath === 'message.content') {
                    content = (typeof data.message?.content === 'string' ? data.message.content : '');
                } else {
                    content = (typeof data.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content : '');
                }

                if (!content) {
                    throw new Error('No content in custom endpoint response');
                }
                return content;
            }

            // OpenRouterProvider
            if (providerName === 'OpenRouter') {
                const apiKey = providerAny.apiKey;
                const model = providerAny.model;
                const baseUrl = providerAny.baseUrl || 'https://openrouter.ai/api/v1/chat/completions';

                const response = await requestUrl({
                    url: baseUrl,
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://github.com/FallingWithStyle/obsidian-ideatr',
                        'X-Title': 'Ideatr'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        max_tokens: maxTokens,
                        temperature: temperature,
                        stop: stop
                    }),
                    throw: false
                });

                if (response.status < 200 || response.status >= 300) {
                    if (response.status === 429) {
                        throw new Error('Rate limit exceeded. Please try again later.');
                    }
                    if (response.status === 401) {
                        throw new Error('Invalid API key. Please check your OpenRouter API key.');
                    }
                    const errorJson: unknown = typeof response.json === 'function' ? await (response.json as () => Promise<unknown>)() : response.json;
                    const errorData = (errorJson as { error?: string } | null) ?? {};
                    throw new Error(`OpenRouter API error: ${typeof errorData.error === 'string' ? errorData.error : 'Request failed'}`);
                }

                const jsonData: unknown = typeof response.json === 'function' ? await (response.json as () => Promise<unknown>)() : response.json;
                const data = jsonData as { choices?: Array<{ message?: { content?: string } }> };
                const content = data.choices?.[0]?.message?.content;
                if (!content) {
                    throw new Error('No content in OpenRouter response');
                }
                return content;
            }

            // Check if provider has complete method (for other custom providers)
            if (providerAny.complete && typeof providerAny.complete === 'function') {
                return await providerAny.complete(prompt, options);
            }

            throw new Error(`Provider ${providerName} does not support generic completions. Use local LLM or a provider with complete() method.`);
        } catch (error) {
            Logger.warn(`Completion failed for ${providerName}:`, error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Failed to complete with ${providerName}: ${String(error)}`);
        }
    }

    /**
     * Get the underlying provider (for logging/debugging)
     */
    getProvider(): ILLMProvider {
        return this.provider;
    }
}

