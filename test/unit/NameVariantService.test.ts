import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NameVariantService, extractIdeaNameSync } from '../../src/services/NameVariantService';
import type { ILLMService } from '../../src/types/classification';
import type { IdeatrSettings } from '../../src/settings';
import type { NameVariant } from '../../src/types/transformation';

describe('NameVariantService', () => {
    let mockLLMService: ILLMService;
    let mockSettings: IdeatrSettings;

    beforeEach(() => {
        mockLLMService = {
            classify: vi.fn(),
            isAvailable: vi.fn(() => false),
            complete: vi.fn()
        } as any;

        mockSettings = {
            llmProvider: 'llama',
            llamaServerUrl: 'http://localhost:8080',
            llamaBinaryPath: '',
            modelPath: '',
            llamaServerPort: 8080,
            concurrency: 1,
            llmTimeout: 1000,
            autoClassify: true,
            enableDomainCheck: false,
            autoCheckDomains: false,
            prospectrUrl: '',
            domainCheckTimeout: 10000,
            enableWebSearch: false,
            autoSearchExistence: false,
            webSearchProvider: 'none',
            googleSearchApiKey: '',
            googleSearchEngineId: '',
            webSearchTimeout: 15000,
            maxSearchResults: 5,
            enableNameVariants: true,
            autoGenerateVariants: false,
            maxVariants: 8,
            enableScaffolds: true,
            scaffoldDefaultAction: 'append'
        };
    });

    describe('extractIdeaNameSync', () => {
        it('should extract first line and truncate', () => {
            const result = extractIdeaNameSync('TaskMaster - A productivity app');
            expect(result).toBe('TaskMaster - A productivity app');
        });

        it('should handle multi-line text', () => {
            const result = extractIdeaNameSync('First line\nSecond line');
            expect(result).toBe('First line');
        });

        it('should remove special characters', () => {
            const result = extractIdeaNameSync('Task@Master! #app');
            expect(result).toBe('TaskMaster app');
        });
    });

    describe('generateVariants', () => {
        it('should return empty array for empty idea text', async () => {
            const service = new NameVariantService(mockLLMService, mockSettings);
            const result = await service.generateVariants('');
            expect(result).toEqual([]);
        });

        it('should generate fallback variants when LLM unavailable', async () => {
            const service = new NameVariantService(mockLLMService, mockSettings);
            const result = await service.generateVariants('TaskMaster');
            
            expect(result.length).toBeGreaterThan(0);
            expect(result.every(v => v.text && v.type)).toBe(true);
        });

        it('should cache variants for repeated calls', async () => {
            vi.mocked(mockLLMService.isAvailable).mockReturnValue(true);
            vi.mocked(mockLLMService.complete).mockResolvedValue(JSON.stringify({
                variants: [
                    { text: 'CachedVariant', type: 'synonym' }
                ]
            }));

            const service = new NameVariantService(mockLLMService, mockSettings);
            
            // First call - should call LLM
            const result1 = await service.generateVariants('TaskMaster');
            expect(mockLLMService.complete).toHaveBeenCalledTimes(1);
            
            // Second call - should use cache
            const result2 = await service.generateVariants('TaskMaster');
            expect(mockLLMService.complete).toHaveBeenCalledTimes(1); // Still 1, not 2
            expect(result2).toEqual(result1);
        });

        it('should use provided idea name if given', async () => {
            const service = new NameVariantService(mockLLMService, mockSettings);
            const result = await service.generateVariants('Some long idea text', 'TaskMaster');
            
            expect(result.length).toBeGreaterThan(0);
            // Should use TaskMaster, not extract from long text
        });

        it('should respect maxVariants setting', async () => {
            mockSettings.maxVariants = 3;
            const service = new NameVariantService(mockLLMService, mockSettings);
            const result = await service.generateVariants('TaskMaster Productivity App');
            
            expect(result.length).toBeLessThanOrEqual(3);
        });

        it('should use LLM if available', async () => {
            vi.mocked(mockLLMService.isAvailable).mockReturnValue(true);
            vi.mocked(mockLLMService.complete).mockResolvedValue(JSON.stringify({
                variants: [
                    { text: 'TaskMaster', type: 'synonym' },
                    { text: 'TM', type: 'short' }
                ]
            }));

            const service = new NameVariantService(mockLLMService, mockSettings);
            const result = await service.generateVariants('TaskMaster');

            expect(mockLLMService.complete).toHaveBeenCalled();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should fallback to rule-based if LLM fails', async () => {
            vi.mocked(mockLLMService.isAvailable).mockReturnValue(true);
            vi.mocked(mockLLMService.complete).mockRejectedValue(new Error('LLM error'));

            const service = new NameVariantService(mockLLMService, mockSettings);
            const result = await service.generateVariants('TaskMaster');

            expect(result.length).toBeGreaterThan(0); // Should have fallback variants
        });
    });

    describe('isAvailable', () => {
        it('should always return true (has fallback)', () => {
            const service = new NameVariantService(mockLLMService, mockSettings);
            expect(service.isAvailable()).toBe(true);
        });
    });
});

