import { describe, it, expect } from 'vitest';
import { getClusterColor, toRenderableGraph } from '../../src/views/graphRendererUtils';
import type { GraphLayout } from '../../src/types/management';

describe('graphRendererUtils', () => {
    describe('getClusterColor', () => {
        it('should return stable HSL color for the same cluster id', () => {
            const color1 = getClusterColor('cluster-1');
            const color2 = getClusterColor('cluster-1');

            expect(color1).toBe(color2);
            expect(color1.startsWith('hsl(')).toBe(true);
        });

        it('should return different colors for different cluster ids', () => {
            const color1 = getClusterColor('cluster-a');
            const color2 = getClusterColor('cluster-b');

            expect(color1).not.toBe(color2);
        });
    });

    describe('toRenderableGraph', () => {
        it('should convert GraphLayout into renderable nodes and edges', () => {
            const layout: GraphLayout = {
                width: 800,
                height: 600,
                nodes: [
                    {
                        id: 'node-1',
                        idea: {
                            filename: 'idea-1.md',
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
                            body: 'First idea'
                        },
                        x: 100,
                        y: 200,
                        clusterId: 'cluster-1'
                    },
                    {
                        id: 'node-2',
                        idea: {
                            filename: 'idea-2.md',
                            frontmatter: {
                                type: 'idea',
                                status: 'captured',
                                created: '2025-11-27',
                                category: '',
                                tags: [],
                                related: [],
                                domains: [],
                                'existence-check': []
                            },
                            body: 'Second idea'
                        },
                        x: 300,
                        y: 400,
                        clusterId: 'cluster-2'
                    }
                ],
                edges: [
                    { from: 'node-1', to: 'node-2', weight: 0.8 }
                ]
            };

            const renderable = toRenderableGraph(layout);

            expect(renderable.width).toBe(800);
            expect(renderable.height).toBe(600);
            expect(renderable.nodes).toHaveLength(2);
            expect(renderable.edges).toHaveLength(1);
            expect(renderable.nodes[0].title).toContain('idea-1');
            expect(renderable.nodes[0].color.startsWith('hsl(')).toBe(true);
        });
    });
});


