import type { ILLMProvider } from '../../types/llm-provider';
import type { ClassificationResult, IdeaCategory } from '../../types/classification';

/**
 * Custom Endpoint Provider - Self-hosted (Ollama, LM Studio, etc.)
 */
export class CustomEndpointProvider implements ILLMProvider {
    name = 'Custom Endpoint';
    private endpointUrl: string;
    private format: 'ollama' | 'openai';

    constructor(endpointUrl: string, format: 'ollama' | 'openai' = 'ollama') {
        this.endpointUrl = endpointUrl;
        this.format = format;
    }

    async authenticate(endpointUrl: string): Promise<boolean> {
        // Basic URL validation
        try {
            new URL(endpointUrl);
            return endpointUrl.trim().length > 0;
        } catch {
            return false;
        }
    }

    isAvailable(): boolean {
        return this.endpointUrl.trim().length > 0;
    }

    async classify(text: string): Promise<ClassificationResult> {
        if (!this.isAvailable()) {
            throw new Error('Custom endpoint provider is not available');
        }

        const prompt = this.constructPrompt(text);

        try {
            let requestBody: any;
            if (this.format === 'ollama') {
                // Ollama format
                requestBody = {
                    model: 'llama3.2',
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    stream: false
                };
            } else {
                // OpenAI-compatible format
                requestBody = {
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 256,
                    temperature: 0.1
                };
            }

            const response = await fetch(this.endpointUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Custom endpoint error: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            
            // Extract content based on format
            let content: string;
            if (this.format === 'ollama') {
                content = data.message?.content || '';
            } else {
                content = data.choices?.[0]?.message?.content || '';
            }

            if (!content) {
                throw new Error('No content in custom endpoint response');
            }

            return this.parseResponse(content);
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Custom endpoint error: ${error.message}`);
            }
            throw new Error('Custom endpoint error: Request failed');
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
            console.warn('Failed to parse custom endpoint response:', content, error);
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

