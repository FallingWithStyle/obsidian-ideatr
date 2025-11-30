import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ILLMProvider } from '../../types/llm-provider';
import type { ClassificationResult } from '../../types/classification';

/**
 * Gemini Provider - Gemini 1.5 Flash
 */
export class GeminiProvider implements ILLMProvider {
    name = 'Gemini';
    private client: GoogleGenerativeAI | null = null;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private getClient(): GoogleGenerativeAI {
        if (!this.client && this.apiKey && this.apiKey.trim().length > 0) {
            try {
                this.client = new GoogleGenerativeAI(this.apiKey);
            } catch (error) {
                console.warn('Failed to initialize Gemini client:', error);
                throw new Error('Failed to initialize Gemini client');
            }
        }
        if (!this.client) {
            throw new Error('Gemini client not initialized');
        }
        return this.client;
    }

    async authenticate(apiKey: string): Promise<boolean> {
        return apiKey.trim().length > 0;
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
            const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
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
            console.warn('Failed to parse Gemini response:', content, error);
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

