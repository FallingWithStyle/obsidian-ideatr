import OpenAI from 'openai';
import type { ILLMProvider } from '../../types/llm-provider';
import type { ClassificationResult, IdeaCategory } from '../../types/classification';

/**
 * OpenAI Provider - GPT-4o Mini
 */
export class OpenAIProvider implements ILLMProvider {
    name = 'OpenAI';
    private client: OpenAI | null = null;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private getClient(): OpenAI {
        if (!this.client && this.apiKey && this.apiKey.trim().length > 0) {
            try {
                this.client = new OpenAI({ apiKey: this.apiKey });
            } catch (error) {
                console.warn('Failed to initialize OpenAI client:', error);
                throw new Error('Failed to initialize OpenAI client');
            }
        }
        if (!this.client) {
            throw new Error('OpenAI client not initialized');
        }
        return this.client;
    }

    async authenticate(apiKey: string): Promise<boolean> {
        // Basic validation: OpenAI API keys start with 'sk-'
        return apiKey.trim().length > 0 && apiKey.startsWith('sk-');
    }

    isAvailable(): boolean {
        return this.apiKey.trim().length > 0;
    }

    async classify(text: string): Promise<ClassificationResult> {
        if (!this.isAvailable()) {
            throw new Error('OpenAI provider is not available');
        }

        const prompt = this.constructPrompt(text);

        try {
            const client = this.getClient();
            const response = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 256,
                temperature: 0.1
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content in OpenAI response');
            }

            return this.parseResponse(content);
        } catch (error: unknown) {
            // Handle rate limiting
            const err = error as any;
            if (err?.status === 429 || err?.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            // Handle invalid API key
            if (err?.status === 401 || err?.response?.status === 401) {
                throw new Error('Invalid API key. Please check your OpenAI API key.');
            }
            // Check error type without accessing .message
            if (error instanceof Error) {
                // Only access message if it's a standard Error
                const message = error.message || 'Unknown error';
                throw new Error(`OpenAI API error: ${message}`);
            }
            // For non-Error objects, use a generic message
            throw new Error('OpenAI API error: Request failed');
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
            console.warn('Failed to parse OpenAI response:', content, error);
            return {
                category: '',
                tags: [],
                confidence: 0
            };
        }
    }

    private validateCategory(category: string): IdeaCategory {
        const validCategories: IdeaCategory[] = [
            'game', 'saas', 'tool', 'story', 'mechanic',
            'hardware', 'ip', 'brand', 'ux', 'personal'
        ];

        const normalized = category?.toLowerCase().trim();
        return (validCategories.includes(normalized as IdeaCategory)) ? (normalized as IdeaCategory) : '';
    }
}

