/**
 * Modal for selecting mutations to save or append
 */

import { App, Modal } from 'obsidian';
import type { Mutation } from '../types/transformation';

export class MutationSelectionModal extends Modal {
    private mutations: Mutation[];
    private onSelect?: (selected: Mutation[], action: 'save' | 'append') => void;
    private selected: Set<number> = new Set();

    constructor(
        app: App,
        mutations: Mutation[],
        onSelect?: (selected: Mutation[], action: 'save' | 'append') => void
    ) {
        super(app);
        this.mutations = mutations;
        this.onSelect = onSelect;
        
        // Select all by default
        mutations.forEach((_, index) => this.selected.add(index));
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Idea mutations' });

        const description = contentEl.createEl('p', {
            text: `Generated ${this.mutations.length} mutation${this.mutations.length > 1 ? 's' : ''}. Select which ones to save:`
        });
        description.addClass('ideatr-modal-description');

        const listContainer = contentEl.createDiv('ideatr-mutation-list');

        this.mutations.forEach((mutation, index) => {
            const item = listContainer.createDiv('ideatr-mutation-item');
            
            const checkbox = item.createEl('input', {
                type: 'checkbox',
                attr: { checked: 'true' }
            });

            checkbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                if (target.checked) {
                    this.selected.add(index);
                } else {
                    this.selected.delete(index);
                }
            });

            const label = item.createDiv('ideatr-mutation-label');
            label.createEl('strong', { text: mutation.title });
            label.createEl('div', {
                text: mutation.description,
                cls: 'ideatr-mutation-description'
            });
            if (mutation.differences.length > 0) {
                const diffList = label.createEl('ul', { cls: 'ideatr-mutation-differences' });
                mutation.differences.forEach(diff => {
                    diffList.createEl('li', { text: diff });
                });
            }
        });

        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        
        const saveButton = buttonContainer.createEl('button', {
            text: 'Save as New Ideas',
            cls: 'mod-cta'
        });
        saveButton.addEventListener('click', () => {
            const selected = this.mutations.filter((_, index) => this.selected.has(index));
            if (this.onSelect) {
                this.onSelect(selected, 'save');
            }
            this.close();
        });

        const appendButton = buttonContainer.createEl('button', {
            text: 'Append to Current Note'
        });
        appendButton.addEventListener('click', () => {
            const selected = this.mutations.filter((_, index) => this.selected.has(index));
            if (this.onSelect) {
                this.onSelect(selected, 'append');
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

