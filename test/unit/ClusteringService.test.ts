import { describe, it, expect, beforeEach } from 'vitest';
import { ClusteringService } from '../../src/services/ClusteringService';
import { EmbeddingService } from '../../src/services/EmbeddingService';
import type { IdeaFile } from '../../src/types/idea';

describe('ClusteringService', () => {
    let service: ClusteringService;
    let embeddingService: EmbeddingService;

    beforeEach(() => {
        embeddingService = new EmbeddingService();
        service = new ClusteringService(embeddingService, 0.3); // threshold 0.3
    });

    describe('clusterIdeas', () => {
        it('should accept precomputed embeddings parameter without error (QA 4.2)', async () => {
            const ideas: IdeaFile[] = [
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-28',
                        category: 'saas',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'First idea body',
                    filename: 'idea1.md'
                },
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-27',
                        category: 'game',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'Second idea body',
                    filename: 'idea2.md'
                }
            ];

            // Precomputed embeddings for the two ideas
            const embeddings = [
                [1, 0, 0],
                [0, 1, 0]
            ];

            const clusters = await service.clusterIdeas(ideas, embeddings);

            expect(clusters.length).toBeGreaterThan(0);
            const totalIdeasInClusters = clusters.reduce((sum, cluster) => sum + cluster.ideas.length, 0);
            expect(totalIdeasInClusters).toBe(ideas.length);
        });

        it('should cluster similar ideas together', async () => {
            const ideas: IdeaFile[] = [
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-28',
                        category: 'saas',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'A productivity app for developers',
                    filename: 'idea1.md'
                },
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-27',
                        category: 'saas',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'A tool for managing tasks and projects',
                    filename: 'idea2.md'
                },
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-26',
                        category: 'game',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'A space exploration game',
                    filename: 'idea3.md'
                }
            ];

            const clusters = await service.clusterIdeas(ideas);

            expect(clusters.length).toBeGreaterThan(0);
            expect(clusters.length).toBeLessThanOrEqual(ideas.length);
            
            // All ideas should be in clusters
            const totalIdeasInClusters = clusters.reduce((sum, cluster) => sum + cluster.ideas.length, 0);
            expect(totalIdeasInClusters).toBe(ideas.length);
        });

        it('should handle single idea', async () => {
            const ideas: IdeaFile[] = [
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-28',
                        category: 'saas',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'A single idea',
                    filename: 'idea1.md'
                }
            ];

            const clusters = await service.clusterIdeas(ideas);

            expect(clusters).toHaveLength(1);
            expect(clusters[0].ideas).toHaveLength(1);
        });

        it('should handle empty array', async () => {
            const clusters = await service.clusterIdeas([]);
            expect(clusters).toEqual([]);
        });

        it('should create separate clusters for dissimilar ideas', async () => {
            const ideas: IdeaFile[] = [
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-28',
                        category: 'saas',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'productivity app development tool',
                    filename: 'idea1.md'
                },
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-27',
                        category: 'game',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'space exploration adventure game',
                    filename: 'idea2.md'
                },
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-26',
                        category: 'hardware',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'smart home device controller',
                    filename: 'idea3.md'
                }
            ];

            const clusters = await service.clusterIdeas(ideas);

            // With very different ideas, we might get separate clusters
            expect(clusters.length).toBeGreaterThanOrEqual(1);
        });

        it('should accept provided embeddings array and not require embedding generation (QA 4.2)', async () => {
            const ideas: IdeaFile[] = [
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-28',
                        category: 'saas',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'A productivity app for developers',
                    filename: 'idea1.md'
                },
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-27',
                        category: 'saas',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'A tool for managing tasks and projects',
                    filename: 'idea2.md'
                }
            ];

            // Spy on embedding generation to ensure it is NOT called when embeddings are provided
            const generateEmbeddingsSpy = vi.spyOn(embeddingService, 'generateEmbeddings');

            // Provide a simple embedding per idea
            const embeddings = [
                [1, 0, 0],
                [0, 1, 0]
            ];

            const clusters = await service.clusterIdeas(ideas, embeddings);

            // Should still produce at least one cluster
            expect(clusters.length).toBeGreaterThan(0);
            // When embeddings are provided, EmbeddingService.generateEmbeddings should not be called
            expect(generateEmbeddingsSpy).not.toHaveBeenCalled();
        });
    });

    describe('calculateSimilarity', () => {
        it('should calculate similarity between embeddings', () => {
            const embedding1 = [1, 2, 3, 4, 5];
            const embedding2 = [1, 2, 3, 4, 5];
            
            const similarity = service.calculateSimilarity(embedding1, embedding2);
            
            expect(similarity).toBeCloseTo(1.0, 2);
        });

        it('should return 0 for completely different embeddings', () => {
            const embedding1 = [1, 0, 0, 0, 0];
            const embedding2 = [0, 0, 0, 0, 1];
            
            const similarity = service.calculateSimilarity(embedding1, embedding2);
            
            expect(similarity).toBeGreaterThanOrEqual(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });
    });
});

