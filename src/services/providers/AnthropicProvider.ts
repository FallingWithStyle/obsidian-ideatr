import Anthropic from '@anthropic-ai/sdk';
import type { ILLMProvider } from '../../types/llm-provider';
import type { ClassificationResult } from '../../types/classification';
import { extractAndRepairJSON } from '../../utils/jsonRepair';
import { Logger } from '../../utils/logger';

/**
 * Anthropic Provider - Supports multiple Claude models
 */
export class AnthropicProvider implements ILLMProvider {
    name = 'Anthropic';
    private client: Anthropic | null = null;
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        this.model = model ?? 'claude-3-5-haiku-20241022';
    }

    private getClient(): Anthropic {
        if (!this.client && this.apiKey && this.apiKey.trim().length > 0) {
            try {
                this.client = new Anthropic({ 
                    apiKey: this.apiKey,
                    dangerouslyAllowBrowser: true // Required for Obsidian's Electron environment
                });
            } catch (error) {
                Logger.warn('Failed to initialize Anthropic client:', error);
                throw new Error('Failed to initialize Anthropic client');
            }
        }
        if (!this.client) {
            throw new Error('Anthropic client not initialized');
        }
        return this.client;
    }

    authenticate(apiKey: string): Promise<boolean> {
        // Basic validation: Anthropic API keys start with 'sk-'
        return Promise.resolve(apiKey.trim().length > 0 && apiKey.startsWith('sk-'));
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
                model: this.model,
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
            // Error may have status property from API responses
            const err = error as { status?: number; response?: { status?: number }; message?: string; name?: string };
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
        return `Classify this idea into one category and suggest 2-4 relevant tags.

Idea: "${text}"

Categories: game, saas, tool, story, mechanic, hardware, ip, brand, ux, personal

Rules:
- Choose the single best category
- Tags should be specific and relevant (2-4 tags)
- Use lowercase for category and tags

Example response:
{
  "category": "game",
  "tags": ["rpg", "fantasy", "multiplayer"]
}

Response:`;
    }

    private parseResponse(content: string): ClassificationResult {
        try {
            // Extract and repair JSON from response
            const repaired = extractAndRepairJSON(content, false);
            const parsed = JSON.parse(repaired) as {
                category?: string;
                tags?: unknown[];
                confidence?: number;
            };

            return {
                category: this.validateCategory(typeof parsed.category === 'string' ? parsed.category : '') as import('../../types/classification').IdeaCategory,
                tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]).slice(0, 5) : [],
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8
            };
        } catch (error) {
            Logger.warn('Failed to parse Anthropic response:', content, error);
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

