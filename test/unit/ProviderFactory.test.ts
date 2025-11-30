import { describe, it, expect, vi } from 'vitest';
import { ProviderFactory } from '../../src/services/providers/ProviderFactory';
import { AnthropicProvider } from '../../src/services/providers/AnthropicProvider';
import { OpenAIProvider } from '../../src/services/providers/OpenAIProvider';

describe('ProviderFactory', () => {
    describe('createProvider', () => {
        it('should create AnthropicProvider for anthropic type', () => {
            const provider = ProviderFactory.createProvider('anthropic', 'sk-test-key');
            expect(provider).toBeInstanceOf(AnthropicProvider);
            expect(provider.name).toBe('Anthropic');
        });

        it('should create OpenAIProvider for openai type', () => {
            const provider = ProviderFactory.createProvider('openai', 'sk-test-key');
            expect(provider).toBeInstanceOf(OpenAIProvider);
            expect(provider.name).toBe('OpenAI');
        });

        it('should create GeminiProvider for gemini type', () => {
            const provider = ProviderFactory.createProvider('gemini', 'test-key');
            expect(provider.name).toBe('Gemini');
        });

        it('should create GroqProvider for groq type', () => {
            const provider = ProviderFactory.createProvider('groq', 'test-key');
            expect(provider.name).toBe('Groq');
        });

        it('should create OpenRouterProvider for openrouter type', () => {
            const provider = ProviderFactory.createProvider('openrouter', 'test-key', {
                openRouterModel: 'openai/gpt-4o-mini'
            });
            expect(provider.name).toBe('OpenRouter');
        });

        it('should create CustomEndpointProvider for custom type', () => {
            const provider = ProviderFactory.createProvider('custom', '', {
                customEndpointUrl: 'http://localhost:11434/api/chat'
            });
            expect(provider.name).toBe('Custom Endpoint');
        });

        it('should throw error for custom provider without endpoint URL', () => {
            expect(() => {
                ProviderFactory.createProvider('custom', '');
            }).toThrow('Custom endpoint URL is required');
        });

        it('should throw error for none type', () => {
            expect(() => {
                ProviderFactory.createProvider('none', '');
            }).toThrow('Cannot create provider for type "none"');
        });

        it('should throw error for unknown type', () => {
            expect(() => {
                ProviderFactory.createProvider('unknown' as any, 'test-key');
            }).toThrow('Unknown provider type');
        });
    });
});

