import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroqProvider } from '../../src/services/providers/GroqProvider';
import type { ClassificationResult } from '../../src/types/classification';

// Mock Groq SDK - hoisted
const mocks = vi.hoisted(() => {
    const mockChatCompletionsCreate = vi.fn();
    const mockGroqInstance = {
        chat: {
            completions: {
                create: mockChatCompletionsCreate
            }
        }
    };
    const MockGroq = vi.fn((config: any) => {
        return mockGroqInstance;
    });
    return {
        default: MockGroq,
        mockGroqInstance,
        mockChatCompletionsCreate
    };
});

vi.mock('groq-sdk', () => ({
    default: mocks.default
}));

describe('GroqProvider', () => {
    let provider: GroqProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.mockChatCompletionsCreate.mockClear();
        provider = new GroqProvider('test-api-key');
    });

    describe('name', () => {
        it('should return provider name', () => {
            expect(provider.name).toBe('Groq');
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
            const emptyProvider = new GroqProvider('');
            expect(emptyProvider.isAvailable()).toBe(false);
        });
    });

    describe('classify', () => {
        it('should classify text using Groq API', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: '{"category":"saas","tags":["app","productivity"]}'
                    }
                }]
            };

            mocks.mockChatCompletionsCreate.mockResolvedValue(mockResponse as any);

            const result = await provider.classify('A productivity app');

            expect(result.category).toBe('saas');
            expect(result.tags).toContain('app');
            expect(result.tags).toContain('productivity');
            expect(mocks.mockChatCompletionsCreate).toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            mocks.mockChatCompletionsCreate.mockRejectedValue(
                new Error('Invalid API key')
            );

            await expect(provider.classify('test')).rejects.toThrow();
        });

        it('should handle rate limiting', async () => {
            const rateLimitError: any = new Error('Rate limit exceeded');
            rateLimitError.status = 429;
            mocks.mockChatCompletionsCreate.mockRejectedValue(rateLimitError);

            await expect(provider.classify('test')).rejects.toThrow('Rate limit exceeded');
        });
    });
});

