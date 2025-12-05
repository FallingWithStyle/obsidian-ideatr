/**
 * Modal for previewing reorganized idea with before/after comparison
 */

import { App, Modal } from 'obsidian';
import type { ReorganizationResult } from '../types/transformation';

export class ReorganizationPreviewModal extends Modal {
    private originalText: string;
    private reorganization: ReorganizationResult;
    private onAction?: (action: 'accept' | 'reject') => void;

    constructor(
        app: App,
        originalText: string,
        reorganization: ReorganizationResult,
        onAction?: (action: 'accept' | 'reject') => void
    ) {
        super(app);
        this.originalText = originalText;
        this.reorganization = reorganization;
        this.onAction = onAction;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Reorganized idea preview' });

        const description = contentEl.createEl('p', {
            text: 'Review the reorganized idea below. A backup file has been created. Choose to accept or reject the changes:'
        });
        description.addClass('ideatr-modal-description');

        // Show changes summary
        const changesSummary = contentEl.createDiv('ideatr-reorganization-changes');
        if (this.reorganization.changes.sectionsAdded.length > 0) {
            changesSummary.createEl('div', {
                text: `Sections added: ${this.reorganization.changes.sectionsAdded.join(', ')}`,
                cls: 'ideatr-change-added'
            });
        }
        if (this.reorganization.changes.sectionsRemoved.length > 0) {
            changesSummary.createEl('div', {
                text: `Sections removed: ${this.reorganization.changes.sectionsRemoved.join(', ')}`,
                cls: 'ideatr-change-removed'
            });
        }
        if (this.reorganization.changes.sectionsReorganized.length > 0) {
            changesSummary.createEl('div', {
                text: `Sections reorganized: ${this.reorganization.changes.sectionsReorganized.join(', ')}`,
                cls: 'ideatr-change-reorganized'
            });
        }

        // Create tabs for before/after comparison
        const tabContainer = contentEl.createDiv('ideatr-reorganization-tabs');
        const beforeTab = tabContainer.createEl('button', {
            text: 'Before',
            cls: 'ideatr-tab-button'
        });
        const afterTab = tabContainer.createEl('button', {
            text: 'After',
            cls: 'ideatr-tab-button mod-cta'
        });

        const previewContainer = contentEl.createDiv('ideatr-reorganization-preview');
        (previewContainer as HTMLElement).setCssProps({
            'max-height': '400px',
            'overflow-y': 'auto',
            'padding': '10px',
            'border': '1px solid var(--background-modifier-border)',
            'border-radius': '4px',
            'margin-top': '10px'
        });

        let currentView: 'before' | 'after' = 'after';
        const updateView = () => {
            previewContainer.empty();
            const text = currentView === 'before' ? this.originalText : this.reorganization.reorganizedText;
            const preview = previewContainer.createDiv('ideatr-reorganization-content');
            // Use textContent and CSS to preserve line breaks safely (prevents XSS)
            preview.textContent = text;
            (preview as HTMLElement).setCssProps({
                'white-space': 'pre-wrap'
            });
            
            // Update tab styles
            beforeTab.classList.toggle('mod-cta', currentView === 'before');
            afterTab.classList.toggle('mod-cta', currentView === 'after');
        };

        beforeTab.addEventListener('click', () => {
            currentView = 'before';
            updateView();
        });

        afterTab.addEventListener('click', () => {
            currentView = 'after';
            updateView();
        });

        updateView();

        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        
        const acceptButton = buttonContainer.createEl('button', {
            text: 'Accept changes',
            cls: 'mod-cta'
        });
        acceptButton.addEventListener('click', () => {
            if (this.onAction) {
                this.onAction('accept');
            }
            this.close();
        });

        const rejectButton = buttonContainer.createEl('button', {
            text: 'Reject'
        });
        rejectButton.addEventListener('click', () => {
            if (this.onAction) {
                this.onAction('reject');
            }
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

