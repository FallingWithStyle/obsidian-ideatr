import type { IEmbeddingService } from '../types/management';
import type { Embedding } from '../types/management';
import type { IdeaFile } from '../types/idea';

/**
 * EmbeddingService - Generates embeddings using text similarity (v1 approach)
 * Uses keyword-based similarity instead of true embeddings
 */
export class EmbeddingService implements IEmbeddingService {
    /**
     * Check if embedding service is available
     */
    isAvailable(): boolean {
        return true; // Text similarity is always available
    }

    /**
     * Generate embedding for a single text
     * For v1, this creates a "pseudo-embedding" based on text similarity
     * @param text - Text to embed
     * @returns Embedding vector (simplified representation)
     */
    generateEmbedding(text: string): Embedding {
        // For v1, create a simple embedding based on word frequencies
        // This is a simplified approach - in v2, we'd use actual LLM embeddings
        const words = this.tokenize(text);
        const wordFreq = this.calculateWordFrequencies(words);
        
        // Create a simple vector representation
        // In a real implementation, this would be a fixed-size vector
        // For now, we'll use a hash-based approach
        const embedding: number[] = [];
        const uniqueWords = Array.from(new Set(words));
        
        // Create a simple embedding based on word characteristics
        for (let i = 0; i < 50; i++) {
            let value = 0;
            for (const word of uniqueWords) {
                // Simple hash-based feature
                const hash = this.simpleHash(word + i);
                value += (hash % 100) / 100 * wordFreq[word];
            }
            embedding.push(value / uniqueWords.length);
        }
        
        return embedding;
    }

    /**
     * Generate embeddings for multiple texts (batch)
     * @param texts - Array of texts to embed
     * @returns Array of embedding vectors
     */
    generateEmbeddings(texts: string[]): Embedding[] {
        return texts.map(text => this.generateEmbedding(text));
    }

    /**
     * Calculate similarity matrix for ideas
     * @param ideas - Array of ideas
     * @returns 2D matrix where matrix[i][j] is similarity between idea i and j
     */
    calculateSimilarityMatrix(ideas: IdeaFile[]): number[][] {
        const matrix: number[][] = [];
        
        for (let i = 0; i < ideas.length; i++) {
            const row: number[] = [];
            const text1 = this.getIdeaText(ideas[i]);
            
            for (let j = 0; j < ideas.length; j++) {
                if (i === j) {
                    row.push(1.0); // Self-similarity
                } else {
                    const text2 = this.getIdeaText(ideas[j]);
                    const similarity = this.calculateSimilarity(text1, text2);
                    row.push(similarity);
                }
            }
            matrix.push(row);
        }
        
        return matrix;
    }

    /**
     * Calculate similarity between two texts using keyword matching
     */
    private calculateSimilarity(text1: string, text2: string): number {
        const words1 = new Set(this.tokenize(text1.toLowerCase()));
        const words2 = new Set(this.tokenize(text2.toLowerCase()));
        
        if (words1.size === 0 && words2.size === 0) {
            return 1.0;
        }
        
        if (words1.size === 0 || words2.size === 0) {
            return 0.0;
        }
        
        // Calculate Jaccard similarity (intersection over union)
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    /**
     * Tokenize text into words
     */
    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
    }

    /**
     * Calculate word frequencies
     */
    private calculateWordFrequencies(words: string[]): Record<string, number> {
        const freq: Record<string, number> = {};
        for (const word of words) {
            freq[word] = (freq[word] || 0) + 1;
        }
        return freq;
    }

    /**
     * Simple hash function
     */
    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Get text representation of idea for similarity calculation
     */
    private getIdeaText(idea: IdeaFile): string {
        const parts: string[] = [];
        
        if (idea.frontmatter.category) {
            parts.push(idea.frontmatter.category);
        }
        
        parts.push(...idea.frontmatter.tags);
        parts.push(idea.body);
        
        return parts.join(' ');
    }
}

