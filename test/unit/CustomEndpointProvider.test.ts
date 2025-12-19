import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomEndpointProvider } from '../../src/services/providers/CustomEndpointProvider';
import type { ClassificationResult } from '../../src/types/classification';

// Mock requestUrl from obsidian
vi.mock('obsidian', () => ({
    requestUrl: vi.fn()
}));

import { requestUrl } from 'obsidian';
const mockRequestUrl = vi.mocked(requestUrl);

describe('CustomEndpointProvider', () => {
    let provider: CustomEndpointProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        provider = new CustomEndpointProvider('http://localhost:11434/api/chat', 'ollama');
    });

    describe('name', () => {
        it('should return provider name', () => {
            expect(provider.name).toBe('Custom Endpoint');
        });
    });

    describe('authenticate', () => {
        it('should return true for valid endpoint URL', async () => {
            const result = await provider.authenticate('http://localhost:11434');
            expect(result).toBe(true);
        });

        it('should return false for invalid endpoint URL', async () => {
            const result = await provider.authenticate('');
            expect(result).toBe(false);
        });
    });

    describe('isAvailable', () => {
        it('should return true when endpoint URL is set', () => {
            expect(provider.isAvailable()).toBe(true);
        });

        it('should return false when endpoint URL is empty', () => {
            const emptyProvider = new CustomEndpointProvider('', 'ollama');
            expect(emptyProvider.isAvailable()).toBe(false);
        });
    });

    describe('classify', () => {
        it('should classify text using custom endpoint (Ollama format)', async () => {
            const mockResponse = {
                message: {
                    content: '{"category":"saas","tags":["app","productivity"]}'
                }
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

        it('should classify text using custom endpoint (OpenAI format)', async () => {
            const provider = new CustomEndpointProvider('http://localhost:1234/v1/chat/completions', 'openai');
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
        });

        it('should handle API errors', async () => {
            mockRequestUrl.mockResolvedValue({
                status: 500,
                json: { error: 'Server error' },
                statusText: 'Internal Server Error'
            });

            await expect(provider.classify('test')).rejects.toThrow();
        });
    });
});

