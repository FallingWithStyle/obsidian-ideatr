import type { Vault, TFile } from 'obsidian';
import type { ISearchService, RelatedNote } from '../types/classification';
import { Logger } from '../utils/logger';

/**
 * SearchService - Finds related notes using keyword-based similarity
 */
export class SearchService implements ISearchService {
    private vault: Vault;
    private readonly IDEAS_DIR = 'Ideas/';

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
                const similarity = this.calculateSimilarity(text, content);

                if (similarity > 0) {
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
     * Calculate similarity between two texts using Jaccard similarity
     */
    calculateSimilarity(text1: string, text2: string): number {
        // Handle empty strings
        if (!text1 || !text2) {
            return 0;
        }

        // Tokenize and normalize
        const tokens1 = this.tokenize(text1);
        const tokens2 = this.tokenize(text2);

        if (tokens1.size === 0 && tokens2.size === 0) {
            return 0;
        }

        // Calculate Jaccard similarity: |A ∩ B| / |A ∪ B|
        const intersection = new Set([...tokens1].filter(token => tokens2.has(token)));
        const union = new Set([...tokens1, ...tokens2]);

        if (union.size === 0) {
            return 0;
        }

        return intersection.size / union.size;
    }

    /**
     * Tokenize text into normalized words
     */
    private tokenize(text: string): Set<string> {
        const normalized = text.toLowerCase();
        const words = normalized.split(/\s+/);

        // Filter out short words and punctuation
        const tokens = words
            .map(word => word.replace(/[^a-z0-9]/g, ''))
            .filter(word => word.length > 2);

        return new Set(tokens);
    }
}
