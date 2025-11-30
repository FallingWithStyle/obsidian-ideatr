/**
 * Progress modal for batch operations
 */

import { Modal } from 'obsidian';

export interface ProgressUpdate {
    current: number;
    total: number;
    currentItem?: string;
    status?: 'processing' | 'completed' | 'error' | 'cancelled';
    errors?: string[];
}

export class ProgressModal extends Modal {
    private onCancel?: () => void;
    private cancelled: boolean = false;
    private progressContainer!: HTMLElement;
    private statusContainer!: HTMLElement;
    private errorContainer!: HTMLElement;
    private cancelButton: HTMLElement | null = null;

    private title: string;

    constructor(
        app: any,
        title: string,
        onCancel?: () => void
    ) {
        super(app);
        this.onCancel = onCancel;
        this.title = title;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Set title
        contentEl.createEl('h2', { text: this.title });

        // Progress bar
        this.progressContainer = contentEl.createDiv('ideatr-progress-container');
        const progressBar = this.progressContainer.createDiv('ideatr-progress-bar');
        progressBar.style.width = '100%';
        progressBar.style.height = '20px';
        progressBar.style.backgroundColor = 'var(--background-modifier-border)';
        progressBar.style.borderRadius = '4px';
        progressBar.style.overflow = 'hidden';
        
        const progressFill = progressBar.createDiv('ideatr-progress-fill');
        progressFill.style.width = '0%';
        progressFill.style.height = '100%';
        progressFill.style.backgroundColor = 'var(--interactive-accent)';
        progressFill.style.transition = 'width 0.3s ease';
        (progressBar as any).fill = progressFill;

        // Status text
        this.statusContainer = contentEl.createDiv('ideatr-progress-status');
        this.statusContainer.style.marginTop = '10px';
        this.statusContainer.style.fontSize = '14px';
        this.statusContainer.style.color = 'var(--text-muted)';

        // Error container
        this.errorContainer = contentEl.createDiv('ideatr-progress-errors');
        this.errorContainer.style.marginTop = '10px';
        this.errorContainer.style.maxHeight = '200px';
        this.errorContainer.style.overflowY = 'auto';
        this.errorContainer.style.display = 'none';

        // Cancel button
        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        buttonContainer.style.marginTop = '20px';
        
        this.cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: 'mod-cta'
        });
        this.cancelButton.addEventListener('click', () => {
            this.cancelled = true;
            if (this.onCancel) {
                this.onCancel();
            }
            this.close();
        });

        // Store references for updates
        (this as any).progressFill = progressFill;
        (this as any).progressBar = progressBar;
    }

    updateProgress(update: ProgressUpdate): void {
        const progressFill = (this as any).progressFill;
        if (!progressFill) return;

        const percentage = update.total > 0 ? (update.current / update.total) * 100 : 0;
        progressFill.style.width = `${percentage}%`;

        // Update status text
        this.statusContainer.empty();
        if (update.currentItem) {
            this.statusContainer.createEl('div', {
                text: `Processing: ${update.currentItem}`,
                cls: 'ideatr-progress-current-item'
            });
        }
        this.statusContainer.createEl('div', {
            text: `${update.current} / ${update.total} completed`,
            cls: 'ideatr-progress-count'
        });

        // Show errors if any
        if (update.errors && update.errors.length > 0) {
            this.errorContainer.style.display = 'block';
            this.errorContainer.empty();
            this.errorContainer.createEl('strong', { text: 'Errors:' });
            update.errors.forEach(error => {
                const errorItem = this.errorContainer.createEl('div', {
                    text: error,
                    cls: 'ideatr-progress-error'
                });
                errorItem.style.color = 'var(--text-error)';
                errorItem.style.marginTop = '5px';
            });
        }

        // Update status
        if (update.status === 'completed') {
            this.statusContainer.createEl('div', {
                text: '✓ Completed',
                cls: 'ideatr-progress-completed'
            });
            if (this.cancelButton) {
                this.cancelButton.textContent = 'Close';
            }
        } else if (update.status === 'cancelled') {
            this.statusContainer.createEl('div', {
                text: '✗ Cancelled',
                cls: 'ideatr-progress-cancelled'
            });
        }
    }

    isCancelled(): boolean {
        return this.cancelled;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.cancelled = false;
    }
}

