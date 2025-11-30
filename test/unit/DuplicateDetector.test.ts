import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DuplicateDetector } from '../../src/services/DuplicateDetector';
import type { ISearchService, RelatedNote } from '../../src/types/classification';

describe('DuplicateDetector', () => {
    let detector: DuplicateDetector;
    let mockSearchService: ISearchService;

    beforeEach(() => {
        mockSearchService = {
            findRelatedNotes: vi.fn(),
            calculateSimilarity: vi.fn()
        };

        detector = new DuplicateDetector(mockSearchService);
    });

    describe('checkDuplicate', () => {
        it('should return no duplicates when no similar notes exist', async () => {
            vi.mocked(mockSearchService.findRelatedNotes).mockResolvedValue([]);

            const result = await detector.checkDuplicate('new unique idea');

            expect(result.isDuplicate).toBe(false);
            expect(result.duplicates).toEqual([]);
        });

        it('should detect duplicates above threshold', async () => {
            const similarNotes: RelatedNote[] = [
                { path: 'Ideas/similar.md', title: 'similar', similarity: 0.85 }
            ];

            vi.mocked(mockSearchService.findRelatedNotes).mockResolvedValue(similarNotes);

            const result = await detector.checkDuplicate('test idea', 0.7);

            expect(result.isDuplicate).toBe(true);
            expect(result.duplicates.length).toBe(1);
            expect(result.threshold).toBe(0.7);
        });

        it('should not detect duplicates below threshold', async () => {
            const similarNotes: RelatedNote[] = [
                { path: 'Ideas/similar.md', title: 'similar', similarity: 0.6 }
            ];

            vi.mocked(mockSearchService.findRelatedNotes).mockResolvedValue(similarNotes);

            const result = await detector.checkDuplicate('test idea', 0.7);

            expect(result.isDuplicate).toBe(false);
            expect(result.duplicates).toEqual([]);
        });

        it('should use default threshold of 0.75', async () => {
            const similarNotes: RelatedNote[] = [
                { path: 'Ideas/similar.md', title: 'similar', similarity: 0.8 }
            ];

            vi.mocked(mockSearchService.findRelatedNotes).mockResolvedValue(similarNotes);

            const result = await detector.checkDuplicate('test idea');

            expect(result.threshold).toBe(0.75);
            expect(result.isDuplicate).toBe(true);
        });

        it('should return all duplicates above threshold', async () => {
            const similarNotes: RelatedNote[] = [
                { path: 'Ideas/dup1.md', title: 'dup1', similarity: 0.9 },
                { path: 'Ideas/dup2.md', title: 'dup2', similarity: 0.8 },
                { path: 'Ideas/not-dup.md', title: 'not-dup', similarity: 0.5 }
            ];

            vi.mocked(mockSearchService.findRelatedNotes).mockResolvedValue(similarNotes);

            const result = await detector.checkDuplicate('test idea', 0.7);

            expect(result.isDuplicate).toBe(true);
            expect(result.duplicates.length).toBe(2);
            expect(result.duplicates[0].similarity).toBe(0.9);
            expect(result.duplicates[1].similarity).toBe(0.8);
        });

        it('should handle empty text', async () => {
            const result = await detector.checkDuplicate('');

            expect(result.isDuplicate).toBe(false);
            expect(result.duplicates).toEqual([]);
        });

        it('should limit search to top 10 results', async () => {
            vi.mocked(mockSearchService.findRelatedNotes).mockResolvedValue([]);

            await detector.checkDuplicate('test idea');

            expect(mockSearchService.findRelatedNotes).toHaveBeenCalledWith('test idea', 10);
        });
    });
});
