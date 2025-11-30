import { describe, it, expect, beforeEach } from 'vitest';
import { GraphLayoutService } from '../../src/services/GraphLayoutService';
import type { Cluster, GraphLayout } from '../../src/types/management';
import type { IdeaFile } from '../../src/types/idea';

describe('GraphLayoutService', () => {
    let service: GraphLayoutService;

    beforeEach(() => {
        service = new GraphLayoutService();
    });

    describe('layoutGraph', () => {
        it('should create graph layout from clusters', () => {
            const clusters: Cluster[] = [
                {
                    id: 'cluster-0',
                    ideas: [
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
                            body: 'Idea 1',
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
                            body: 'Idea 2',
                            filename: 'idea2.md'
                        }
                    ],
                    label: 'SaaS'
                },
                {
                    id: 'cluster-1',
                    ideas: [
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
                            body: 'Idea 3',
                            filename: 'idea3.md'
                        }
                    ],
                    label: 'Game'
                }
            ];

            const layout = service.layoutGraph(clusters, 800, 600);

            expect(layout).toBeDefined();
            expect(layout.nodes).toHaveLength(3);
            expect(layout.edges.length).toBeGreaterThan(0);
            expect(layout.width).toBe(800);
            expect(layout.height).toBe(600);

            // Check nodes have positions
            layout.nodes.forEach(node => {
                expect(node.x).toBeGreaterThanOrEqual(0);
                expect(node.x).toBeLessThanOrEqual(800);
                expect(node.y).toBeGreaterThanOrEqual(0);
                expect(node.y).toBeLessThanOrEqual(600);
                expect(node.clusterId).toBeDefined();
            });
        });

        it('should handle empty clusters', () => {
            const layout = service.layoutGraph([], 800, 600);

            expect(layout.nodes).toEqual([]);
            expect(layout.edges).toEqual([]);
            expect(layout.width).toBe(800);
            expect(layout.height).toBe(600);
        });

        it('should assign cluster IDs to nodes', () => {
            const clusters: Cluster[] = [
                {
                    id: 'cluster-0',
                    ideas: [
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
                            body: 'Idea 1',
                            filename: 'idea1.md'
                        }
                    ],
                    label: 'SaaS'
                }
            ];

            const layout = service.layoutGraph(clusters, 800, 600);

            expect(layout.nodes[0].clusterId).toBe('cluster-0');
        });
    });

    describe('updateLayout', () => {
        it('should append new nodes for newly added ideas (QA 4.3)', () => {
            const clusters: Cluster[] = [
                {
                    id: 'cluster-0',
                    ideas: [
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
                            body: 'Idea 1',
                            filename: 'idea1.md'
                        }
                    ],
                    label: 'SaaS'
                }
            ];

            const initialLayout = service.layoutGraph(clusters, 800, 600);
            
            const newIdeas: IdeaFile[] = [
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-29',
                        category: 'saas',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'New Idea',
                    filename: 'idea2.md'
                }
            ];

            const updatedLayout = service.updateLayout(initialLayout, newIdeas);

            expect(updatedLayout).toBeDefined();
            // Layout should now contain an additional node for the new idea
            expect(updatedLayout.nodes.length).toBeGreaterThan(initialLayout.nodes.length);
            expect(
                updatedLayout.nodes.some(node => node.idea.filename === 'idea2.md')
            ).toBe(true);
        });
    });
});

