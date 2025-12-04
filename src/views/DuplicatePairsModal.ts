/**
 * Modal for displaying duplicate pairs with bulk actions
 * QA Issue #3: Complete find-all-duplicates UI
 */

import { App, Modal } from 'obsidian';
import type { TFile } from 'obsidian';

export interface DuplicatePair {
    file1: TFile;
    file2: TFile;
    similarity: number;
}

export type BulkAction = 'link' | 'archive' | 'merge';

export class DuplicatePairsModal extends Modal {
    private pairs: DuplicatePair[];
    private selected: Set<number> = new Set();
    private onBulkAction?: (pairs: DuplicatePair[], action: BulkAction) => void;
    private onLink?: (pair: DuplicatePair) => void;
    private onArchive?: (pair: DuplicatePair) => void;
    private onMerge?: (pair: DuplicatePair) => void;

    constructor(
        app: App,
        pairs: DuplicatePair[],
        options?: {
            onBulkAction?: (pairs: DuplicatePair[], action: BulkAction) => void;
            onLink?: (pair: DuplicatePair) => void;
            onArchive?: (pair: DuplicatePair) => void;
            onMerge?: (pair: DuplicatePair) => void;
        }
    ) {
        super(app);
        this.pairs = pairs;
        this.onBulkAction = options?.onBulkAction;
        this.onLink = options?.onLink;
        this.onArchive = options?.onArchive;
        this.onMerge = options?.onMerge;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Duplicate pairs found' });

        const description = contentEl.createEl('p', {
            text: `Found ${this.pairs.length} duplicate pair${this.pairs.length > 1 ? 's' : ''}. Select pairs and choose an action:`
        });
        description.addClass('ideatr-modal-description');

        const listContainer = contentEl.createDiv('ideatr-duplicate-pairs-list');
        listContainer.style.maxHeight = '400px';
        listContainer.style.overflowY = 'auto';
        listContainer.style.marginBottom = '20px';

        this.pairs.forEach((pair, index) => {
            const item = listContainer.createDiv('ideatr-duplicate-pair-item');
            item.style.marginBottom = '15px';
            item.style.padding = '10px';
            item.style.border = '1px solid var(--background-modifier-border)';
            item.style.borderRadius = '4px';
            
            const checkbox = item.createEl('input', {
                type: 'checkbox',
                attr: { checked: 'true' }
            });
            this.selected.add(index);
            checkbox.style.marginRight = '10px';
            checkbox.style.marginBottom = '10px';

            checkbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                if (target.checked) {
                    this.selected.add(index);
                } else {
                    this.selected.delete(index);
                }
            });

            const pairInfo = item.createDiv('ideatr-duplicate-pair-info');
            
            const similarity = pairInfo.createEl('div', {
                text: `Similarity: ${(pair.similarity * 100).toFixed(1)}%`,
                cls: 'ideatr-duplicate-pair-similarity'
            });
            similarity.style.fontWeight = 'bold';
            similarity.style.marginBottom = '8px';
            similarity.style.color = 'var(--text-accent)';

            const file1Div = pairInfo.createDiv('ideatr-duplicate-pair-file');
            file1Div.createEl('strong', { text: 'File 1: ' });
            file1Div.createEl('span', { text: pair.file1.name });
            file1Div.style.marginBottom = '4px';

            const file2Div = pairInfo.createDiv('ideatr-duplicate-pair-file');
            file2Div.createEl('strong', { text: 'File 2: ' });
            file2Div.createEl('span', { text: pair.file2.name });
            file2Div.style.marginBottom = '8px';

            // Individual action buttons for this pair
            const pairActions = item.createDiv('ideatr-duplicate-pair-actions');
            pairActions.style.marginTop = '8px';
            pairActions.style.display = 'flex';
            pairActions.style.gap = '8px';

            const linkBtn = pairActions.createEl('button', {
                text: 'Link',
                attr: { style: 'font-size: 11px; padding: 4px 8px;' }
            });
            linkBtn.addEventListener('click', () => {
                if (this.onLink) {
                    this.onLink(pair);
                }
            });

            const archiveBtn = pairActions.createEl('button', {
                text: 'Archive',
                attr: { style: 'font-size: 11px; padding: 4px 8px;' }
            });
            archiveBtn.addEventListener('click', () => {
                if (this.onArchive) {
                    this.onArchive(pair);
                }
            });

            const mergeBtn = pairActions.createEl('button', {
                text: 'Merge',
                attr: { style: 'font-size: 11px; padding: 4px 8px;' }
            });
            mergeBtn.addEventListener('click', () => {
                if (this.onMerge) {
                    this.onMerge(pair);
                }
            });
        });

        // Bulk actions section
        const bulkSection = contentEl.createDiv('ideatr-duplicate-bulk-actions');
        bulkSection.style.marginTop = '20px';
        bulkSection.style.paddingTop = '20px';
        bulkSection.style.borderTop = '1px solid var(--background-modifier-border)';

        bulkSection.createEl('h3', { 
            text: 'Bulk actions',
            attr: { style: 'margin-bottom: 10px;' }
        });

        bulkSection.createEl('p', {
            text: `Apply action to ${this.selected.size} selected pair${this.selected.size > 1 ? 's' : ''}:`,
            attr: { style: 'font-size: 12px; color: var(--text-muted); margin-bottom: 10px;' }
        });

        const bulkButtonContainer = bulkSection.createDiv('ideatr-modal-buttons');
        bulkButtonContainer.style.display = 'flex';
        bulkButtonContainer.style.gap = '10px';

        const bulkLinkButton = bulkButtonContainer.createEl('button', {
            text: 'Link selected',
            cls: 'mod-cta'
        });
        bulkLinkButton.addEventListener('click', () => {
            const selectedPairs = this.pairs.filter((_, i) => this.selected.has(i));
            if (this.onBulkAction) {
                this.onBulkAction(selectedPairs, 'link');
            }
        });

        const bulkArchiveButton = bulkButtonContainer.createEl('button', {
            text: 'Archive selected'
        });
        bulkArchiveButton.addEventListener('click', () => {
            const selectedPairs = this.pairs.filter((_, i) => this.selected.has(i));
            if (this.onBulkAction) {
                this.onBulkAction(selectedPairs, 'archive');
            }
        });

        const bulkMergeButton = bulkButtonContainer.createEl('button', {
            text: 'Merge selected'
        });
        bulkMergeButton.addEventListener('click', () => {
            const selectedPairs = this.pairs.filter((_, i) => this.selected.has(i));
            if (this.onBulkAction) {
                this.onBulkAction(selectedPairs, 'merge');
            }
        });

        const cancelButton = bulkButtonContainer.createEl('button', {
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

