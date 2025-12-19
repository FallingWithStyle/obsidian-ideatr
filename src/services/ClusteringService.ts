import type { IClusteringService } from '../types/management';
import type { Cluster, Embedding } from '../types/management';
import type { IdeaFile } from '../types/idea';
import { EmbeddingService } from './EmbeddingService';
import type { IEmbeddingService } from '../types/management';

/**
 * ClusteringService - Clusters ideas using hierarchical clustering (v1 approach)
 */
export class ClusteringService implements IClusteringService {
    constructor(
        private embeddingService: IEmbeddingService,
        private similarityThreshold: number = 0.3
    ) {}

    /**
     * Cluster ideas based on similarity
     * @param ideas - Ideas to cluster
     * @param embeddings - Optional embeddings for each idea (if not provided, will generate)
     * @returns Array of clusters
     * Note: This method is async to satisfy the IClusteringService interface,
     * even though it doesn't contain any await expressions (generateEmbeddings is synchronous)
     */
    clusterIdeas(ideas: IdeaFile[], embeddings?: Embedding[]): Promise<Cluster[]> {
        if (ideas.length === 0) {
            return Promise.resolve([]);
        }

        if (ideas.length === 1) {
            return Promise.resolve([{
                id: 'cluster-0',
                ideas: [ideas[0]],
                label: 'Single Idea'
            }]);
        }

        // Generate similarity matrix
        let similarityMatrix: number[][];
        if (embeddings) {
            // Use provided embeddings to calculate similarity
            similarityMatrix = this.calculateSimilarityMatrixFromEmbeddings(embeddings);
        } else {
            // Use embedding service to calculate similarity matrix
            if (this.embeddingService instanceof EmbeddingService) {
                similarityMatrix = this.embeddingService.calculateSimilarityMatrix(ideas);
            } else {
                // Fallback: generate embeddings first
                const texts = ideas.map(idea => this.getIdeaText(idea));
                const generatedEmbeddings = this.embeddingService.generateEmbeddings(texts);
                similarityMatrix = this.calculateSimilarityMatrixFromEmbeddings(generatedEmbeddings);
            }
        }

        // Perform hierarchical clustering
        const clusters = this.hierarchicalClustering(ideas, similarityMatrix);

        return Promise.resolve(clusters);
    }

    /**
     * Calculate similarity between two embeddings using cosine similarity
     * @param embedding1 - First embedding
     * @param embedding2 - Second embedding
     * @returns Similarity score (0-1)
     */
    calculateSimilarity(embedding1: Embedding, embedding2: Embedding): number {
        if (embedding1.length !== embedding2.length) {
            return 0;
        }

        // Calculate cosine similarity
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        if (magnitude === 0) {
            return 0;
        }

        const similarity = dotProduct / magnitude;
        // Normalize to 0-1 range (cosine similarity is -1 to 1)
        return (similarity + 1) / 2;
    }

    /**
     * Calculate similarity matrix from embeddings
     */
    private calculateSimilarityMatrixFromEmbeddings(embeddings: Embedding[]): number[][] {
        const matrix: number[][] = [];

        for (let i = 0; i < embeddings.length; i++) {
            const row: number[] = [];
            for (let j = 0; j < embeddings.length; j++) {
                if (i === j) {
                    row.push(1.0);
                } else {
                    const similarity = this.calculateSimilarity(embeddings[i], embeddings[j]);
                    row.push(similarity);
                }
            }
            matrix.push(row);
        }

        return matrix;
    }

    /**
     * Perform hierarchical clustering using agglomerative approach
     */
    private hierarchicalClustering(ideas: IdeaFile[], similarityMatrix: number[][]): Cluster[] {
        // Start with each idea as its own cluster
        let clusters: Cluster[] = ideas.map((idea, index) => ({
            id: `cluster-${index}`,
            ideas: [idea],
            label: this.generateClusterLabel([idea])
        }));

        // Merge clusters until similarity threshold is reached
        while (clusters.length > 1) {
            // Find two most similar clusters
            let maxSimilarity = -1;
            let mergeIndex1 = -1;
            let mergeIndex2 = -1;

            for (let i = 0; i < clusters.length; i++) {
                for (let j = i + 1; j < clusters.length; j++) {
                    const similarity = this.calculateClusterSimilarity(
                        clusters[i],
                        clusters[j],
                        similarityMatrix,
                        ideas
                    );

                    if (similarity > maxSimilarity) {
                        maxSimilarity = similarity;
                        mergeIndex1 = i;
                        mergeIndex2 = j;
                    }
                }
            }

            // If max similarity is below threshold, stop merging
            if (maxSimilarity < this.similarityThreshold) {
                break;
            }

            // Merge the two clusters
            const mergedCluster: Cluster = {
                id: `cluster-${clusters.length}`,
                ideas: [...clusters[mergeIndex1].ideas, ...clusters[mergeIndex2].ideas],
                label: this.generateClusterLabel([...clusters[mergeIndex1].ideas, ...clusters[mergeIndex2].ideas])
            };

            // Remove old clusters and add merged one
            clusters = clusters.filter((_, index) => index !== mergeIndex1 && index !== mergeIndex2);
            clusters.push(mergedCluster);
        }

        // Reassign IDs
        return clusters.map((cluster, index) => ({
            ...cluster,
            id: `cluster-${index}`
        }));
    }

    /**
     * Calculate similarity between two clusters using average linkage
     */
    private calculateClusterSimilarity(
        cluster1: Cluster,
        cluster2: Cluster,
        similarityMatrix: number[][],
        allIdeas: IdeaFile[]
    ): number {
        // Find indices of ideas in clusters
        const indices1 = cluster1.ideas.map(idea => allIdeas.findIndex(i => i.filename === idea.filename));
        const indices2 = cluster2.ideas.map(idea => allIdeas.findIndex(i => i.filename === idea.filename));

        // Calculate average similarity (average linkage)
        let totalSimilarity = 0;
        let count = 0;

        for (const idx1 of indices1) {
            for (const idx2 of indices2) {
                if (idx1 >= 0 && idx2 >= 0 && idx1 < similarityMatrix.length && idx2 < similarityMatrix[idx1].length) {
                    totalSimilarity += similarityMatrix[idx1][idx2];
                    count++;
                }
            }
        }

        return count > 0 ? totalSimilarity / count : 0;
    }

    /**
     * Generate label for cluster based on ideas
     */
    private generateClusterLabel(ideas: IdeaFile[]): string {
        if (ideas.length === 0) {
            return 'Empty Cluster';
        }

        if (ideas.length === 1) {
            return ideas[0].frontmatter.category || 'Uncategorized';
        }

        // Use most common category
        const categories = ideas.map(idea => idea.frontmatter.category).filter(c => c);
        if (categories.length === 0) {
            return 'Mixed Ideas';
        }

        const categoryCounts: Record<string, number> = {};
        for (const category of categories) {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }

        const mostCommon = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])[0];

        return mostCommon ? `${mostCommon[0]} (${ideas.length})` : 'Mixed Ideas';
    }

    /**
     * Get text representation of idea
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

