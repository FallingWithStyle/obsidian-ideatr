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
    private downloadStartTime: number = 0;
    private isWarning: boolean = false;
    private allowBackgroundDownload: boolean = false;

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
        progressBarFill.setCssProps({ width: '0%' });

        // Progress text
        this.progressText = progressContainer.createEl('div', { cls: 'ideatr-progress-text' });
        this.progressText.textContent = 'Preparing download...';

        // Error/warning message (hidden initially)
        this.errorMessage = contentEl.createEl('div', {
            cls: 'ideatr-error ideatr-hidden',
            attr: {
                style: 'margin-top: 10px;'
            }
        });

        // Button container
        const buttonContainer = contentEl.createEl('div', { cls: 'ideatr-button-container' });

        // Download in background button
        const backgroundButton = buttonContainer.createEl('button', {
            text: 'Download in Background',
            cls: 'mod-cta'
        });
        backgroundButton.style.marginRight = '10px';
        backgroundButton.addEventListener('click', () => {
            // Allow modal to close, but continue download
            this.allowBackgroundDownload = true;
            new Notice('Download will continue in background. You\'ll be notified when it completes.');
            this.close();
        });

        // Cancel button
        this.cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: 'mod-cancel'
        });
        this.cancelButton.addEventListener('click', () => this.handleCancel());

        // Start download
        this.startDownload();
    }

    private async startDownload(overwrite: boolean = false): Promise<void> {
        if (this.isDownloading) {
            return;
        }

        this.isDownloading = true;
        this.downloadStartTime = Date.now();
        this.cancelButton.textContent = 'Cancel';
        this.errorMessage.addClass('ideatr-hidden');
        this.errorMessage.removeClass('ideatr-visible');
        this.isWarning = false;
        this.progressText.textContent = overwrite ? 'Re-downloading model...' : 'Starting download...';

        try {
            await this.modelManager.downloadModel(
                (progress, downloadedMB, totalMB) => {
                    // Only update UI if modal is still open
                    if (this.isDownloading) {
                        this.updateProgress(progress, downloadedMB, totalMB);
                    }
                },
                undefined,
                overwrite
            );

            // Download complete - show notice even if modal was closed
            new Notice('Model download complete! Verifying...');
            
            // Verify integrity
            const isValid = await this.modelManager.verifyModelIntegrity();
            
            if (isValid) {
                // Only update UI if modal is still open
                if (this.isDownloading) {
                    this.progressText.textContent = 'Download complete and verified!';
                    this.cancelButton.textContent = 'Close';
                    this.cancelButton.removeClass('mod-cancel');
                    this.cancelButton.addClass('mod-cta');
                }
                
                new Notice('Model downloaded and verified successfully!');
                
                // Auto-close after 2 seconds if modal is still open
                if (this.isDownloading) {
                    setTimeout(() => {
                        this.close();
                    }, 2000);
                }
            } else {
                if (this.isDownloading) {
                    this.showError('Downloaded file failed integrity check. Please try again.');
                    this.showRetryButton();
                } else {
                    new Notice('Model download failed integrity check. Please try again.', 5000);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Download failed';
            
            // Check if this is the "already downloaded" case
            if (errorMessage === 'Model already downloaded') {
                this.showWarning('Model is already downloaded. You can download again to replace it.');
                this.showRetryButton('Download again anyway');
            } else {
                this.showError(errorMessage);
                this.showRetryButton();
            }
        } finally {
            this.isDownloading = false;
        }
    }

    private updateProgress(progress: number, downloadedMB: number, totalMB: number): void {
        // Update progress bar
        const progressBarFill = this.progressBar.querySelector('.ideatr-progress-bar-fill') as HTMLElement;
        if (progressBarFill) {
            progressBarFill.setCssProps({ width: `${Math.min(100, Math.max(0, progress))}%` });
        }

        // Update progress text
        const progressPercent = Math.round(progress);
        const downloadedGB = (downloadedMB / 1024).toFixed(2);
        const totalGB = (totalMB / 1024).toFixed(2);
        
        // Calculate ETA (rough estimate)
        const remainingMB = totalMB - downloadedMB;
        const elapsedSeconds = this.downloadStartTime > 0 ? (Date.now() - this.downloadStartTime) / 1000 : 0;
        const speedMBps = downloadedMB > 0 && elapsedSeconds > 0 ? downloadedMB / elapsedSeconds : 0;
        const etaSeconds = speedMBps > 0 ? remainingMB / speedMBps : 0;
        const etaMinutes = Math.ceil(etaSeconds / 60);
        
        let etaText = '';
        if (etaMinutes > 0 && progress > 0 && progress < 100 && etaMinutes < 100000) {
            // Only show ETA if it's reasonable (less than 100k minutes)
            if (etaMinutes < 60) {
                etaText = ` • ETA: ~${etaMinutes} minute${etaMinutes !== 1 ? 's' : ''}`;
            } else {
                const etaHours = Math.floor(etaMinutes / 60);
                const remainingMins = etaMinutes % 60;
                etaText = ` • ETA: ~${etaHours} hour${etaHours !== 1 ? 's' : ''}${remainingMins > 0 ? ` ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}` : ''}`;
            }
        }

        this.progressText.textContent = 
            `Downloading: ${progressPercent}% (${downloadedGB} GB / ${totalGB} GB)${etaText}`;
    }

    private showError(message: string): void {
        this.isWarning = false;
        this.errorMessage.empty();
        this.errorMessage.addClass('ideatr-visible ideatr-error-color');
        this.errorMessage.removeClass('ideatr-hidden');
        this.progressText.textContent = 'Download failed';
        
        // Parse message and make URLs clickable
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = message.split(urlRegex);
        
        parts.forEach((part) => {
            // Check if part is a URL
            if (part.match(/^https?:\/\//)) {
                const link = this.errorMessage.createEl('a', {
                    text: part,
                    href: part,
                    attr: {
                        target: '_blank',
                        rel: 'noopener noreferrer'
                    }
                });
                link.addClass('ideatr-link-accent');
            } else if (part.trim()) {
                this.errorMessage.createEl('span', { text: part });
            }
        });
        
        // Reset progress bar
        const progressBarFill = this.progressBar.querySelector('.ideatr-progress-bar-fill') as HTMLElement;
        if (progressBarFill) {
            progressBarFill.addClass('ideatr-progress-bar-fill');
        progressBarFill.setCssProps({ width: '0%' });
        }
    }

    private showWarning(message: string): void {
        this.isWarning = true;
        this.errorMessage.empty();
        this.errorMessage.addClass('ideatr-visible');
        this.errorMessage.removeClass('ideatr-hidden');
        // Use warning color - fallback to a yellow/orange color if var doesn't exist
        this.errorMessage.addClass('ideatr-warning-color');
        this.progressText.textContent = 'Model already exists';
        
        this.errorMessage.createEl('span', { text: message });
        
        // Reset progress bar
        const progressBarFill = this.progressBar.querySelector('.ideatr-progress-bar-fill') as HTMLElement;
        if (progressBarFill) {
            progressBarFill.addClass('ideatr-progress-bar-fill');
        progressBarFill.setCssProps({ width: '0%' });
        }
    }

    private showRetryButton(buttonText: string = 'Retry'): void {
        if (this.retryButton) {
            return; // Already shown
        }

        const buttonContainer = this.contentEl.querySelector('.ideatr-button-container');
        if (buttonContainer) {
            this.retryButton = buttonContainer.createEl('button', {
                text: buttonText,
                cls: 'mod-cta'
            });
            this.retryButton.addEventListener('click', () => {
                if (this.retryButton) {
                    this.retryButton.remove();
                    this.retryButton = null;
                }
                // If it's a warning (already downloaded), pass overwrite flag
                this.startDownload(this.isWarning);
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
        
        // Only cancel download if we're actually downloading and user didn't choose background download
        // If user clicked "Download in Background", allowBackgroundDownload will be true
        if (this.isDownloading && !this.allowBackgroundDownload) {
            this.modelManager.cancelDownload();
        }
        
        contentEl.empty();
        this.isDownloading = false;
        this.retryButton = null;
        this.allowBackgroundDownload = false;
    }
}

