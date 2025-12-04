/**
 * Modal for displaying related notes with selection
 */

import { App, Modal } from 'obsidian';
import type { RelatedNote } from '../types/classification';

export class RelatedNotesModal extends Modal {
    private relatedNotes: RelatedNote[];
    private existingRelated: string[];
    private onSelect?: (selected: RelatedNote[]) => void;
    private selected: Set<string> = new Set();

    constructor(
        app: App,
        relatedNotes: RelatedNote[],
        existingRelated: string[],
        onSelect?: (selected: RelatedNote[]) => void
    ) {
        super(app);
        this.relatedNotes = relatedNotes;
        this.existingRelated = existingRelated;
        this.onSelect = onSelect;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Related notes' });

        const description = contentEl.createEl('p', {
            text: `Found ${this.relatedNotes.length} related note${this.relatedNotes.length > 1 ? 's' : ''}. Select which ones to link in frontmatter:`
        });
        description.addClass('ideatr-modal-description');

        const listContainer = contentEl.createDiv('ideatr-related-list');

        this.relatedNotes.forEach((note) => {
            const item = listContainer.createDiv('ideatr-related-item');
            
            const checkbox = item.createEl('input', {
                type: 'checkbox',
                attr: { 
                    checked: this.existingRelated.includes(note.path) ? 'true' : null
                }
            });
            
            if (this.existingRelated.includes(note.path)) {
                this.selected.add(note.path);
            }

            checkbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                if (target.checked) {
                    this.selected.add(note.path);
                } else {
                    this.selected.delete(note.path);
                }
            });

            const label = item.createDiv('ideatr-related-label');
            label.createEl('strong', { text: note.title });
            label.createEl('div', {
                text: note.path,
                cls: 'ideatr-related-path'
            });
            if (note.similarity !== undefined) {
                label.createEl('div', {
                    text: `Similarity: ${(note.similarity * 100).toFixed(0)}%`,
                    cls: 'ideatr-related-similarity'
                });
            }
            
            if (this.existingRelated.includes(note.path)) {
                label.createEl('div', {
                    text: '(Already linked)',
                    cls: 'ideatr-related-existing'
                });
            }
        });

        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        
        const linkButton = buttonContainer.createEl('button', {
            text: 'Link selected',
            cls: 'mod-cta'
        });
        linkButton.addEventListener('click', () => {
            const selected = this.relatedNotes.filter(n => this.selected.has(n.path));
            if (this.onSelect) {
                this.onSelect(selected);
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

