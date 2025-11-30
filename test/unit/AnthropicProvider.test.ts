import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicProvider } from '../../src/services/providers/AnthropicProvider';
import type { ClassificationResult } from '../../src/types/classification';

// Mock Anthropic SDK - hoisted
const mocks = vi.hoisted(() => {
    const mockMessagesCreate = vi.fn();
    const mockAnthropicInstance = {
        messages: {
            create: mockMessagesCreate
        }
    };
    const MockAnthropic = vi.fn((config: any) => {
        // Return the mock instance when called
        return mockAnthropicInstance;
    });
    return {
        Anthropic: MockAnthropic,
        mockAnthropicInstance,
        mockMessagesCreate
    };
});

vi.mock('@anthropic-ai/sdk', () => ({
    Anthropic: mocks.Anthropic,
    default: mocks.Anthropic
}));

// Mock fetch
global.fetch = vi.fn();

describe('AnthropicProvider', () => {
    let provider: AnthropicProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.mockMessagesCreate.mockClear();
        provider = new AnthropicProvider('test-api-key');
    });

    describe('name', () => {
        it('should return provider name', () => {
            expect(provider.name).toBe('Anthropic');
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
            const emptyProvider = new AnthropicProvider('');
            expect(emptyProvider.isAvailable()).toBe(false);
        });
    });

    describe('classify', () => {
        it('should classify text using Claude API', async () => {
            const mockResponse = {
                content: [{
                    type: 'text',
                    text: '{"category":"saas","tags":["app","productivity"]}'
                }],
                id: 'test-id',
                model: 'claude-3-5-haiku-20241022',
                role: 'assistant',
                stop_reason: 'end_turn',
                stop_sequence: null,
                type: 'message',
                usage: {
                    input_tokens: 10,
                    output_tokens: 20
                }
            };

            mocks.mockMessagesCreate.mockResolvedValue(mockResponse as any);

            const result = await provider.classify('A productivity app');

            expect(result.category).toBe('saas');
            expect(result.tags).toContain('app');
            expect(result.tags).toContain('productivity');
            expect(mocks.mockMessagesCreate).toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            mocks.mockMessagesCreate.mockRejectedValue(
                new Error('Invalid API key')
            );

            await expect(provider.classify('test')).rejects.toThrow();
        });

        it('should handle rate limiting', async () => {
            const rateLimitError: any = new Error('Rate limit exceeded');
            rateLimitError.status = 429;
            mocks.mockMessagesCreate.mockRejectedValue(rateLimitError);

            await expect(provider.classify('test')).rejects.toThrow('Rate limit exceeded');
        });

        it('should handle network errors', async () => {
            mocks.mockMessagesCreate.mockRejectedValue(
                new Error('Network error')
            );

            await expect(provider.classify('test')).rejects.toThrow();
        });
    });
});

