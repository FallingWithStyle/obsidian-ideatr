import type { ILLMProvider } from '../../types/llm-provider';
import type { ClassificationResult } from '../../types/classification';
import { requestUrl } from 'obsidian';
import { extractAndRepairJSON } from '../../utils/jsonRepair';
import { Logger } from '../../utils/logger';

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

    authenticate(endpointUrl: string): Promise<boolean> {
        // Basic URL validation
        try {
            new URL(endpointUrl);
            return Promise.resolve(endpointUrl.trim().length > 0);
        } catch {
            return Promise.resolve(false);
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
            let requestBody: Record<string, unknown>;
            let responsePath: string;

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
                responsePath = 'message.content';
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
                responsePath = 'choices[0].message.content';
            }

            const response = await requestUrl({
                url: this.endpointUrl,
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
            
            // Extract content based on format (responsePath was determined earlier)
            let content: string;
            if (responsePath === 'message.content') {
                content = (typeof data.message?.content === 'string' ? data.message.content : '');
            } else {
                content = (typeof data.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content : '');
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
            Logger.warn('Failed to parse custom endpoint response:', content, error);
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

