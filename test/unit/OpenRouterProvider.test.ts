import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenRouterProvider } from '../../src/services/providers/OpenRouterProvider';
import type { ClassificationResult } from '../../src/types/classification';

// Mock fetch
global.fetch = vi.fn();

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

            vi.mocked(global.fetch).mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            } as Response);

            const result = await provider.classify('A productivity app');

            expect(result.category).toBe('saas');
            expect(result.tags).toContain('app');
            expect(result.tags).toContain('productivity');
            expect(global.fetch).toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            vi.mocked(global.fetch).mockResolvedValue({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Invalid API key' })
            } as Response);

            await expect(provider.classify('test')).rejects.toThrow();
        });

        it('should handle rate limiting', async () => {
            vi.mocked(global.fetch).mockResolvedValue({
                ok: false,
                status: 429,
                json: async () => ({ error: 'Rate limit exceeded' })
            } as Response);

            await expect(provider.classify('test')).rejects.toThrow('Rate limit exceeded');
        });
    });
});

