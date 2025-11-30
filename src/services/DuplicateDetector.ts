import type { IDuplicateDetector, ISearchService, DuplicateCheckResult } from '../types/classification';

/**
 * DuplicateDetector - Detects duplicate ideas based on similarity threshold
 */
export class DuplicateDetector implements IDuplicateDetector {
    private searchService: ISearchService;
    private readonly DEFAULT_THRESHOLD = 0.75;

    constructor(searchService: ISearchService) {
        this.searchService = searchService;
    }

    /**
     * Check if idea is a duplicate
     */
    async checkDuplicate(text: string, threshold?: number): Promise<DuplicateCheckResult> {
        const actualThreshold = threshold ?? this.DEFAULT_THRESHOLD;

        if (!text || text.trim().length === 0) {
            return {
                isDuplicate: false,
                duplicates: [],
                threshold: actualThreshold
            };
        }

        // Find related notes (limit to top 10)
        const relatedNotes = await this.searchService.findRelatedNotes(text, 10);

        // Filter notes above threshold
        const duplicates = relatedNotes.filter(note =>
            note.similarity !== undefined && note.similarity >= actualThreshold
        );

        return {
            isDuplicate: duplicates.length > 0,
            duplicates,
            threshold: actualThreshold
        };
    }
}
