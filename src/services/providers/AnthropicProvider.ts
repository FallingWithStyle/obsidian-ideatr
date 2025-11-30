import Anthropic from '@anthropic-ai/sdk';
import type { ILLMProvider } from '../../types/llm-provider';
import type { ClassificationResult } from '../../types/classification';

/**
 * Anthropic Provider - Claude 3.5 Haiku
 */
export class AnthropicProvider implements ILLMProvider {
    name = 'Anthropic';
    private client: Anthropic | null = null;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private getClient(): Anthropic {
        if (!this.client && this.apiKey && this.apiKey.trim().length > 0) {
            try {
                this.client = new Anthropic({ apiKey: this.apiKey });
            } catch (error) {
                console.warn('Failed to initialize Anthropic client:', error);
                throw new Error('Failed to initialize Anthropic client');
            }
        }
        if (!this.client) {
            throw new Error('Anthropic client not initialized');
        }
        return this.client;
    }

    async authenticate(apiKey: string): Promise<boolean> {
        // Basic validation: Anthropic API keys start with 'sk-'
        return apiKey.trim().length > 0 && apiKey.startsWith('sk-');
    }

    isAvailable(): boolean {
        return this.apiKey.trim().length > 0;
    }

    async classify(text: string): Promise<ClassificationResult> {
        if (!this.isAvailable()) {
            throw new Error('Anthropic provider is not available');
        }

        const prompt = this.constructPrompt(text);

        try {
            const client = this.getClient();
            const response = await client.messages.create({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 256,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });

            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Anthropic API');
            }

            return this.parseResponse(content.text);
        } catch (error: unknown) {
            // Handle rate limiting
            const err = error as any;
            if (err?.status === 429 || err?.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            // Handle invalid API key
            if (err?.status === 401 || err?.response?.status === 401) {
                throw new Error('Invalid API key. Please check your Anthropic API key.');
            }
            // Extract error message safely - avoid accessing .message directly as it may trigger SDK internals
            let errorMessage = 'Unknown error';
            try {
                // Try to get error message without triggering getters
                const errorStr = String(error);
                if (errorStr !== '[object Object]') {
                    errorMessage = errorStr;
                } else if (err?.name) {
                    errorMessage = `${err.name}: API request failed`;
                }
            } catch {
                errorMessage = 'Unknown error';
            }
            throw new Error(`Anthropic API error: ${errorMessage}`);
        }
    }

    private constructPrompt(text: string): string {
        return `You are an AI assistant that classifies ideas into categories and tags.
Valid categories: game, saas, tool, story, mechanic, hardware, ip, brand, ux, personal.

Idea: "${text}"

Respond with valid JSON only.
Example:
{
  "category": "game",
  "tags": ["rpg", "fantasy"]
}

Response:`;
    }

    private parseResponse(content: string): ClassificationResult {
        try {
            // Extract JSON from response (may have markdown code blocks)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                category: this.validateCategory(parsed.category),
                tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
                confidence: parsed.confidence || 0.8
            };
        } catch (error) {
            console.warn('Failed to parse Anthropic response:', content, error);
            return {
                category: '',
                tags: [],
                confidence: 0
            };
        }
    }

    private validateCategory(category: string): string {
        const validCategories = [
            'game', 'saas', 'tool', 'story', 'mechanic',
            'hardware', 'ip', 'brand', 'ux', 'personal'
        ];

        const normalized = category?.toLowerCase().trim();
        return validCategories.includes(normalized) ? normalized : '';
    }
}

