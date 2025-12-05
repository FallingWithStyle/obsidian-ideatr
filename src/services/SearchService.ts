import type { Vault, TFile } from 'obsidian';
import type { ISearchService, RelatedNote } from '../types/classification';
import { Logger } from '../utils/logger';

/**
 * SearchService - Finds related notes using keyword-based similarity
 */
export class SearchService implements ISearchService {
    private vault: Vault;
    private readonly IDEAS_DIR = 'Ideas/';
    private readonly MIN_SIMILARITY_THRESHOLD = 0.15; // Minimum similarity to be considered related

    constructor(vault: Vault) {
        this.vault = vault;
    }

    /**
     * Find related notes based on idea text
     */
    async findRelatedNotes(text: string, limit: number = 5): Promise<RelatedNote[]> {
        const allFiles = this.vault.getMarkdownFiles();

        // Filter to only Ideas directory
        const ideaFiles = allFiles.filter(file => file.path.startsWith(this.IDEAS_DIR));

        if (ideaFiles.length === 0) {
            return [];
        }

        // Calculate similarity for each file
        const similarities: Array<{ file: TFile; similarity: number }> = [];

        for (const file of ideaFiles) {
            try {
                const content = await this.vault.cachedRead(file);
                // Extract body text only (exclude frontmatter)
                const bodyText = this.extractBodyText(content);
                const similarity = this.calculateSimilarity(text, bodyText);

                // Only include if similarity meets minimum threshold
                if (similarity >= this.MIN_SIMILARITY_THRESHOLD) {
                    similarities.push({ file, similarity });
                }
            } catch (error) {
                Logger.warn(`Failed to read file ${file.path}:`, error);
            }
        }

        // Sort by similarity (descending) and limit results
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topMatches = similarities.slice(0, limit);

        // Convert to RelatedNote format
        return topMatches.map(({ file, similarity }) => ({
            path: file.path,
            title: file.basename,
            similarity
        }));
    }

    /**
     * Extract body text from markdown file, excluding frontmatter
     */
    private extractBodyText(content: string): string {
        // Remove frontmatter if present
        const frontmatterRegex = /^---\n[\s\S]*?\n---(\n\n?|\n?)/;
        const bodyMatch = content.match(frontmatterRegex);
        const body = bodyMatch ? content.substring(bodyMatch[0].length) : content;
        
        // Remove markdown headings, links, and other formatting that might cause false matches
        // Keep the actual content words
        return body.trim();
    }

    /**
     * Calculate similarity between two texts using improved Jaccard similarity
     * Filters out stop words and focuses on meaningful content
     */
    calculateSimilarity(text1: string, text2: string): number {
        // Handle empty strings
        if (!text1 || !text2) {
            return 0;
        }

        // Tokenize and normalize (with stop word filtering)
        const tokens1 = this.tokenize(text1);
        const tokens2 = this.tokenize(text2);

        if (tokens1.size === 0 || tokens2.size === 0) {
            return 0;
        }

        // Calculate Jaccard similarity: |A ∩ B| / |A ∪ B|
        const intersection = new Set([...tokens1].filter(token => tokens2.has(token)));
        const union = new Set([...tokens1, ...tokens2]);

        if (union.size === 0) {
            return 0;
        }

        const baseSimilarity = intersection.size / union.size;

        // Boost similarity if there are multiple matching meaningful words
        // This helps prioritize ideas with more substantial overlap
        const matchingRatio = intersection.size / Math.min(tokens1.size, tokens2.size);
        
        // Weighted combination: base similarity + bonus for high matching ratio
        return Math.min(baseSimilarity * (1 + matchingRatio * 0.3), 1.0);
    }

    /**
     * Tokenize text into normalized words, filtering out stop words
     */
    private tokenize(text: string): Set<string> {
        // Common stop words that don't add semantic meaning
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'from', 'as', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
            'all', 'each', 'every', 'some', 'any', 'no', 'other', 'another', 'such', 'only', 'just', 'more',
            'most', 'very', 'much', 'many', 'few', 'little', 'own', 'same', 'so', 'than', 'too', 'also'
        ]);

        const normalized = text.toLowerCase();
        // Remove markdown formatting, links, and special characters
        const cleaned = normalized
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links but keep text
            .replace(/#{1,6}\s+/g, '') // Remove markdown headings
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
            .replace(/\*([^*]+)\*/g, '$1') // Remove italic
            .replace(/`([^`]+)`/g, '$1') // Remove code
            .replace(/[^\w\s]/g, ' '); // Replace punctuation with spaces

        const words = cleaned.split(/\s+/);

        // Filter out stop words, short words, and normalize
        const tokens = words
            .map(word => word.trim())
            .filter(word => word.length > 3 && !stopWords.has(word));

        return new Set(tokens);
    }
}
