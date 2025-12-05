/**
 * Shared utility for rendering compact, scannable model comparisons
 * Used by both local and cloud model comparison views
 */

import type { ModelConfig } from '../services/ModelManager';
import type { CloudModelConfig } from './ModelValidator';

/**
 * Common model display interface for rendering
 */
export interface ModelDisplayInfo {
    name: string;
    badge: string;
    description: string;
    quality: number;
    speed: number;
    pros: string[];
    cons: string[];
    bestFor: string;
    // Local model specific
    sizeMB?: number;
    ram?: string;
    // Cloud model specific
    cost?: 'low' | 'medium' | 'high';
    costEstimate?: string;
}

/**
 * Convert local ModelConfig to ModelDisplayInfo
 */
export function localModelToDisplayInfo(model: ModelConfig): ModelDisplayInfo {
    return {
        name: model.name,
        badge: model.badge,
        description: model.description,
        quality: model.quality,
        speed: model.speed,
        pros: model.pros,
        cons: model.cons,
        bestFor: model.bestFor,
        sizeMB: model.sizeMB,
        ram: model.ram
    };
}

/**
 * Convert cloud CloudModelConfig to ModelDisplayInfo
 */
export function cloudModelToDisplayInfo(model: CloudModelConfig): ModelDisplayInfo {
    return {
        name: model.name,
        badge: model.badge,
        description: model.description,
        quality: model.quality,
        speed: model.speed,
        pros: model.pros,
        cons: model.cons,
        bestFor: model.bestFor,
        cost: model.cost,
        costEstimate: model.costEstimate
    };
}

/**
 * Render a compact model card in a standardized format
 */
export function renderCompactModelCard(
    container: HTMLElement,
    model: ModelDisplayInfo,
    isLocal: boolean = false
): HTMLElement {
    const card = container.createDiv({ cls: 'model-comparison-card' });
    (card as HTMLElement).setCssProps({
        'border': '1px solid var(--background-modifier-border)',
        'border-radius': '6px',
        'padding': '0.75em',
        'margin-bottom': '0.75em'
    });

    // Header: Name and Badge in one line
    const header = card.createDiv({ cls: 'model-comparison-header' });
    (header as HTMLElement).setCssProps({
        'display': 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'margin-bottom': '0.5em'
    });
    
    const nameEl = header.createEl('strong', { text: model.name });
    (nameEl as HTMLElement).setCssProps({
        'font-size': '0.95em'
    });
    
    const badge = header.createEl('span', { text: model.badge, cls: 'model-comparison-badge' });
    (badge as HTMLElement).setCssProps({
        'background': 'var(--text-accent)',
        'color': 'var(--text-on-accent)',
        'padding': '0.15em 0.4em',
        'border-radius': '3px',
        'font-size': '0.7em',
        'font-weight': 'bold'
    });

    // Compact stats grid (2 columns)
    const stats = card.createDiv({ cls: 'model-comparison-stats' });
    (stats as HTMLElement).setCssProps({
        'display': 'grid',
        'grid-template-columns': 'repeat(2, 1fr)',
        'gap': '0.4em 1em',
        'margin-bottom': '0.5em',
        'font-size': '0.85em'
    });
    
    stats.createEl('div', { text: `⭐ ${model.quality}/5` });
    stats.createEl('div', { text: `⚡ ${model.speed}/5` });
    
    if (isLocal && model.sizeMB) {
        stats.createEl('div', { text: `📦 ${(model.sizeMB / 1000).toFixed(1)}GB` });
        if (model.ram) {
            stats.createEl('div', { text: `💾 ${model.ram}` });
        }
    } else if (!isLocal && model.costEstimate) {
        stats.createEl('div', { text: `💰 ${model.costEstimate}` });
        if (model.cost) {
            const costLabel = model.cost.charAt(0).toUpperCase() + model.cost.slice(1);
            stats.createEl('div', { text: `💵 ${costLabel}` });
        }
    }

    // Description (compact)
    const desc = card.createEl('p', { text: model.description, cls: 'model-comparison-description' });
    (desc as HTMLElement).setCssProps({
        'margin': '0.4em 0',
        'color': 'var(--text-muted)',
        'font-size': '0.85em',
        'line-height': '1.4'
    });

    // Pros/Cons in compact inline format
    const details = card.createDiv({ cls: 'model-comparison-details' });
    (details as HTMLElement).setCssProps({
        'display': 'flex',
        'gap': '1em',
        'margin-top': '0.4em',
        'font-size': '0.8em'
    });
    
    if (model.pros.length > 0) {
        const prosEl = details.createDiv({ cls: 'model-comparison-pros' });
        (prosEl as HTMLElement).setCssProps({
            'flex': '1'
        });
        prosEl.createEl('strong', { text: '✓ ' });
        prosEl.appendText(model.pros.join(', '));
    }
    
    if (model.cons.length > 0) {
        const consEl = details.createDiv({ cls: 'model-comparison-cons' });
        (consEl as HTMLElement).setCssProps({
            'flex': '1',
            'color': 'var(--text-muted)'
        });
        consEl.createEl('strong', { text: '✗ ' });
        consEl.appendText(model.cons.join(', '));
    }

    // Best for (compact)
    const bestFor = card.createDiv({ cls: 'model-comparison-best-for' });
    (bestFor as HTMLElement).setCssProps({
        'margin-top': '0.4em',
        'padding-top': '0.4em',
        'border-top': '1px solid var(--background-modifier-border)',
        'font-size': '0.8em',
        'color': 'var(--text-muted)'
    });
    bestFor.createEl('strong', { text: 'Best for: ' });
    bestFor.appendText(model.bestFor);

    return card;
}

/**
 * Render a group of models (by provider or category)
 */
export function renderModelGroup(
    container: HTMLElement,
    groupName: string,
    models: ModelDisplayInfo[],
    isLocal: boolean = false
): void {
    if (models.length === 0) return;

    const groupSection = container.createDiv({ cls: 'model-comparison-group' });
    (groupSection as HTMLElement).setCssProps({
        'margin-bottom': '1.5em'
    });
    
    const groupHeader = groupSection.createEl('h5', { text: groupName });
    (groupHeader as HTMLElement).setCssProps({
        'margin': '0 0 0.75em 0',
        'font-size': '0.95em',
        'font-weight': '600'
    });

    for (const model of models) {
        renderCompactModelCard(groupSection, model, isLocal);
    }
}

