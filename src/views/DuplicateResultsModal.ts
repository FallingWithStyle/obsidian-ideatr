/**
 * Modal for displaying duplicate detection results
 */

import { App, Modal } from 'obsidian';
import type { RelatedNote } from '../types/classification';

export class DuplicateResultsModal extends Modal {
    private duplicates: RelatedNote[];
    private onLink?: (selected: RelatedNote[]) => void;
    private selected: Set<string> = new Set();

    constructor(
        app: App,
        duplicates: RelatedNote[],
        onLink?: (selected: RelatedNote[]) => void
    ) {
        super(app);
        this.duplicates = duplicates;
        this.onLink = onLink;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Duplicate ideas found' });

        const description = contentEl.createEl('p', {
            text: `Found ${this.duplicates.length} potential duplicate${this.duplicates.length > 1 ? 's' : ''}. Select which ones to link in frontmatter:`
        });
        description.addClass('ideatr-modal-description');

        const listContainer = contentEl.createDiv('ideatr-duplicate-list');

        this.duplicates.forEach((duplicate) => {
            const item = listContainer.createDiv('ideatr-duplicate-item');
            
            const checkbox = item.createEl('input', {
                type: 'checkbox',
                attr: { checked: 'true' } // All selected by default
            });
            this.selected.add(duplicate.path);

            checkbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                if (target.checked) {
                    this.selected.add(duplicate.path);
                } else {
                    this.selected.delete(duplicate.path);
                }
            });

            const label = item.createDiv('ideatr-duplicate-label');
            label.createEl('strong', { text: duplicate.title });
            label.createEl('div', {
                text: duplicate.path,
                cls: 'ideatr-duplicate-path'
            });
            if (duplicate.similarity !== undefined) {
                label.createEl('div', {
                    text: `Similarity: ${(duplicate.similarity * 100).toFixed(0)}%`,
                    cls: 'ideatr-duplicate-similarity'
                });
            }
        });

        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        
        const linkButton = buttonContainer.createEl('button', {
            text: 'Link selected',
            cls: 'mod-cta'
        });
        linkButton.addEventListener('click', () => {
            const selected = this.duplicates.filter(d => this.selected.has(d.path));
            if (this.onLink) {
                this.onLink(selected);
            }
            this.close();
        });

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

