import { describe, it, expect, beforeEach } from 'vitest';
import { EmbeddingService } from '../../src/services/EmbeddingService';
import type { IdeaFile } from '../../src/types/idea';

describe('EmbeddingService', () => {
    let service: EmbeddingService;

    beforeEach(() => {
        service = new EmbeddingService();
    });

    describe('isAvailable', () => {
        it('should always return true for text similarity approach', () => {
            expect(service.isAvailable()).toBe(true);
        });
    });

    describe('generateEmbedding', () => {
        it('should generate embedding for text', async () => {
            const text = 'A productivity app for developers';
            const embedding = await service.generateEmbedding(text);

            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBeGreaterThan(0);
        });

        it('should generate consistent embeddings for same text', async () => {
            const text = 'Test idea text';
            const embedding1 = await service.generateEmbedding(text);
            const embedding2 = await service.generateEmbedding(text);

            expect(embedding1).toEqual(embedding2);
        });

        it('should generate different embeddings for different texts', async () => {
            const text1 = 'A productivity app';
            const text2 = 'A game about space exploration';
            const embedding1 = await service.generateEmbedding(text1);
            const embedding2 = await service.generateEmbedding(text2);

            expect(embedding1).not.toEqual(embedding2);
        });
    });

    describe('generateEmbeddings', () => {
        it('should generate embeddings for multiple texts', async () => {
            const texts = [
                'A productivity app',
                'A game about space',
                'A hardware device'
            ];

            const embeddings = await service.generateEmbeddings(texts);

            expect(embeddings).toHaveLength(3);
            embeddings.forEach(embedding => {
                expect(Array.isArray(embedding)).toBe(true);
                expect(embedding.length).toBeGreaterThan(0);
            });
        });

        it('should handle empty array', async () => {
            const embeddings = await service.generateEmbeddings([]);
            expect(embeddings).toEqual([]);
        });
    });

    describe('calculateSimilarityMatrix', () => {
        it('should calculate similarity matrix for ideas', async () => {
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
                    body: 'A tool for managing tasks',
                    filename: 'idea2.md'
                }
            ];

            const matrix = await service.calculateSimilarityMatrix(ideas);

            expect(matrix).toHaveLength(2);
            expect(matrix[0]).toHaveLength(2);
            expect(matrix[1]).toHaveLength(2);
            
            // Diagonal should be 1.0 (self-similarity)
            expect(matrix[0][0]).toBeCloseTo(1.0, 2);
            expect(matrix[1][1]).toBeCloseTo(1.0, 2);
            
            // Matrix should be symmetric
            expect(matrix[0][1]).toBeCloseTo(matrix[1][0], 2);
            
            // Similarity should be between 0 and 1
            expect(matrix[0][1]).toBeGreaterThanOrEqual(0);
            expect(matrix[0][1]).toBeLessThanOrEqual(1);
        });
    });
});

