/**
 * Modal for displaying mutation generation errors with retry functionality
 */

import { Modal, Notice } from 'obsidian';

export interface MutationErrorDetails {
    message: string;
    responseLength?: number;
    responsePreview?: string;
    canRetry: boolean;
}

export class MutationErrorModal extends Modal {
    private errorDetails: MutationErrorDetails;
    private onRetry?: () => Promise<void>;

    constructor(
        app: any,
        errorDetails: MutationErrorDetails,
        onRetry?: () => Promise<void>
    ) {
        super(app);
        this.errorDetails = errorDetails;
        this.onRetry = onRetry;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Failed to generate mutations' });
        contentEl.addClass('ideatr-error-modal');

        const errorMessage = contentEl.createDiv('ideatr-error-message');
        errorMessage.createEl('p', {
            text: this.errorDetails.message,
            cls: 'ideatr-error-text'
        });

        // Show additional details if available
        if (this.errorDetails.responseLength !== undefined) {
            const details = contentEl.createDiv('ideatr-error-details');
            details.createEl('p', {
                text: `Response length: ${this.errorDetails.responseLength} characters`,
                cls: 'ideatr-error-detail'
            });

            if (this.errorDetails.responsePreview) {
                const previewLabel = details.createEl('strong', {
                    text: 'Response preview:'
                });
                previewLabel.style.display = 'block';
                previewLabel.style.marginTop = '10px';
                previewLabel.style.marginBottom = '5px';

                const preview = details.createEl('pre', {
                    text: this.errorDetails.responsePreview,
                    cls: 'ideatr-error-preview'
                });
                preview.style.fontSize = '0.9em';
                preview.style.maxHeight = '200px';
                preview.style.overflow = 'auto';
                preview.style.padding = '10px';
                preview.style.backgroundColor = 'var(--background-secondary)';
                preview.style.borderRadius = '4px';
                preview.style.whiteSpace = 'pre-wrap';
                preview.style.wordBreak = 'break-word';
            }
        }

        // Common causes section
        const causes = contentEl.createDiv('ideatr-error-causes');
        causes.createEl('strong', {
            text: 'Possible causes:',
            cls: 'ideatr-error-causes-title'
        });
        const causesList = causes.createEl('ul', {
            cls: 'ideatr-error-causes-list'
        });

        if (this.errorDetails.responseLength === 0) {
            causesList.createEl('li', {
                text: 'The AI model stopped generating or returned an empty response'
            });
            causesList.createEl('li', {
                text: 'The model may have hit a token limit or encountered an error'
            });
            causesList.createEl('li', {
                text: 'Try reducing the number of mutations requested or using a different model'
            });
        } else {
            causesList.createEl('li', {
                text: 'The AI model returned malformed JSON that could not be parsed'
            });
            causesList.createEl('li', {
                text: 'The response may have been cut off mid-generation'
            });
            causesList.createEl('li', {
                text: 'Try again - the model may generate valid JSON on retry'
            });
        }

        // Buttons
        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        buttonContainer.style.marginTop = '20px';

        if (this.errorDetails.canRetry && this.onRetry) {
            const retryButton = buttonContainer.createEl('button', {
                text: 'Retry',
                cls: 'mod-cta'
            });
            retryButton.addEventListener('click', async () => {
                this.close();
                new Notice('Retrying mutation generation...');
                try {
                    await this.onRetry!();
                } catch (error) {
                    new Notice(`Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            });
        }

        const closeButton = buttonContainer.createEl('button', {
            text: 'Close'
        });
        closeButton.addEventListener('click', () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

