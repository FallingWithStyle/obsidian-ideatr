/**
 * Modal for displaying cluster analysis
 * QA Issue #5: Enhance analyze-idea-cluster UI
 */

import { Modal } from 'obsidian';
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
        app: any,
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

        contentEl.createEl('h2', { text: 'Cluster Analysis' });

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
            statsSection.style.marginBottom = '20px';
            statsSection.style.padding = '10px';
            statsSection.style.backgroundColor = 'var(--background-secondary)';
            statsSection.style.borderRadius = '4px';

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
            tagsSection.style.marginBottom = '20px';

            tagsSection.createEl('h4', { 
                text: 'Common Tags',
                attr: { style: 'margin-bottom: 10px;' }
            });

            const tagsContainer = tagsSection.createDiv('ideatr-cluster-tags-list');
            tagsContainer.style.display = 'flex';
            tagsContainer.style.flexWrap = 'wrap';
            tagsContainer.style.gap = '5px';

            this.cluster.commonTags.forEach(tag => {
                const tagEl = tagsContainer.createEl('span', {
                    text: tag,
                    attr: {
                        style: 'background: var(--background-modifier-border); padding: 2px 8px; border-radius: 12px; font-size: 12px;'
                    }
                });
            });
        }

        if (this.cluster.commonThemes && this.cluster.commonThemes.length > 0) {
            const themesSection = contentEl.createDiv('ideatr-cluster-themes');
            themesSection.style.marginBottom = '20px';

            themesSection.createEl('h4', { 
                text: 'Common Themes',
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
        membersSection.style.marginBottom = '20px';

        membersSection.createEl('h4', { 
            text: 'Cluster Members',
            attr: { style: 'margin-bottom: 10px;' }
        });

        const membersList = membersSection.createDiv('ideatr-cluster-members-list');
        membersList.style.maxHeight = '300px';
        membersList.style.overflowY = 'auto';
        membersList.style.border = '1px solid var(--background-modifier-border)';
        membersList.style.borderRadius = '4px';
        membersList.style.padding = '10px';

        this.cluster.ideas.forEach(idea => {
            const memberItem = membersList.createDiv('ideatr-cluster-member-item');
            memberItem.style.marginBottom = '8px';
            memberItem.style.padding = '8px';
            memberItem.style.cursor = 'pointer';
            memberItem.style.borderRadius = '4px';
            memberItem.style.transition = 'background-color 0.2s';

            memberItem.addEventListener('mouseenter', () => {
                memberItem.style.backgroundColor = 'var(--background-modifier-hover)';
            });
            memberItem.addEventListener('mouseleave', () => {
                memberItem.style.backgroundColor = 'transparent';
            });

            memberItem.addEventListener('click', () => {
                if (this.onOpenIdea) {
                    this.onOpenIdea(idea.path);
                }
            });

            memberItem.createEl('strong', { text: idea.name || idea.path });
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
            relatedSection.style.marginBottom = '20px';

            relatedSection.createEl('h4', { 
                text: 'Related Clusters',
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
        buttonContainer.style.marginTop = '20px';

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

