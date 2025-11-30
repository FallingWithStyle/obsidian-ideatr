import type { SearchResult } from '../types/search';
import type { IdeaCategory } from '../types/classification';

/**
 * Map idea category to type string for search result formatting
 */
function getTypeFromCategory(category: IdeaCategory): string {
    switch (category) {
        case 'game':
        case 'mechanic':
            return 'game';
        case 'story':
        case 'ip':
            return 'story';
        case 'saas':
        case 'tool':
        case 'ux':
            return 'app';
        case 'hardware':
        case 'brand':
            return 'product';
        case 'personal':
        case '':
        default:
            return 'similar'; // Generic fallback
    }
}

/**
 * Format search results for frontmatter storage
 * 
 * Converts SearchResult[] to string[] format:
 * - "Found similar <type>: <title> | URL: <url> | Date: <date>" for matches
 * - Type is derived from category if provided, otherwise defaults to "product"
 */
export function formatSearchResultsForFrontmatter(
    results: SearchResult[],
    maxResults?: number,
    category?: IdeaCategory
): string[] {
    if (results.length === 0) {
        return [];
    }

    const limit = maxResults || results.length;
    const limitedResults = results.slice(0, limit);
    
    // Determine type string from category
    // Explicitly check for undefined (not provided) vs empty string (unknown category)
    const type = category !== undefined ? getTypeFromCategory(category) : 'product';
    const prefix = type === 'similar' ? 'Found similar:' : `Found similar ${type}:`;

    return limitedResults.map(result => {
        const parts: string[] = [];
        
        // Title part
        const title = result.title.length > 100 
            ? result.title.substring(0, 100) + '...'
            : result.title;
        parts.push(`${prefix} ${title}`);
        
        // URL part
        parts.push(`URL: ${result.url}`);
        
        // Date part (if available)
        if (result.date) {
            parts.push(`Date: ${result.date}`);
        }

        return parts.join(' | ');
    });
}

