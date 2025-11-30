import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderAdapter } from '../../src/services/providers/ProviderAdapter';
import type { ILLMProvider, ClassificationResult } from '../../types/llm-provider';

describe('ProviderAdapter', () => {
    let mockProvider: ILLMProvider;
    let adapter: ProviderAdapter;

    beforeEach(() => {
        mockProvider = {
            name: 'Test Provider',
            authenticate: vi.fn().mockResolvedValue(true),
            classify: vi.fn().mockResolvedValue({
                category: 'saas',
                tags: ['test'],
                confidence: 0.8
            }),
            isAvailable: vi.fn().mockReturnValue(true)
        };
        adapter = new ProviderAdapter(mockProvider);
    });

    describe('classify', () => {
        it('should delegate to provider classify', async () => {
            const result = await adapter.classify('test idea');

            expect(mockProvider.classify).toHaveBeenCalledWith('test idea');
            expect(result.category).toBe('saas');
            expect(result.tags).toContain('test');
        });
    });

    describe('isAvailable', () => {
        it('should delegate to provider isAvailable', () => {
            expect(adapter.isAvailable()).toBe(true);
            expect(mockProvider.isAvailable).toHaveBeenCalled();
        });

        it('should return false when provider is not available', () => {
            vi.mocked(mockProvider.isAvailable).mockReturnValue(false);
            expect(adapter.isAvailable()).toBe(false);
        });
    });

    describe('getProvider', () => {
        it('should return the underlying provider', () => {
            expect(adapter.getProvider()).toBe(mockProvider);
        });
    });
});

