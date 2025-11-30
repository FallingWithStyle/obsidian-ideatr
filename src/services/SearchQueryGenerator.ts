import type { ISearchQueryGenerator } from '../types/search';
import type { IdeaCategory } from '../types/classification';
import { extractIdeaNameRuleBased } from '../utils/ideaNameExtractor';

/**
 * SearchQueryGenerator - Generates context-aware search queries from idea text
 * Auto-detects project name from idea text to improve search accuracy
 */
export class SearchQueryGenerator implements ISearchQueryGenerator {
    /**
     * Generate search query from idea text
     * @param text - Idea text
     * @param category - Optional category for context-aware queries
     * @param projectName - Optional project name to include in query
     */
    generateQuery(text: string, category?: IdeaCategory, projectName?: string): string {
        if (!text || text.trim().length === 0) {
            return '';
        }

        const trimmed = text.trim();
        let keyTerms = this.extractKeyTerms(trimmed);

        // If project name is provided or can be extracted, prioritize it in the query
        const nameToUse = projectName || extractIdeaNameRuleBased(text);
        if (nameToUse && nameToUse.trim().length > 0 && nameToUse.length >= 3) {
            // Use project name as primary search term, with key terms as context
            const cleanName = nameToUse.trim();
            // If key terms already include the name, just use key terms
            if (!keyTerms.toLowerCase().includes(cleanName.toLowerCase())) {
                keyTerms = `${cleanName} ${keyTerms}`;
            }
        }

        if (!category) {
            return keyTerms;
        }

        // Context-aware query generation based on category
        switch (category) {
            case 'saas':
            case 'tool':
            case 'ux':
                return `${keyTerms} app`;
            
            case 'game':
            case 'mechanic':
                return `${keyTerms} game`;
            
            case 'hardware':
            case 'brand':
                return `${keyTerms} product`;
            
            case 'story':
            case 'ip':
                return `${keyTerms} book`;
            
            default:
                return keyTerms;
        }
    }

    /**
     * Generate multiple query variations for better coverage
     * @param text - Idea text
     * @param category - Optional category
     * @param projectName - Optional project name to include in queries
     */
    generateQueryVariations(text: string, category?: IdeaCategory, projectName?: string): string[] {
        if (!text || text.trim().length === 0) {
            return [];
        }

        const trimmed = text.trim();
        let keyTerms = this.extractKeyTerms(trimmed);
        
        // If project name is provided or can be extracted, prioritize it
        const nameToUse = projectName || extractIdeaNameRuleBased(text);
        if (nameToUse && nameToUse.trim().length > 0 && nameToUse.length >= 3) {
            const cleanName = nameToUse.trim();
            if (!keyTerms.toLowerCase().includes(cleanName.toLowerCase())) {
                keyTerms = `${cleanName} ${keyTerms}`;
            }
        }
        
        const variations: string[] = [];

        if (!category) {
            // Default variations
            variations.push(keyTerms);
            variations.push(`${keyTerms} product`);
            variations.push(`${keyTerms} service`);
            return variations;
        }

        // Category-specific variations
        switch (category) {
            case 'saas':
            case 'tool':
            case 'ux':
                variations.push(`${keyTerms} app`);
                variations.push(`${keyTerms} software`);
                variations.push(`${keyTerms} tool`);
                break;
            
            case 'game':
            case 'mechanic':
                variations.push(`${keyTerms} game`);
                variations.push(`${keyTerms} gameplay`);
                variations.push(`${keyTerms} game mechanic`);
                break;
            
            case 'hardware':
            case 'brand':
                variations.push(`${keyTerms} product`);
                variations.push(`${keyTerms} hardware`);
                variations.push(`${keyTerms} device`);
                break;
            
            case 'story':
            case 'ip':
                variations.push(`${keyTerms} book`);
                variations.push(`${keyTerms} novel`);
                variations.push(`${keyTerms} story`);
                break;
            
            default:
                variations.push(keyTerms);
                variations.push(`${keyTerms} product`);
        }

        return variations;
    }

    /**
     * Extract key terms from idea text
     * Simple implementation: takes first meaningful words (up to 5 words)
     */
    private extractKeyTerms(text: string): string {
        // Remove common stop words and extract meaningful terms
        const words = text
            .split(/\s+/)
            .filter(word => {
                const lower = word.toLowerCase();
                // Filter out common words
                return !['a', 'an', 'the', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'at', 'for', 'with'].includes(lower);
            })
            .slice(0, 5); // Take first 5 meaningful words
        
        return words.join(' ') || text.split(/\s+/).slice(0, 3).join(' '); // Fallback to first 3 words
    }
}

