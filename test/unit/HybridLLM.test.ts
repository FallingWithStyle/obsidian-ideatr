import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HybridLLM } from '../../src/services/HybridLLM';
import type { ILLMService, ClassificationResult } from '../../types/classification';

describe('HybridLLM', () => {
    let localLLM: ILLMService;
    let cloudLLM: ILLMService | null;
    let hybridLLM: HybridLLM;

    beforeEach(() => {
        localLLM = {
            classify: vi.fn().mockResolvedValue({
                category: 'saas',
                tags: ['local'],
                confidence: 0.8
            }),
            isAvailable: vi.fn().mockReturnValue(true)
        };

        cloudLLM = {
            classify: vi.fn().mockResolvedValue({
                category: 'saas',
                tags: ['cloud'],
                confidence: 0.9
            }),
            isAvailable: vi.fn().mockReturnValue(true)
        };
    });

    describe('routing logic', () => {
        it('should use cloud LLM when preferCloud is true and cloud is available', async () => {
            hybridLLM = new HybridLLM(localLLM, cloudLLM, true);

            const result = await hybridLLM.classify('test idea');

            expect(cloudLLM!.classify).toHaveBeenCalled();
            expect(localLLM.classify).not.toHaveBeenCalled();
            expect(result.tags).toContain('cloud');
        });

        it('should use local LLM when preferCloud is false', async () => {
            hybridLLM = new HybridLLM(localLLM, cloudLLM, false);

            const result = await hybridLLM.classify('test idea');

            expect(localLLM.classify).toHaveBeenCalled();
            expect(cloudLLM!.classify).not.toHaveBeenCalled();
            expect(result.tags).toContain('local');
        });

        it('should use local LLM when cloud is not available', async () => {
            vi.mocked(cloudLLM!.isAvailable).mockReturnValue(false);
            hybridLLM = new HybridLLM(localLLM, cloudLLM, true);

            const result = await hybridLLM.classify('test idea');

            expect(localLLM.classify).toHaveBeenCalled();
            expect(cloudLLM!.classify).not.toHaveBeenCalled();
            expect(result.tags).toContain('local');
        });

        it('should use local LLM when cloud is null', async () => {
            hybridLLM = new HybridLLM(localLLM, null, true);

            const result = await hybridLLM.classify('test idea');

            expect(localLLM.classify).toHaveBeenCalled();
            expect(result.tags).toContain('local');
        });
    });

    describe('fallback mechanism', () => {
        it('should fallback to local on cloud failure', async () => {
            vi.mocked(cloudLLM!.classify).mockRejectedValue(new Error('Cloud API error'));
            hybridLLM = new HybridLLM(localLLM, cloudLLM, true);

            const result = await hybridLLM.classify('test idea');

            expect(cloudLLM!.classify).toHaveBeenCalled();
            expect(localLLM.classify).toHaveBeenCalled();
            expect(result.tags).toContain('local');
        });

        it('should fallback to local on cloud timeout', async () => {
            vi.mocked(cloudLLM!.classify).mockRejectedValue(new Error('Timeout'));
            hybridLLM = new HybridLLM(localLLM, cloudLLM, true);

            const result = await hybridLLM.classify('test idea');

            expect(cloudLLM!.classify).toHaveBeenCalled();
            expect(localLLM.classify).toHaveBeenCalled();
            expect(result.tags).toContain('local');
        });

        it('should fallback to local on cloud rate limit', async () => {
            vi.mocked(cloudLLM!.classify).mockRejectedValue(new Error('Rate limit exceeded'));
            hybridLLM = new HybridLLM(localLLM, cloudLLM, true);

            const result = await hybridLLM.classify('test idea');

            expect(cloudLLM!.classify).toHaveBeenCalled();
            expect(localLLM.classify).toHaveBeenCalled();
            expect(result.tags).toContain('local');
        });
    });

    describe('isAvailable', () => {
        it('should return true if local is available', () => {
            hybridLLM = new HybridLLM(localLLM, null, false);
            expect(hybridLLM.isAvailable()).toBe(true);
        });

        it('should return true if cloud is available', () => {
            hybridLLM = new HybridLLM(localLLM, cloudLLM, true);
            expect(hybridLLM.isAvailable()).toBe(true);
        });

        it('should return true if either is available', () => {
            vi.mocked(localLLM.isAvailable).mockReturnValue(false);
            hybridLLM = new HybridLLM(localLLM, cloudLLM, true);
            expect(hybridLLM.isAvailable()).toBe(true);
        });

        it('should return false if neither is available', () => {
            vi.mocked(localLLM.isAvailable).mockReturnValue(false);
            vi.mocked(cloudLLM!.isAvailable).mockReturnValue(false);
            hybridLLM = new HybridLLM(localLLM, cloudLLM, true);
            expect(hybridLLM.isAvailable()).toBe(false);
        });
    });

    describe('getLastProvider', () => {
        it('should return cloud when cloud was used', async () => {
            hybridLLM = new HybridLLM(localLLM, cloudLLM, true);
            await hybridLLM.classify('test');
            expect(hybridLLM.getLastProvider()).toBe('cloud');
        });

        it('should return local when local was used', async () => {
            hybridLLM = new HybridLLM(localLLM, cloudLLM, false);
            await hybridLLM.classify('test');
            expect(hybridLLM.getLastProvider()).toBe('local');
        });

        it('should return local after fallback', async () => {
            vi.mocked(cloudLLM!.classify).mockRejectedValue(new Error('Cloud error'));
            hybridLLM = new HybridLLM(localLLM, cloudLLM, true);
            await hybridLLM.classify('test');
            expect(hybridLLM.getLastProvider()).toBe('local');
        });
    });
});

