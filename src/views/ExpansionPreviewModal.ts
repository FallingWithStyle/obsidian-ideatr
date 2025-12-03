/**
 * Modal for previewing expanded idea content
 */

import { Modal } from 'obsidian';
import type { ExpansionResult } from '../types/transformation';

export class ExpansionPreviewModal extends Modal {
    private expansion: ExpansionResult;
    private onAction?: (action: 'append' | 'replace') => void;

    constructor(
        app: any,
        expansion: ExpansionResult,
        onAction?: (action: 'append' | 'replace') => void
    ) {
        super(app);
        this.expansion = expansion;
        this.onAction = onAction;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Expanded idea preview' });

        const description = contentEl.createEl('p', {
            text: 'Review the expanded idea content below. Choose to append or replace the current content:'
        });
        description.addClass('ideatr-modal-description');

        const previewContainer = contentEl.createDiv('ideatr-expansion-preview');
        previewContainer.style.maxHeight = '400px';
        previewContainer.style.overflowY = 'auto';
        previewContainer.style.padding = '10px';
        previewContainer.style.border = '1px solid var(--background-modifier-border)';
        previewContainer.style.borderRadius = '4px';
        
        // Render markdown preview (simplified - in production would use Obsidian's markdown renderer)
        const preview = previewContainer.createDiv('ideatr-expansion-content');
        // Use textContent and CSS to preserve line breaks safely (prevents XSS)
        preview.textContent = this.expansion.expandedText;
        preview.style.whiteSpace = 'pre-wrap';

        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        
        const appendButton = buttonContainer.createEl('button', {
            text: 'Append to Note',
            cls: 'mod-cta'
        });
        appendButton.addEventListener('click', () => {
            if (this.onAction) {
                this.onAction('append');
            }
            this.close();
        });

        const replaceButton = buttonContainer.createEl('button', {
            text: 'Replace Content'
        });
        replaceButton.addEventListener('click', () => {
            if (this.onAction) {
                this.onAction('replace');
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

