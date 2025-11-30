import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClassificationService } from '../../src/services/ClassificationService';
import type { ILLMService, ISearchService, ClassificationResult, RelatedNote } from '../../src/types/classification';

describe('ClassificationService', () => {
    let service: ClassificationService;
    let mockLLMService: ILLMService;
    let mockSearchService: ISearchService;

    beforeEach(() => {
        mockLLMService = {
            classify: vi.fn(),
            isAvailable: vi.fn().mockReturnValue(true)
        };

        mockSearchService = {
            findRelatedNotes: vi.fn(),
            calculateSimilarity: vi.fn()
        };

        service = new ClassificationService(mockLLMService, mockSearchService);
    });

    describe('classifyIdea', () => {
        it('should combine results from LLM and Search services', async () => {
            const mockClassification: ClassificationResult = {
                category: 'saas',
                tags: ['productivity', 'tool'],
                confidence: 0.9
            };

            const mockRelated: RelatedNote[] = [
                { path: 'Ideas/related.md', title: 'related', similarity: 0.8 }
            ];

            vi.mocked(mockLLMService.classify).mockResolvedValue(mockClassification);
            vi.mocked(mockSearchService.findRelatedNotes).mockResolvedValue(mockRelated);

            const result = await service.classifyIdea('test idea');

            expect(result.category).toBe('saas');
            expect(result.tags).toEqual(['productivity', 'tool']);
            expect(result.related).toEqual(['Ideas/related.md']);
        });

        it('should handle LLM service failure gracefully', async () => {
            vi.mocked(mockLLMService.classify).mockRejectedValue(new Error('API Error'));
            vi.mocked(mockSearchService.findRelatedNotes).mockResolvedValue([]);

            const result = await service.classifyIdea('test idea');

            expect(result.category).toBe('');
            expect(result.tags).toEqual([]);
            expect(result.related).toEqual([]);
        });

        it('should handle Search service failure gracefully', async () => {
            const mockClassification: ClassificationResult = {
                category: 'game',
                tags: ['rpg'],
                confidence: 0.8
            };

            vi.mocked(mockLLMService.classify).mockResolvedValue(mockClassification);
            vi.mocked(mockSearchService.findRelatedNotes).mockRejectedValue(new Error('Search Error'));

            const result = await service.classifyIdea('test idea');

            expect(result.category).toBe('game');
            expect(result.tags).toEqual(['rpg']);
            expect(result.related).toEqual([]);
        });

        it('should skip LLM if service is unavailable', async () => {
            vi.mocked(mockLLMService.isAvailable).mockReturnValue(false);
            vi.mocked(mockSearchService.findRelatedNotes).mockResolvedValue([]);

            const result = await service.classifyIdea('test idea');

            expect(mockLLMService.classify).not.toHaveBeenCalled();
            expect(result.category).toBe('');
        });

        it('should deduplicate tags', async () => {
            const mockClassification: ClassificationResult = {
                category: 'saas',
                tags: ['productivity', 'productivity', 'tool'],
                confidence: 0.9
            };
            vi.mocked(mockLLMService.classify).mockResolvedValue(mockClassification);
            vi.mocked(mockSearchService.findRelatedNotes).mockResolvedValue([]);

            const result = await service.classifyIdea('test idea');
            expect(result.tags).toEqual(['productivity', 'tool']);
        });
    });
});
