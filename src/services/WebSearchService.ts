import type { IWebSearchService, SearchResult } from '../types/search';
import type { IdeatrSettings } from '../settings';
import type { IdeaCategory } from '../types/classification';

/**
 * WebSearchService - Provides web search functionality using Google Custom Search API
 */
export class WebSearchService implements IWebSearchService {
    private settings: IdeatrSettings;

    constructor(settings: IdeatrSettings) {
        this.settings = settings;
    }

    /**
     * Check if web search service is available
     */
    isAvailable(): boolean {
        if (this.settings.webSearchProvider === 'none') {
            return false;
        }

        if (this.settings.webSearchProvider === 'google') {
            return !!(
                this.settings.googleSearchApiKey &&
                this.settings.googleSearchEngineId
            );
        }

        // Future: Add other providers (DuckDuckGo, Bing, etc.)
        return false;
    }

    /**
     * Search for similar ideas/products/services
     */
    async search(
        query: string,
        _context?: IdeaCategory,
        maxResults?: number
    ): Promise<SearchResult[]> {
        if (!this.isAvailable() || !query || query.trim().length === 0) {
            return [];
        }

        const limit = maxResults || this.settings.maxSearchResults || 5;

        try {
            const results = await this.performSearch(query, limit);
            return this.processResults(results, query);
        } catch (error) {
            console.warn('Web search failed:', error);
            return [];
        }
    }

    /**
     * Perform actual API call to Google Custom Search
     */
    private async performSearch(query: string, maxResults: number): Promise<any> {
        if (this.settings.webSearchProvider !== 'google') {
            throw new Error('Only Google Custom Search is currently supported');
        }

        const apiKey = this.settings.googleSearchApiKey;
        const engineId = this.settings.googleSearchEngineId;
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            this.settings.webSearchTimeout
        );

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'GET'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('API rate limit exceeded');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.items || [];
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Timeout: Request exceeded ${this.settings.webSearchTimeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Process and score search results
     */
    private processResults(items: any[], query: string): SearchResult[] {
        if (!items || items.length === 0) {
            return [];
        }

        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);

        const results: SearchResult[] = items.map((item: any) => {
            const title = item.title || '';
            const snippet = item.snippet || '';
            const url = item.link || '';
            
            // Extract date if available
            let date: string | undefined;
            if (item.pagemap?.metatags) {
                for (const meta of item.pagemap.metatags) {
                    if (meta['article:published_time']) {
                        date = meta['article:published_time'].split('T')[0]; // Extract date part
                        break;
                    }
                }
            }

            // Calculate relevance score (0-1)
            const relevance = this.calculateRelevance(title, snippet, queryWords);

            return {
                title,
                url,
                snippet,
                date,
                relevance
            };
        });

        // Sort by relevance (descending)
        results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

        // Filter low-relevance results (score < 0.3)
        return results.filter(r => (r.relevance || 0) >= 0.3);
    }

    /**
     * Calculate relevance score based on title and snippet match
     */
    private calculateRelevance(
        title: string,
        snippet: string,
        queryWords: string[]
    ): number {
        const titleLower = title.toLowerCase();
        const snippetLower = snippet.toLowerCase();
        const combined = `${titleLower} ${snippetLower}`;

        let score = 0;
        let matches = 0;

        // Count matching words
        for (const word of queryWords) {
            if (combined.includes(word)) {
                matches++;
                // Title matches are worth more
                if (titleLower.includes(word)) {
                    score += 0.3;
                } else {
                    score += 0.1;
                }
            }
        }

        // Normalize score (0-1 range)
        const matchRatio = matches / queryWords.length;
        score = Math.min(score + matchRatio * 0.2, 1.0);

        return Math.round(score * 100) / 100; // Round to 2 decimal places
    }
}

