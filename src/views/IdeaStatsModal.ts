/**
 * Modal for displaying idea statistics
 * QA Issue #6: Enhance show-idea-stats UI
 */

import { App, Modal } from 'obsidian';
import type { IdeaFrontmatter } from '../types/idea';
import type { IIdeaRepository } from '../types/management';
import { RelatedIdConverter } from '../utils/RelatedIdConverter';

export interface IdeaStats {
    age: number; // days
    status: string;
    category: string;
    relatedCount: number;
    tagsCount: number;
    domainsCount: number;
    lastModified: Date;
    created: Date;
    frontmatter?: IdeaFrontmatter;
}

export class IdeaStatsModal extends Modal {
    private stats: IdeaStats;
    private ideaRepository?: IIdeaRepository;
    private idConverter?: RelatedIdConverter;

    constructor(
        app: App,
        stats: IdeaStats,
        ideaRepository?: IIdeaRepository
    ) {
        super(app);
        this.stats = stats;
        this.ideaRepository = ideaRepository;
        if (ideaRepository) {
            this.idConverter = new RelatedIdConverter(ideaRepository);
        }
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Idea statistics' });

        // Stats grid
        const statsGrid = contentEl.createDiv('ideatr-stats-grid');
        statsGrid.style.display = 'grid';
        statsGrid.style.gridTemplateColumns = '1fr 1fr';
        statsGrid.style.gap = '15px';
        statsGrid.style.marginBottom = '20px';

        // Age
        this.createStatCard(statsGrid, 'Age', `${this.stats.age} day${this.stats.age !== 1 ? 's' : ''}`);
        
        // Status
        this.createStatCard(statsGrid, 'Status', this.stats.status || 'unknown');
        
        // Category
        this.createStatCard(statsGrid, 'Category', this.stats.category || 'none');
        
        // Related notes
        this.createStatCard(statsGrid, 'Related Notes', this.stats.relatedCount.toString());
        
        // Tags
        this.createStatCard(statsGrid, 'Tags', this.stats.tagsCount.toString());
        
        // Domains
        this.createStatCard(statsGrid, 'Domains', this.stats.domainsCount.toString());

        // Dates section
        const datesSection = contentEl.createDiv('ideatr-stats-dates');
        datesSection.style.marginBottom = '20px';
        datesSection.style.padding = '10px';
        datesSection.style.backgroundColor = 'var(--background-secondary)';
        datesSection.style.borderRadius = '4px';

        datesSection.createEl('h4', { 
            text: 'Dates',
            attr: { style: 'margin-bottom: 10px;' }
        });

        const datesList = datesSection.createEl('ul', {
            attr: { style: 'margin: 0; padding-left: 20px;' }
        });

        datesList.createEl('li', {
            text: `Created: ${this.stats.created.toLocaleDateString()}`
        });

        datesList.createEl('li', {
            text: `Last modified: ${this.stats.lastModified.toLocaleDateString()}`
        });

        // Additional info if frontmatter available
        if (this.stats.frontmatter) {
            const additionalSection = contentEl.createDiv('ideatr-stats-additional');
            additionalSection.style.marginBottom = '20px';

            if (this.stats.frontmatter.tags && this.stats.frontmatter.tags.length > 0) {
                const tagsSection = additionalSection.createDiv('ideatr-stats-tags');
                tagsSection.style.marginBottom = '10px';

                tagsSection.createEl('h4', { 
                    text: 'Tags',
                    attr: { style: 'margin-bottom: 10px;' }
                });

                const tagsContainer = tagsSection.createDiv('ideatr-stats-tags-list');
                tagsContainer.style.display = 'flex';
                tagsContainer.style.flexWrap = 'wrap';
                tagsContainer.style.gap = '5px';

                this.stats.frontmatter.tags.forEach(tag => {
                    tagsContainer.createEl('span', {
                        text: tag,
                        attr: {
                            style: 'background: var(--background-modifier-border); padding: 2px 8px; border-radius: 12px; font-size: 12px;'
                        }
                    });
                });
            }

            if (this.stats.frontmatter.related && this.stats.frontmatter.related.length > 0) {
                const relatedSection = additionalSection.createDiv('ideatr-stats-related');
                relatedSection.style.marginBottom = '10px';

                relatedSection.createEl('h4', { 
                    text: 'Related notes',
                    attr: { style: 'margin-bottom: 10px;' }
                });

                const relatedList = relatedSection.createEl('ul', {
                    attr: { style: 'margin: 0; padding-left: 20px; max-height: 150px; overflow-y: auto;' }
                });

                // Handle both IDs (numbers) and legacy paths (strings)
                const relatedItems = this.stats.frontmatter.related;
                const relatedIds = relatedItems.filter((item): item is number => typeof item === 'number' && item !== 0) as number[];
                
                if (relatedIds.length > 0 && this.idConverter) {
                    // Load titles for tooltips
                    try {
                        const titles = await this.idConverter.idsToTitles(relatedIds);
                        relatedIds.forEach(id => {
                            const listItem = relatedList.createEl('li', {
                                attr: { style: 'font-size: 12px; cursor: help;' }
                            });
                            const idSpan = listItem.createEl('span', {
                                text: id.toString(),
                                attr: {
                                    style: 'text-decoration: underline; text-decoration-style: dotted;',
                                    title: titles.get(id) || `ID: ${id}`
                                }
                            });
                        });
                    } catch {
                        // Fallback if title lookup fails
                        relatedIds.forEach(id => {
                            relatedList.createEl('li', {
                                text: id.toString(),
                                attr: { style: 'font-size: 12px;' }
                            });
                        });
                    }
                } else {
                    // Legacy: handle string paths or if no converter available
                    relatedItems.forEach(item => {
                        const text = typeof item === 'number' ? item.toString() : item;
                        relatedList.createEl('li', {
                            text: text,
                            attr: { style: 'font-size: 12px;' }
                        });
                    });
                }
            }
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

    private createStatCard(container: HTMLElement, label: string, value: string): HTMLElement {
        const card = container.createDiv('ideatr-stat-card');
        card.style.padding = '10px';
        card.style.backgroundColor = 'var(--background-secondary)';
        card.style.borderRadius = '4px';
        card.style.border = '1px solid var(--background-modifier-border)';

        card.createEl('div', {
            text: label,
            attr: {
                style: 'font-size: 12px; color: var(--text-muted); margin-bottom: 5px;'
            }
        });

        card.createEl('div', {
            text: value,
            attr: {
                style: 'font-size: 16px; font-weight: bold;'
            }
        });

        return card;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

