import type { GraphLayout, GraphNode } from '../types/management';

/**
 * Map a clusterId to a stable HSL color so that clusters are visually distinct.
 * This is kept pure and testable (no DOM access) so we can validate graph styling
 * behavior without view-level tests.
 */
export function getClusterColor(clusterId: string): string {
    // Simple deterministic hash → hue in [0, 360)
    let hash = 0;
    for (let i = 0; i < clusterId.length; i++) {
        hash = (hash * 31 + clusterId.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    const saturation = 60;
    const lightness = 55;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Convert a GraphLayout into simple renderable structures that can be consumed
 * by different renderers (SVG, Canvas, etc.). This is intentionally free of
 * any DOM or Obsidian APIs for easier testing.
 */
export function toRenderableGraph(layout: GraphLayout) {
    const nodes = layout.nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        clusterId: node.clusterId,
        color: getClusterColor(node.clusterId),
        title: getNodeTitle(node),
        idea: node.idea // Include full idea data for tooltips
    }));

    const edges = layout.edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        weight: edge.weight
    }));

    return { nodes, edges, width: layout.width, height: layout.height };
}

function getNodeTitle(node: GraphNode): string {
    const filename = node.idea.filename.replace(/\.md$/, '');
    const category = node.idea.frontmatter.category || 'Uncategorized';
    return `${filename} [${category}]`;
}


