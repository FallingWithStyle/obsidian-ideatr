import type { IdeaCategory } from './classification';

/**
 * Web search result from external API
 */
export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    date?: string; // ISO 8601 date if available
    relevance?: number; // 0-1 relevance score
}

/**
 * Web search service interface
 */
export interface IWebSearchService {
    /**
     * Search for similar ideas/products/services
     * @param query - Search query string
     * @param context - Optional category context for query refinement
     * @param maxResults - Maximum number of results to return
     * @returns Array of search results, sorted by relevance
     */
    search(
        query: string,
        context?: IdeaCategory,
        maxResults?: number
    ): Promise<SearchResult[]>;

    /**
     * Check if web search service is available
     */
    isAvailable(): boolean;
}

/**
 * Search query generator interface
 */
export interface ISearchQueryGenerator {
    /**
     * Generate search query from idea text
     * @param text - Idea text
     * @param category - Optional category for context-aware queries
     * @param projectName - Optional project name to include in query
     * @returns Search query string
     */
    generateQuery(text: string, category?: IdeaCategory, projectName?: string): string;

    /**
     * Generate multiple query variations for better coverage
     * @param text - Idea text
     * @param category - Optional category
     * @param projectName - Optional project name to include in queries
     * @returns Array of query strings
     */
    generateQueryVariations(text: string, category?: IdeaCategory, projectName?: string): string[];
}

