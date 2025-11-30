import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIProvider } from '../../src/services/providers/OpenAIProvider';
import type { ClassificationResult } from '../../src/types/classification';

// Mock OpenAI SDK - hoisted
const mocks = vi.hoisted(() => {
    const mockCompletionsCreate = vi.fn();
    const mockOpenAIInstance = {
        chat: {
            completions: {
                create: mockCompletionsCreate
            }
        }
    };
    // Use a class-based mock for proper constructor support
    class MockOpenAI {
        constructor(config: any) {
            return mockOpenAIInstance;
        }
    }
    return {
        default: MockOpenAI,
        mockOpenAIInstance,
        mockCompletionsCreate
    };
});

vi.mock('openai', () => ({
    default: mocks.default
}));

describe('OpenAIProvider', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.mockCompletionsCreate.mockClear();
        provider = new OpenAIProvider('test-api-key');
    });

    describe('name', () => {
        it('should return provider name', () => {
            expect(provider.name).toBe('OpenAI');
        });
    });

    describe('authenticate', () => {
        it('should return true for valid API key', async () => {
            // Valid API key format (starts with sk-)
            const result = await provider.authenticate('sk-test-key');
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
            const emptyProvider = new OpenAIProvider('');
            expect(emptyProvider.isAvailable()).toBe(false);
        });
    });

    describe('classify', () => {
        it('should classify text using GPT API', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: '{"category":"saas","tags":["app","productivity"]}'
                    }
                }]
            };

            mocks.mockCompletionsCreate.mockResolvedValue(mockResponse as any);

            const result = await provider.classify('A productivity app');

            expect(result.category).toBe('saas');
            expect(result.tags).toContain('app');
            expect(result.tags).toContain('productivity');
            expect(mocks.mockCompletionsCreate).toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            mocks.mockCompletionsCreate.mockRejectedValue(
                new Error('Invalid API key')
            );

            await expect(provider.classify('test')).rejects.toThrow();
        });

        it('should handle rate limiting', async () => {
            const rateLimitError: any = new Error('Rate limit exceeded');
            rateLimitError.status = 429;
            mocks.mockCompletionsCreate.mockRejectedValue(rateLimitError);

            await expect(provider.classify('test')).rejects.toThrow('Rate limit exceeded');
        });
    });
});

