import type { GraphLayout, GraphNode } from '../types/management';
import { toRenderableGraph } from './graphRendererUtils';

export interface GraphRendererOptions {
    onNodeClick?: (nodeId: string) => void;
    onNodeHover?: (node: GraphNode | null) => void;
    onNodeContextMenu?: (nodeId: string, event: MouseEvent) => void;
    mini?: boolean;
}

/**
 * Render a GraphLayout into an SVG-based graph inside the given container.
 * This is a lightweight, vis.js-style visualization that supports click
 * interactions and can be used both in the full GraphView and the dashboard
 * mini-graph.
 */
export function renderGraphLayout(
    container: HTMLElement,
    layout: GraphLayout,
    options: GraphRendererOptions = {}
): void {
    const { nodes, edges, width, height } = toRenderableGraph(layout);
    
    // Store reference to original layout for node lookups
    const originalLayout = layout;

    container.empty();

    const wrapper = container.createDiv({ cls: 'ideatr-graph-wrapper' });
    const svgNS = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', options.mini ? '220' : String(width));
    svg.setAttribute('height', options.mini ? '180' : String(height));
    svg.classList.add('ideatr-graph-svg');
    wrapper.appendChild(svg);

    // Draw edges first (so they appear under nodes)
    for (const edge of edges) {
        const from = nodes.find(n => n.id === edge.from);
        const to = nodes.find(n => n.id === edge.to);
        if (!from || !to) continue;

        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', String(from.x));
        line.setAttribute('y1', String(from.y));
        line.setAttribute('x2', String(to.x));
        line.setAttribute('y2', String(to.y));
        line.setAttribute('stroke', 'var(--text-muted)');
        line.setAttribute('stroke-width', String(1 + edge.weight));
        line.setAttribute('stroke-opacity', '0.4');

        svg.appendChild(line);
    }

    // Create tooltip element (will be positioned dynamically)
    const tooltip = document.createElement('div');
    tooltip.classList.add('ideatr-graph-tooltip');
    tooltip.setCssProps({
        'display': 'none',
        'position': 'absolute',
        'pointer-events': 'none',
        'z-index': '1000'
    });
    wrapper.appendChild(tooltip);

    // Track current hovered node for cleanup
    let hoveredNodeId: string | null = null;

    // Draw nodes
    for (const node of nodes) {
        const group = document.createElementNS(svgNS, 'g');
        group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        group.classList.add('ideatr-graph-node');

        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('r', options.mini ? '8' : '10');
        circle.setAttribute('fill', node.color);
        circle.setAttribute('stroke', 'var(--background-primary-alt)');
        circle.setAttribute('stroke-width', '1');
        group.appendChild(circle);

        if (!options.mini) {
            const label = document.createElementNS(svgNS, 'text');
            label.textContent = node.title;
            label.setAttribute('x', '12');
            label.setAttribute('y', '4');
            label.classList.add('ideatr-graph-label');
            group.appendChild(label);
        }

        if (options.onNodeClick) {
            (group as any).style.cursor = 'pointer';
            group.addEventListener('click', () => {
                options.onNodeClick?.(node.id);
            });
        }

        // Add context menu handler (right-click)
        if (options.onNodeContextMenu) {
            group.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                options.onNodeContextMenu?.(node.id, e);
            });
        }

        // Add hover handlers
        if (options.onNodeHover && node.idea) {
            // Find the original GraphNode from layout to pass to callback
            const originalNode = originalLayout.nodes.find(n => n.id === node.id);
            
            group.addEventListener('mouseenter', (e) => {
                hoveredNodeId = node.id;
                if (originalNode) {
                    options.onNodeHover?.(originalNode);
                }
                
                // Show tooltip
                tooltip.setCssProps({
                    'display': 'block'
                });
                updateTooltipContent(tooltip, node.idea);
                positionTooltip(tooltip, e, wrapper);
            });

            group.addEventListener('mousemove', (e) => {
                if (hoveredNodeId === node.id) {
                    positionTooltip(tooltip, e, wrapper);
                }
            });

            group.addEventListener('mouseleave', () => {
                hoveredNodeId = null;
                tooltip.setCssProps({
                    'display': 'none'
                });
                options.onNodeHover?.(null);
            });
        }

        svg.appendChild(group);
    }
}

/**
 * Update tooltip content with idea information
 */
function updateTooltipContent(tooltip: HTMLElement, idea: GraphNode['idea']): void {
    const filename = idea.filename.replace(/\.md$/, '');
    const category = idea.frontmatter.category || 'Uncategorized';
    const tags = idea.frontmatter.tags.length > 0 
        ? idea.frontmatter.tags.join(', ') 
        : 'No tags';
    const preview = idea.body.length > 150 
        ? idea.body.substring(0, 150) + '...' 
        : idea.body;
    const created = idea.frontmatter.created;

    // Clear and rebuild tooltip content safely (prevents XSS)
    tooltip.empty();
    
    const header = tooltip.createDiv('ideatr-tooltip-header');
    header.createEl('strong', { text: filename });
    
    const meta = tooltip.createDiv('ideatr-tooltip-meta');
    meta.createEl('span', { text: `Category: ${category}` });
    meta.createEl('span', { text: `Created: ${created}` });
    
    const tagsDiv = tooltip.createDiv('ideatr-tooltip-tags');
    tagsDiv.textContent = `Tags: ${tags}`;
    
    const previewDiv = tooltip.createDiv('ideatr-tooltip-preview');
    previewDiv.textContent = preview || '(No content)';
}

/**
 * Position tooltip near mouse cursor, ensuring it stays within viewport
 */
function positionTooltip(tooltip: HTMLElement, event: MouseEvent, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Position relative to container
    const x = event.clientX - rect.left + 15; // Offset from cursor
    const y = event.clientY - rect.top - 10; // Offset above cursor
    
    // Ensure tooltip stays within container bounds
    const maxX = rect.width - tooltipRect.width - 10;
    const maxY = rect.height - tooltipRect.height - 10;
    
    tooltip.setCssProps({
        'left': `${Math.min(x, maxX)}px`,
        'top': `${Math.max(10, Math.min(y, maxY))}px`
    });
}


