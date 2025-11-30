import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiProvider } from '../../src/services/providers/GeminiProvider';
import type { ClassificationResult } from '../../src/types/classification';

// Mock Google Generative AI SDK
const mocks = vi.hoisted(() => {
    const mockGenerateContent = vi.fn();
    const mockGeminiInstance = {
        getGenerativeModel: vi.fn(() => ({
            generateContent: mockGenerateContent
        }))
    };
    const MockGoogleGenerativeAI = vi.fn((config: any) => {
        return mockGeminiInstance;
    });
    return {
        GoogleGenerativeAI: MockGoogleGenerativeAI,
        mockGeminiInstance,
        mockGenerateContent
    };
});

vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: mocks.GoogleGenerativeAI
}));

describe('GeminiProvider', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.mockGenerateContent.mockClear();
        provider = new GeminiProvider('test-api-key');
    });

    describe('name', () => {
        it('should return provider name', () => {
            expect(provider.name).toBe('Gemini');
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
            const emptyProvider = new GeminiProvider('');
            expect(emptyProvider.isAvailable()).toBe(false);
        });
    });

    describe('classify', () => {
        it('should classify text using Gemini API', async () => {
            const mockResponse = {
                response: {
                    text: () => '{"category":"saas","tags":["app","productivity"]}'
                }
            };

            mocks.mockGenerateContent.mockResolvedValue(mockResponse as any);

            const result = await provider.classify('A productivity app');

            expect(result.category).toBe('saas');
            expect(result.tags).toContain('app');
            expect(result.tags).toContain('productivity');
            expect(mocks.mockGenerateContent).toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            mocks.mockGenerateContent.mockRejectedValue(
                new Error('Invalid API key')
            );

            await expect(provider.classify('test')).rejects.toThrow();
        });

        it('should handle rate limiting', async () => {
            const rateLimitError: any = new Error('Rate limit exceeded');
            rateLimitError.status = 429;
            mocks.mockGenerateContent.mockRejectedValue(rateLimitError);

            await expect(provider.classify('test')).rejects.toThrow('Rate limit exceeded');
        });
    });
});

