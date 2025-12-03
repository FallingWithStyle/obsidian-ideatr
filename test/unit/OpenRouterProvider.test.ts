import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenRouterProvider } from '../../src/services/providers/OpenRouterProvider';
import type { ClassificationResult } from '../../src/types/classification';

// Mock requestUrl from obsidian
vi.mock('obsidian', () => ({
    requestUrl: vi.fn()
}));

import { requestUrl } from 'obsidian';
const mockRequestUrl = vi.mocked(requestUrl);

describe('OpenRouterProvider', () => {
    let provider: OpenRouterProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        provider = new OpenRouterProvider('test-api-key', 'openai/gpt-4o-mini');
    });

    describe('name', () => {
        it('should return provider name', () => {
            expect(provider.name).toBe('OpenRouter');
        });
    });

    describe('authenticate', () => {
        it('should return true for valid API key', async () => {
            const result = await provider.authenticate('valid-api-key');
            expect(result).toBe(true);
        });

        it('should return false for invalid API key', async () => {
            const result = await provider.authenticate('');
            expect(result).toBe(false);
        });
    });

    describe('isAvailable', () => {
        it('should return true when API key is set', () => {
            expect(provider.isAvailable()).toBe(true);
        });

        it('should return false when API key is empty', () => {
            const emptyProvider = new OpenRouterProvider('', 'openai/gpt-4o-mini');
            expect(emptyProvider.isAvailable()).toBe(false);
        });
    });

    describe('classify', () => {
        it('should classify text using OpenRouter API', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: '{"category":"saas","tags":["app","productivity"]}'
                    }
                }]
            };

            mockRequestUrl.mockResolvedValue({
                status: 200,
                json: mockResponse,
                statusText: 'OK'
            });

            const result = await provider.classify('A productivity app');

            expect(result.category).toBe('saas');
            expect(result.tags).toContain('app');
            expect(result.tags).toContain('productivity');
            expect(mockRequestUrl).toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            mockRequestUrl.mockResolvedValue({
                status: 401,
                json: { error: 'Invalid API key' },
                statusText: 'Unauthorized'
            });

            await expect(provider.classify('test')).rejects.toThrow();
        });

        it('should handle rate limiting', async () => {
            mockRequestUrl.mockResolvedValue({
                status: 429,
                json: { error: 'Rate limit exceeded' },
                statusText: 'Too Many Requests'
            });

            await expect(provider.classify('test')).rejects.toThrow('Rate limit exceeded');
        });
    });
});

