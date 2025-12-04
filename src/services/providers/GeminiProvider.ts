import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ILLMProvider } from '../../types/llm-provider';
import type { ClassificationResult } from '../../types/classification';
import { extractAndRepairJSON } from '../../utils/jsonRepair';
import { Logger } from '../../utils/logger';

/**
 * Gemini Provider - Supports multiple Gemini models
 */
export class GeminiProvider implements ILLMProvider {
    name = 'Gemini';
    private client: GoogleGenerativeAI | null = null;
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model?: string) {
        this.apiKey = apiKey;
        this.model = model || 'gemini-1.5-flash';
    }

    private getClient(): GoogleGenerativeAI {
        if (!this.client && this.apiKey && this.apiKey.trim().length > 0) {
            try {
                this.client = new GoogleGenerativeAI(this.apiKey);
            } catch (error) {
                Logger.warn('Failed to initialize Gemini client:', error);
                throw new Error('Failed to initialize Gemini client');
            }
        }
        if (!this.client) {
            throw new Error('Gemini client not initialized');
        }
        return this.client;
    }

    authenticate(apiKey: string): Promise<boolean> {
        return Promise.resolve(apiKey.trim().length > 0);
    }

    isAvailable(): boolean {
        return this.apiKey.trim().length > 0;
    }

    async classify(text: string): Promise<ClassificationResult> {
        if (!this.isAvailable()) {
            throw new Error('Gemini provider is not available');
        }

        const prompt = this.constructPrompt(text);

        try {
            const client = this.getClient();
            const genModel = client.getGenerativeModel({ model: this.model });
            const result = await genModel.generateContent(prompt);
            const response = await result.response;
            const content = response.text();

            return this.parseResponse(content);
        } catch (error: unknown) {
            const err = error as any;
            if (err?.status === 429 || err?.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            if (err?.status === 401 || err?.response?.status === 401) {
                throw new Error('Invalid API key. Please check your Gemini API key.');
            }
            if (error instanceof Error) {
                const message = error.message || 'Unknown error';
                throw new Error(`Gemini API error: ${message}`);
            }
            throw new Error('Gemini API error: Request failed');
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
            Logger.warn('Failed to parse Gemini response:', content, error);
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

