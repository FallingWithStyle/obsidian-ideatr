/**
 * Modal for displaying cluster analysis
 * QA Issue #5: Enhance analyze-idea-cluster UI
 */

import { App, Modal } from 'obsidian';
import type { IdeaFile } from '../types/idea';

export interface ClusterInfo {
    label: string;
    ideas: IdeaFile[];
    commonThemes?: string[];
    commonTags?: string[];
    statistics?: {
        totalIdeas: number;
        averageAge: number;
        statusDistribution: Record<string, number>;
    };
    relatedClusters?: Array<{ label: string; similarity: number; explanation?: string }>;
}

export class ClusterAnalysisModal extends Modal {
    private cluster: ClusterInfo;
    private onOpenIdea?: (path: string) => void;

    constructor(
        app: App,
        cluster: ClusterInfo,
        onOpenIdea?: (path: string) => void
    ) {
        super(app);
        this.cluster = cluster;
        this.onOpenIdea = onOpenIdea;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Cluster analysis' });

        // Cluster header
        const header = contentEl.createDiv('ideatr-cluster-header');
        header.createEl('h3', { 
            text: this.cluster.label || 'Unnamed Cluster',
            attr: { style: 'margin-bottom: 10px;' }
        });
        header.createEl('p', {
            text: `${this.cluster.ideas.length} idea${this.cluster.ideas.length > 1 ? 's' : ''} in this cluster`,
            attr: { style: 'color: var(--text-muted); margin-bottom: 20px;' }
        });

        // Statistics section
        if (this.cluster.statistics) {
            const statsSection = contentEl.createDiv('ideatr-cluster-stats');
            (statsSection as HTMLElement).setCssProps({
                'margin-bottom': '20px',
                'padding': '10px',
                'background-color': 'var(--background-secondary)',
                'border-radius': '4px'
            });

            statsSection.createEl('h4', { 
                text: 'Statistics',
                attr: { style: 'margin-bottom: 10px;' }
            });

            const statsList = statsSection.createEl('ul', {
                attr: { style: 'margin: 0; padding-left: 20px;' }
            });

            if (this.cluster.statistics.averageAge !== undefined) {
                statsList.createEl('li', {
                    text: `Average age: ${Math.round(this.cluster.statistics.averageAge)} days`
                });
            }

            if (this.cluster.statistics.statusDistribution) {
                const statusItems = Object.entries(this.cluster.statistics.statusDistribution)
                    .map(([status, count]) => `${status}: ${count}`)
                    .join(', ');
                statsList.createEl('li', {
                    text: `Status distribution: ${statusItems}`
                });
            }
        }

        // Common themes/tags
        if (this.cluster.commonTags && this.cluster.commonTags.length > 0) {
            const tagsSection = contentEl.createDiv('ideatr-cluster-tags');
            (tagsSection as HTMLElement).setCssProps({
                'margin-bottom': '20px'
            });

            tagsSection.createEl('h4', { 
                text: 'Common tags',
                attr: { style: 'margin-bottom: 10px;' }
            });

            const tagsContainer = tagsSection.createDiv('ideatr-cluster-tags-list');
            (tagsContainer as HTMLElement).setCssProps({
                'display': 'flex',
                'flex-wrap': 'wrap',
                'gap': '5px'
            });

            this.cluster.commonTags.forEach(tag => {
                tagsContainer.createEl('span', {
                    text: tag,
                    attr: {
                        style: 'background: var(--background-modifier-border); padding: 2px 8px; border-radius: 12px; font-size: 12px;'
                    }
                });
            });
        }

        if (this.cluster.commonThemes && this.cluster.commonThemes.length > 0) {
            const themesSection = contentEl.createDiv('ideatr-cluster-themes');
            (themesSection as HTMLElement).setCssProps({
                'margin-bottom': '20px'
            });

            themesSection.createEl('h4', { 
                text: 'Common themes',
                attr: { style: 'margin-bottom: 10px;' }
            });

            const themesList = themesSection.createEl('ul', {
                attr: { style: 'margin: 0; padding-left: 20px;' }
            });

            this.cluster.commonThemes.forEach(theme => {
                themesList.createEl('li', { text: theme });
            });
        }

        // Cluster members
        const membersSection = contentEl.createDiv('ideatr-cluster-members');
        (membersSection as HTMLElement).setCssProps({
            'margin-bottom': '20px'
        });

        membersSection.createEl('h4', { 
            text: 'Cluster members',
            attr: { style: 'margin-bottom: 10px;' }
        });

        const membersList = membersSection.createDiv('ideatr-cluster-members-list');
        (membersList as HTMLElement).setCssProps({
            'max-height': '300px',
            'overflow-y': 'auto',
            'border': '1px solid var(--background-modifier-border)',
            'border-radius': '4px',
            'padding': '10px'
        });

        this.cluster.ideas.forEach(idea => {
            const memberItem = membersList.createDiv('ideatr-cluster-member-item');
            (memberItem as HTMLElement).setCssProps({
                'margin-bottom': '8px',
                'padding': '8px',
                'cursor': 'pointer',
                'border-radius': '4px',
                'transition': 'background-color 0.2s'
            });

            memberItem.addEventListener('mouseenter', () => {
                (memberItem as HTMLElement).setCssProps({
                    'background-color': 'var(--background-modifier-hover)'
                });
            });
            memberItem.addEventListener('mouseleave', () => {
                (memberItem as HTMLElement).setCssProps({
                    'background-color': 'transparent'
                });
            });

            memberItem.addEventListener('click', () => {
                if (this.onOpenIdea) {
                    // IdeaFile has filename, construct path from it
                    this.onOpenIdea(`Ideas/${idea.filename}`);
                }
            });

            memberItem.createEl('strong', { text: idea.filename });
            if (idea.frontmatter?.category) {
                memberItem.createEl('div', {
                    text: `Category: ${idea.frontmatter.category}`,
                    attr: { style: 'font-size: 12px; color: var(--text-muted); margin-top: 4px;' }
                });
            }
        });

        // Related clusters
        if (this.cluster.relatedClusters && this.cluster.relatedClusters.length > 0) {
            const relatedSection = contentEl.createDiv('ideatr-cluster-related');
            (relatedSection as HTMLElement).setCssProps({
                'margin-bottom': '20px'
            });

            relatedSection.createEl('h4', { 
                text: 'Related clusters',
                attr: { style: 'margin-bottom: 10px;' }
            });

            const relatedList = relatedSection.createEl('ul', {
                attr: { style: 'margin: 0; padding-left: 20px;' }
            });

            this.cluster.relatedClusters.forEach(cluster => {
                const listItem = relatedList.createEl('li', {
                    attr: { style: 'margin-bottom: 8px;' }
                });
                listItem.createEl('strong', {
                    text: `${cluster.label} (similarity: ${(cluster.similarity * 100).toFixed(1)}%)`
                });
                if (cluster.explanation) {
                    listItem.createEl('div', {
                        text: cluster.explanation,
                        attr: {
                            style: 'font-size: 12px; color: var(--text-muted); margin-top: 4px; font-style: italic;'
                        }
                    });
                }
            });
        }

        // Close button
        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        (buttonContainer as HTMLElement).setCssProps({
            'margin-top': '20px'
        });

        const closeButton = buttonContainer.createEl('button', {
            text: 'Close',
            cls: 'mod-cta'
        });
        closeButton.addEventListener('click', () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

