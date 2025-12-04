import type { ILLMProvider } from '../../types/llm-provider';
import type { ClassificationResult } from '../../types/classification';
import { requestUrl } from 'obsidian';
import { extractAndRepairJSON } from '../../utils/jsonRepair';
import { Logger } from '../../utils/logger';

/**
 * OpenRouter Provider - Multiple models via OpenRouter API
 */
export class OpenRouterProvider implements ILLMProvider {
    name = 'OpenRouter';
    private apiKey: string;
    private model: string;
    private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        this.model = model || 'openai/gpt-4o-mini';
    }

    authenticate(apiKey: string): Promise<boolean> {
        return Promise.resolve(apiKey.trim().length > 0);
    }

    isAvailable(): boolean {
        return this.apiKey.trim().length > 0;
    }

    async classify(text: string): Promise<ClassificationResult> {
        if (!this.isAvailable()) {
            throw new Error('OpenRouter provider is not available');
        }

        const prompt = this.constructPrompt(text);

        try {
            const response = await requestUrl({
                url: this.baseUrl,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/FallingWithStyle/obsidian-ideatr',
                    'X-Title': 'Ideatr'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 256,
                    temperature: 0.1
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
                const errorData = (typeof response.json === 'function' ? await response.json() : response.json) || {};
                throw new Error(`OpenRouter API error: ${errorData.error || response.statusText || 'Request failed'}`);
            }

            const data = typeof response.json === 'function' ? await response.json() : response.json;
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('No content in OpenRouter response');
            }

            return this.parseResponse(content);
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.message.includes('Rate limit')) {
                    throw error;
                }
                if (error.message.includes('Invalid API key')) {
                    throw error;
                }
                throw new Error(`OpenRouter API error: ${error.message}`);
            }
            throw new Error('OpenRouter API error: Request failed');
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
            const parsed = JSON.parse(repaired);

            return {
                category: this.validateCategory(parsed.category) as import('../../types/classification').IdeaCategory,
                tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
                confidence: parsed.confidence || 0.8
            };
        } catch (error) {
            Logger.warn('Failed to parse OpenRouter response:', content, error);
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

