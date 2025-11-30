import type { IGraphLayoutService } from '../types/management';
import type { GraphLayout, GraphNode, GraphEdge, Cluster } from '../types/management';
import type { IdeaFile } from '../types/idea';

/**
 * GraphLayoutService - Generates graph layouts for idea clusters
 * Uses simple force-directed layout algorithm (v1 approach)
 */
export class GraphLayoutService implements IGraphLayoutService {
    /**
     * Generate graph layout from clusters
     * @param clusters - Clusters to layout
     * @param width - Canvas width
     * @param height - Canvas height
     * @returns Graph layout with node positions
     */
    layoutGraph(clusters: Cluster[], width: number, height: number): GraphLayout {
        if (clusters.length === 0) {
            return {
                nodes: [],
                edges: [],
                width,
                height
            };
        }

        const nodes: GraphNode[] = [];
        const edges: GraphEdge[] = [];

        // Position cluster centroids in circular arrangement
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.3;

        // Create nodes for each idea
        let nodeIdCounter = 0;
        for (const cluster of clusters) {
            const clusterAngle = (2 * Math.PI * clusters.indexOf(cluster)) / clusters.length;
            const clusterX = centerX + radius * Math.cos(clusterAngle);
            const clusterY = centerY + radius * Math.sin(clusterAngle);

            // Position nodes within cluster (simple grid for now)
            const nodesPerRow = Math.ceil(Math.sqrt(cluster.ideas.length));
            const nodeSpacing = 50;

            cluster.ideas.forEach((idea, index) => {
                const row = Math.floor(index / nodesPerRow);
                const col = index % nodesPerRow;
                const offsetX = (col - nodesPerRow / 2) * nodeSpacing;
                const offsetY = (row - nodesPerRow / 2) * nodeSpacing;

                nodes.push({
                    id: `node-${nodeIdCounter++}`,
                    idea,
                    x: clusterX + offsetX,
                    y: clusterY + offsetY,
                    clusterId: cluster.id
                });
            });
        }

        // Create edges between nodes in same cluster
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                if (nodes[i].clusterId === nodes[j].clusterId) {
                    // Calculate similarity-based weight
                    const weight = this.calculateNodeSimilarity(nodes[i].idea, nodes[j].idea);
                    if (weight > 0.1) { // Only add edges with meaningful similarity
                        edges.push({
                            from: nodes[i].id,
                            to: nodes[j].id,
                            weight
                        });
                    }
                }
            }
        }

        return {
            nodes,
            edges,
            width,
            height
        };
    }

    /**
     * Update layout when ideas change
     * @param layout - Current layout
     * @param changes - Changed ideas
     * @returns Updated layout
     */
    updateLayout(layout: GraphLayout, changes: IdeaFile[]): GraphLayout {
        // If there are no changes or no existing nodes, return layout as-is
        if (!changes.length || !layout.nodes.length) {
            return layout;
        }

        // Index existing nodes by idea filename for quick lookup
        const nodesByFilename = new Map<string, GraphNode>();
        for (const node of layout.nodes) {
            nodesByFilename.set(node.idea.filename, node);
        }

        const updatedNodes: GraphNode[] = [...layout.nodes];
        const updatedEdges: GraphEdge[] = [...layout.edges];

        // Compute a reasonable default position (center of existing nodes)
        const avgX = layout.nodes.reduce((sum, node) => sum + node.x, 0) / layout.nodes.length;
        const avgY = layout.nodes.reduce((sum, node) => sum + node.y, 0) / layout.nodes.length;
        const baseClusterId = layout.nodes[0]?.clusterId ?? 'cluster-0';

        // Track how many new nodes we add so we can give them stable IDs/offsets
        let newNodeIndex = 0;

        for (const idea of changes) {
            const existingNode = nodesByFilename.get(idea.filename);

            if (existingNode) {
                // Update the idea payload in-place while keeping position/cluster
                existingNode.idea = idea;
                continue;
            }

            // Create a new node for the idea, positioned near the existing centroid
            const offset = 30 + newNodeIndex * 20;
            const sign = newNodeIndex % 2 === 0 ? 1 : -1;

            const newNode: GraphNode = {
                id: `node-${updatedNodes.length + newNodeIndex}`,
                idea,
                x: Math.min(Math.max(avgX + sign * offset, 0), layout.width),
                y: Math.min(Math.max(avgY + sign * offset, 0), layout.height),
                clusterId: baseClusterId
            };

            updatedNodes.push(newNode);

            // Create edges from the new node to nodes in the same cluster based on similarity
            for (const existing of layout.nodes) {
                if (existing.clusterId !== newNode.clusterId) continue;

                const weight = this.calculateNodeSimilarity(existing.idea, idea);
                if (weight > 0.1) {
                    updatedEdges.push({
                        from: existing.id,
                        to: newNode.id,
                        weight
                    });
                }
            }

            newNodeIndex++;
        }

        return {
            ...layout,
            nodes: updatedNodes,
            edges: updatedEdges
        };
    }

    /**
     * Calculate similarity between two ideas for edge weight
     */
    private calculateNodeSimilarity(idea1: IdeaFile, idea2: IdeaFile): number {
        let similarity = 0;

        // Category match
        if (idea1.frontmatter.category === idea2.frontmatter.category && idea1.frontmatter.category) {
            similarity += 0.3;
        }

        // Tag overlap
        const tags1 = new Set(idea1.frontmatter.tags);
        const tags2 = new Set(idea2.frontmatter.tags);
        const tagIntersection = new Set([...tags1].filter(t => tags2.has(t)));
        const tagUnion = new Set([...tags1, ...tags2]);
        if (tagUnion.size > 0) {
            similarity += 0.2 * (tagIntersection.size / tagUnion.size);
        }

        // Text similarity (simple word overlap)
        const words1 = new Set(this.tokenize(idea1.body));
        const words2 = new Set(this.tokenize(idea2.body));
        const wordIntersection = new Set([...words1].filter(w => words2.has(w)));
        const wordUnion = new Set([...words1, ...words2]);
        if (wordUnion.size > 0) {
            similarity += 0.5 * (wordIntersection.size / wordUnion.size);
        }

        return Math.min(similarity, 1.0);
    }

    /**
     * Tokenize text into words
     */
    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }
}

