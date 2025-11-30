import { Modal, App, Notice } from 'obsidian';
import type { IModelManager } from '../services/ModelManager';

/**
 * ModelDownloadModal - Modal for displaying model download progress
 */
export class ModelDownloadModal extends Modal {
    private modelManager: IModelManager;
    private progressBar!: HTMLElement;
    private progressText!: HTMLElement;
    private cancelButton!: HTMLElement;
    private errorMessage!: HTMLElement;
    private modelInfo!: HTMLElement;
    private retryButton: HTMLElement | null = null;
    private isDownloading: boolean = false;

    constructor(app: App, modelManager: IModelManager) {
        super(app);
        this.modelManager = modelManager;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-download-modal');

        // Title
        contentEl.createEl('h2', { text: 'Download AI Model' });

        // Model information
        const info = this.modelManager.getModelInfo();
        this.modelInfo = contentEl.createEl('div', { cls: 'ideatr-model-info' });
        this.modelInfo.createEl('p', {
            text: `Model: ${info.name}`
        });
        this.modelInfo.createEl('p', {
            text: `Size: ${info.sizeMB.toFixed(1)} MB (${(info.sizeMB / 1024).toFixed(2)} GB)`
        });
        this.modelInfo.createEl('p', {
            text: `Storage: ${this.modelManager.getModelPath()}`
        });

        // Progress bar container
        const progressContainer = contentEl.createEl('div', { cls: 'ideatr-progress-container' });
        
        // Progress bar
        this.progressBar = progressContainer.createEl('div', { cls: 'ideatr-progress-bar' });
        const progressBarFill = this.progressBar.createEl('div', { cls: 'ideatr-progress-bar-fill' });
        progressBarFill.style.width = '0%';

        // Progress text
        this.progressText = progressContainer.createEl('div', { cls: 'ideatr-progress-text' });
        this.progressText.textContent = 'Preparing download...';

        // Error message (hidden initially)
        this.errorMessage = contentEl.createEl('div', {
            cls: 'ideatr-error',
            attr: {
                style: 'display: none; color: var(--text-error); margin-top: 10px;'
            }
        });

        // Button container
        const buttonContainer = contentEl.createEl('div', { cls: 'ideatr-button-container' });

        // Cancel button
        this.cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: 'mod-cancel'
        });
        this.cancelButton.addEventListener('click', () => this.handleCancel());

        // Start download
        this.startDownload();
    }

    private async startDownload(): Promise<void> {
        if (this.isDownloading) {
            return;
        }

        this.isDownloading = true;
        this.cancelButton.textContent = 'Cancel';
        this.errorMessage.style.display = 'none';
        this.progressText.textContent = 'Starting download...';

        try {
            await this.modelManager.downloadModel(
                (progress, downloadedMB, totalMB) => {
                    this.updateProgress(progress, downloadedMB, totalMB);
                }
            );

            // Download complete
            this.progressText.textContent = 'Download complete! Verifying...';
            
            // Verify integrity
            const isValid = await this.modelManager.verifyModelIntegrity();
            
            if (isValid) {
                this.progressText.textContent = 'Download complete and verified!';
                this.cancelButton.textContent = 'Close';
                this.cancelButton.removeClass('mod-cancel');
                this.cancelButton.addClass('mod-cta');
                
                new Notice('Model downloaded successfully');
                
                // Auto-close after 2 seconds
                setTimeout(() => {
                    this.close();
                }, 2000);
            } else {
                this.showError('Downloaded file failed integrity check. Please try again.');
                this.showRetryButton();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Download failed';
            this.showError(errorMessage);
            this.showRetryButton();
        } finally {
            this.isDownloading = false;
        }
    }

    private updateProgress(progress: number, downloadedMB: number, totalMB: number): void {
        // Update progress bar
        const progressBarFill = this.progressBar.querySelector('.ideatr-progress-bar-fill') as HTMLElement;
        if (progressBarFill) {
            progressBarFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }

        // Update progress text
        const progressPercent = Math.round(progress);
        const downloadedGB = (downloadedMB / 1024).toFixed(2);
        const totalGB = (totalMB / 1024).toFixed(2);
        
        // Calculate ETA (rough estimate)
        const remainingMB = totalMB - downloadedMB;
        const speedMBps = downloadedMB > 0 ? downloadedMB / (Date.now() / 1000) : 0; // Rough estimate
        const etaSeconds = speedMBps > 0 ? remainingMB / speedMBps : 0;
        const etaMinutes = Math.ceil(etaSeconds / 60);
        
        let etaText = '';
        if (etaMinutes > 0 && progress > 0 && progress < 100) {
            etaText = ` • ETA: ~${etaMinutes} minute${etaMinutes !== 1 ? 's' : ''}`;
        }

        this.progressText.textContent = 
            `Downloading: ${progressPercent}% (${downloadedGB} GB / ${totalGB} GB)${etaText}`;
    }

    private showError(message: string): void {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
        this.progressText.textContent = 'Download failed';
        
        // Reset progress bar
        const progressBarFill = this.progressBar.querySelector('.ideatr-progress-bar-fill') as HTMLElement;
        if (progressBarFill) {
            progressBarFill.style.width = '0%';
        }
    }

    private showRetryButton(): void {
        if (this.retryButton) {
            return; // Already shown
        }

        const buttonContainer = this.contentEl.querySelector('.ideatr-button-container');
        if (buttonContainer) {
            this.retryButton = buttonContainer.createEl('button', {
                text: 'Retry',
                cls: 'mod-cta'
            });
            this.retryButton.addEventListener('click', () => {
                if (this.retryButton) {
                    this.retryButton.remove();
                    this.retryButton = null;
                }
                this.startDownload();
            });
        }
    }

    private handleCancel(): void {
        if (this.isDownloading) {
            this.modelManager.cancelDownload();
            this.isDownloading = false;
            this.progressText.textContent = 'Download cancelled';
            this.cancelButton.textContent = 'Close';
        } else {
            this.close();
        }
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
        this.isDownloading = false;
        this.retryButton = null;
    }
}

