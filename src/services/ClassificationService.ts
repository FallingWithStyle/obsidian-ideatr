import type {
    IClassificationService,
    ILLMService,
    ISearchService,
    IdeaClassification
} from '../types/classification';
import { Logger } from '../utils/logger';

/**
 * ClassificationService - Orchestrates AI classification and related note detection
 */
export class ClassificationService implements IClassificationService {
    private llmService: ILLMService;
    private searchService: ISearchService;

    constructor(llmService: ILLMService, searchService: ISearchService) {
        this.llmService = llmService;
        this.searchService = searchService;
    }

    /**
     * Check if AI classification is available
     */
    isAvailable(): boolean {
        return this.llmService.isAvailable();
    }

    /**
     * Classify an idea using available services
     * @param text - The idea text to classify
     * @param excludePath - Optional path to exclude from related notes (e.g., current file path)
     */
    async classifyIdea(text: string, excludePath?: string): Promise<IdeaClassification> {
        // Initialize default result
        const result: IdeaClassification = {
            category: '',
            tags: [],
            related: []
        };

        // Run services in parallel for performance
        const tasks: Promise<void>[] = [];

        // 1. LLM Classification
        if (this.llmService.isAvailable()) {
            tasks.push(
                this.llmService.classify(text)
                    .then(classification => {
                        result.category = classification.category;
                        // Deduplicate tags
                        result.tags = [...new Set(classification.tags)];
                    })
                    .catch(error => {
                        Logger.warn('LLM classification failed:', error);
                        // Keep defaults on error
                    })
            );
        }

        // 2. Related Note Search
        // Note: ClassificationService returns paths, but they will be converted to IDs
        // when saved to frontmatter by the calling code
        tasks.push(
            this.searchService.findRelatedNotes(text, 3, excludePath) // Limit to top 3 related notes, exclude current file
                .then(relatedNotes => {
                    result.related = relatedNotes.map(note => note.path);
                })
                .catch(error => {
                    Logger.warn('Related note search failed:', error);
                    // Keep defaults on error
                })
        );

        // Wait for all tasks to complete (or fail gracefully)
        await Promise.all(tasks);

        return result;
    }
}
