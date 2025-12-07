/**
 * Progress modal for batch operations
 */

import { App, Modal } from 'obsidian';

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
        app: App,
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
        (progressBar as HTMLElement).setCssProps({
            'width': '100%',
            'height': '20px',
            'background-color': 'var(--background-modifier-border)',
            'border-radius': '4px',
            'overflow': 'hidden'
        });
        
        const progressFill = progressBar.createDiv('ideatr-progress-fill');
        (progressFill as HTMLElement).setCssProps({
            'width': '0%',
            'height': '100%',
            'background-color': 'var(--interactive-accent)',
            'transition': 'width 0.3s ease'
        });
        // Store reference on progressBar for updates (not in public API)
        (progressBar as HTMLElement & { fill?: HTMLElement }).fill = progressFill;

        // Status text
        this.statusContainer = contentEl.createDiv('ideatr-progress-status');
        (this.statusContainer).setCssProps({
            'margin-top': '10px',
            'font-size': '14px',
            'color': 'var(--text-muted)'
        });

        // Error container
        this.errorContainer = contentEl.createDiv('ideatr-progress-errors');
        (this.errorContainer).setCssProps({
            'margin-top': '10px',
            'max-height': '200px',
            'overflow-y': 'auto',
            'display': 'none'
        });

        // Cancel button
        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        (buttonContainer as HTMLElement).setCssProps({
            'margin-top': '20px'
        });
        
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

        // Store references for updates (private properties)
        (this as ProgressModal & { progressFill?: HTMLElement; progressBar?: HTMLElement }).progressFill = progressFill;
        (this as ProgressModal & { progressFill?: HTMLElement; progressBar?: HTMLElement }).progressBar = progressBar;
    }

    updateProgress(update: ProgressUpdate): void {
        const progressFill = (this as ProgressModal & { progressFill?: HTMLElement }).progressFill;
        if (!progressFill) return;

        const percentage = update.total > 0 ? (update.current / update.total) * 100 : 0;
        (progressFill).setCssProps({
            'width': `${percentage}%`
        });

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
            (this.errorContainer).setCssProps({
                'display': 'block'
            });
            this.errorContainer.empty();
            this.errorContainer.createEl('strong', { text: 'Errors:' });
            update.errors.forEach(error => {
                const errorItem = this.errorContainer.createEl('div', {
                    text: error,
                    cls: 'ideatr-progress-error'
                });
                (errorItem as HTMLElement).setCssProps({
                    'color': 'var(--text-error)',
                    'margin-top': '5px'
                });
            });
        }

        // Update status
        if (update.status === 'completed') {
            this.statusContainer.createEl('div', {
                // eslint-disable-next-line obsidianmd/ui/sentence-case
                text: '✓ Completed',
                cls: 'ideatr-progress-completed'
            });
            if (this.cancelButton) {
                this.cancelButton.textContent = 'Close';
            }
        } else if (update.status === 'cancelled') {
            this.statusContainer.createEl('div', {
                text: '✗ cancelled',
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

