/**
 * Type definitions for classification services
 */

/**
 * Valid idea categories as defined in PRD
 */
export type IdeaCategory =
    | 'game'
    | 'saas'
    | 'tool'
    | 'story'
    | 'mechanic'
    | 'hardware'
    | 'ip'
    | 'brand'
    | 'ux'
    | 'personal'
    | ''; // Empty string for unclassified

/**
 * Result from LLM classification
 */
export interface ClassificationResult {
    category: IdeaCategory;
    tags: string[];
    confidence?: number; // Optional confidence score 0-1
}

/**
 * Result from related note search
 */
export interface RelatedNote {
    path: string;
    title: string;
    similarity?: number; // Optional similarity score 0-1
}

/**
 * Result from duplicate detection
 */
export interface DuplicateCheckResult {
    isDuplicate: boolean;
    duplicates: RelatedNote[];
    threshold: number;
}

/**
 * Complete classification data for an idea
 */
export interface IdeaClassification {
    category: IdeaCategory;
    tags: string[];
    related: string[]; // Array of file paths
}

/**
 * Configuration for LLM service
 */
export interface LLMConfig {
    provider: 'claude' | 'openai' | 'local' | 'none';
    apiKey?: string;
    timeout: number; // milliseconds
    model?: string;
}

/**
 * LLM Service interface
 */
export interface ILLMService {
    /**
     * Suggest category and tags for an idea
     */
    classify(text: string): Promise<ClassificationResult>;

    /**
     * Check if service is available
     */
    isAvailable(): boolean;

    /**
     * Ensure the LLM service is ready to use (e.g., start server if needed)
     * This abstracts away implementation details - callers don't need to know
     * if it's a local server that needs starting or a cloud API that just needs verification
     * @returns true if ready, false if not configured (but available)
     */
    ensureReady?(): Promise<boolean>;

    /**
     * Generic completion method for non-classification tasks
     * @param prompt - The prompt to send to the LLM
     * @param options - Optional configuration (temperature, max tokens, stop tokens)
     * @returns The raw completion text
     */
    complete?(
        prompt: string,
        options?: {
            temperature?: number;
            n_predict?: number;
            stop?: string[];
            grammar?: string;
        }
    ): Promise<string>;

    /**
     * Generate idea mutations (variations)
     * @param text - Idea text
     * @param options - Mutation options
     * @returns Array of mutations
     */
    generateMutations?(
        text: string,
        options?: import('./transformation').MutationOptions
    ): Promise<import('./transformation').Mutation[]>;

    /**
     * Expand an idea with detailed description
     * @param text - Idea text
     * @param options - Expansion options
     * @returns Expansion result
     */
    expandIdea?(
        text: string,
        options?: import('./transformation').ExpansionOptions
    ): Promise<import('./transformation').ExpansionResult>;

    /**
     * Reorganize an idea into structured format
     * @param text - Idea text
     * @param options - Reorganization options
     * @returns Reorganization result
     */
    reorganizeIdea?(
        text: string,
        options?: import('./transformation').ReorganizationOptions
    ): Promise<import('./transformation').ReorganizationResult>;
}

/**
 * Search Service interface
 */
export interface ISearchService {
    /**
     * Find related notes based on idea text
     */
    findRelatedNotes(text: string, limit?: number): Promise<RelatedNote[]>;

    /**
     * Calculate similarity between two texts
     */
    calculateSimilarity(text1: string, text2: string): number;
}

/**
 * Duplicate Detector interface
 */
export interface IDuplicateDetector {
    /**
     * Check if idea is a duplicate
     */
    checkDuplicate(text: string, threshold?: number): Promise<DuplicateCheckResult>;
}

/**
 * Classification Service interface (orchestrator)
 */
export interface IClassificationService {
    /**
     * Classify an idea (category, tags, related notes)
     */
    classifyIdea(text: string): Promise<IdeaClassification>;
}

/**
 * Error types for classification
 */
export class ClassificationError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = 'ClassificationError';
    }
}

export class APITimeoutError extends ClassificationError {
    constructor(message: string = 'API request timed out') {
        super(message);
        this.name = 'APITimeoutError';
    }
}

export class NetworkError extends ClassificationError {
    constructor(message: string = 'Network error occurred') {
        super(message);
        this.name = 'NetworkError';
    }
}
