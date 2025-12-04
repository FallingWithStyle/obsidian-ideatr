/**
 * Modal for displaying tenuous links and allowing user actions
 */

import { App, Modal } from 'obsidian';
import type { TenuousLink } from '../services/TenuousLinkService';

export class TenuousLinksModal extends Modal {
    private links: TenuousLink[];
    private onLink?: (link: TenuousLink, action: 'link' | 'combine') => void;
    private onCloseCallback?: () => void;

    constructor(
        app: App,
        links: TenuousLink[],
        onLink?: (link: TenuousLink, action: 'link' | 'combine') => void,
        onClose?: () => void
    ) {
        super(app);
        this.links = links;
        this.onLink = onLink;
        this.onCloseCallback = onClose;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Tenuous links' });

        const description = contentEl.createEl('p', {
            text: `Found ${this.links.length} unexpected connection${this.links.length > 1 ? 's' : ''}. These are ideas with lower similarity but interesting potential connections:`
        });
        description.addClass('ideatr-modal-description');

        const listContainer = contentEl.createDiv('ideatr-tenuous-links-list');

        this.links.forEach((link) => {
            const item = listContainer.createDiv('ideatr-tenuous-link-item');
            item.style.marginBottom = '20px';
            item.style.padding = '10px';
            item.style.border = '1px solid var(--background-modifier-border)';
            item.style.borderRadius = '4px';

            item.createEl('strong', { text: link.idea.title });
            item.createEl('div', {
                text: `Similarity: ${(link.similarity * 100).toFixed(1)}% | Relevance: ${(link.relevance * 100).toFixed(1)}%`,
                cls: 'ideatr-tenuous-link-meta',
                attr: { style: 'font-size: 12px; color: var(--text-muted); margin-top: 5px;' }
            });

            item.createEl('div', {
                text: link.explanation,
                cls: 'ideatr-tenuous-link-explanation',
                attr: { style: 'margin-top: 10px; font-style: italic;' }
            });

            if (link.synergy) {
                item.createEl('div', {
                    text: `💡 Synergy: ${link.synergy}`,
                    cls: 'ideatr-tenuous-link-synergy',
                    attr: { style: 'margin-top: 10px; color: var(--text-accent);' }
                });
            }

        const buttonContainer = item.createDiv('ideatr-modal-buttons');
        buttonContainer.style.marginTop = '10px';

        const linkButton = buttonContainer.createEl('button', {
            text: 'Link ideas',
            cls: 'mod-cta'
        });
        linkButton.addEventListener('click', () => {
            if (this.onLink) {
                this.onLink(link, 'link');
            }
        });

        const combineButton = buttonContainer.createEl('button', {
            text: 'Create combined idea'
        });
        combineButton.addEventListener('click', () => {
            if (this.onLink) {
                this.onLink(link, 'combine');
            }
        });
        });

        const closeButton = contentEl.createDiv('ideatr-modal-buttons').createEl('button', {
            text: 'Close'
        });
        closeButton.addEventListener('click', () => {
            if (this.onCloseCallback) {
                this.onCloseCallback();
            }
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        if (this.onCloseCallback) {
            this.onCloseCallback();
        }
    }
}

