import { Modal, App } from 'obsidian';
import type { ClassificationResult } from '../types/classification';

/**
 * ClassificationResultsModal - Modal for reviewing and editing classification results
 */
export class ClassificationResultsModal extends Modal {
    private results: ClassificationResult;
    private onAccept: (results: ClassificationResult) => void;
    private onEdit: () => void;
    private onRetry: () => void;
    private editedTags: string[] = [];

    constructor(
        app: App,
        results: ClassificationResult,
        onAccept: (results: ClassificationResult) => void,
        onEdit: () => void,
        onRetry: () => void
    ) {
        super(app);
        this.results = results;
        this.onAccept = onAccept;
        this.onEdit = onEdit;
        this.onRetry = onRetry;
        this.editedTags = [...results.tags];
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-classification-results-modal');

        // Title
        contentEl.createEl('h2', { text: 'Classification results' });

        // Category display
        const categoryContainer = contentEl.createEl('div', { cls: 'ideatr-setting-item' });
        categoryContainer.createEl('label', { text: 'Category:', attr: { for: 'ideatr-category-display' } });
        const categoryDisplay = categoryContainer.createEl('div', {
            cls: 'ideatr-category',
            text: this.results.category || '(none)'
        });
        if (!this.results.category) {
            categoryDisplay.addClass('ideatr-empty');
        }

        // Tags display (editable)
        const tagsContainer = contentEl.createEl('div', { cls: 'ideatr-setting-item' });
        tagsContainer.createEl('label', { text: 'Tags:' });
        const tagsList = tagsContainer.createEl('div', { cls: 'ideatr-tags-list' });

        // Display existing tags with remove buttons
        this.editedTags.forEach((tag, index) => {
            const tagItem = tagsList.createEl('div', { cls: 'ideatr-tag-item' });
            const tagInput = tagItem.createEl('input', {
                attr: {
                    type: 'text',
                    value: tag,
                    placeholder: 'Tag name'
                },
                cls: 'ideatr-tag-input'
            });
            tagInput.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                this.editedTags[index] = target.value.trim();
            });

            const removeButton = tagItem.createEl('button', {
                text: '×',
                cls: 'ideatr-remove-tag'
            });
            removeButton.addEventListener('click', () => {
                this.editedTags.splice(index, 1);
                this.renderTags(tagsList);
            });
        });

        // Add tag button
        const addTagButton = tagsList.createEl('button', {
            text: '+ Add Tag',
            cls: 'ideatr-add-tag'
        });
        addTagButton.addEventListener('click', () => {
            this.editedTags.push('');
            this.renderTags(tagsList);
        });

        // Confidence display (if available)
        if (this.results.confidence !== undefined) {
            const confidenceContainer = contentEl.createEl('div', { cls: 'ideatr-setting-item' });
            confidenceContainer.createEl('label', { text: 'Confidence:' });
            const confidenceBar = confidenceContainer.createEl('div', { cls: 'ideatr-confidence-bar' });
            confidenceBar.createEl('div', {
                cls: 'ideatr-confidence-fill',
                attr: {
                    style: `width: ${(this.results.confidence * 100).toFixed(0)}%`
                }
            });
            confidenceContainer.createEl('span', {
                cls: 'ideatr-confidence-text',
                text: `${(this.results.confidence * 100).toFixed(0)}%`
            });
        }

        // Button container
        const buttonContainer = contentEl.createEl('div', { cls: 'ideatr-button-container' });

        // Accept button
        const acceptButton = buttonContainer.createEl('button', {
            text: 'Accept',
            cls: 'mod-cta'
        });
        acceptButton.addEventListener('click', () => this.handleAccept());

        // Edit button (opens note editor)
        const editButton = buttonContainer.createEl('button', {
            text: 'Edit in Note'
        });
        editButton.addEventListener('click', () => this.handleEdit());

        // Retry button
        const retryButton = buttonContainer.createEl('button', {
            text: 'Retry'
        });
        retryButton.addEventListener('click', () => this.handleRetry());

        // Cancel button
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: 'mod-cancel'
        });
        cancelButton.addEventListener('click', () => this.close());
    }

    private renderTags(container: HTMLElement): void {
        container.empty();

        // Display existing tags with remove buttons
        this.editedTags.forEach((tag, index) => {
            const tagItem = container.createEl('div', { cls: 'ideatr-tag-item' });
            const tagInput = tagItem.createEl('input', {
                attr: {
                    type: 'text',
                    value: tag,
                    placeholder: 'Tag name'
                },
                cls: 'ideatr-tag-input'
            });
            tagInput.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                this.editedTags[index] = target.value.trim();
            });

            const removeButton = tagItem.createEl('button', {
                text: '×',
                cls: 'ideatr-remove-tag'
            });
            removeButton.addEventListener('click', () => {
                this.editedTags.splice(index, 1);
                this.renderTags(container);
            });
        });

        // Add tag button
        const addTagButton = container.createEl('button', {
            text: '+ Add Tag',
            cls: 'ideatr-add-tag'
        });
        addTagButton.addEventListener('click', () => {
            this.editedTags.push('');
            this.renderTags(container);
        });
    }

    private handleAccept(): void {
        // Filter out empty tags
        const validTags = this.editedTags.filter(tag => tag.trim().length > 0);

        const updatedResults: ClassificationResult = {
            ...this.results,
            tags: validTags
        };

        this.onAccept(updatedResults);
        this.close();
    }

    private handleEdit(): void {
        this.close();
        this.onEdit();
    }

    private handleRetry(): void {
        this.close();
        this.onRetry();
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}

