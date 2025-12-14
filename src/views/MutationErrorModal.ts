/**
 * Modal for displaying mutation generation errors with retry functionality
 */

import { App, Modal, Notice } from 'obsidian';

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
        app: App,
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
                (previewLabel).setCssProps({
                    'display': 'block',
                    'margin-top': '10px',
                    'margin-bottom': '5px'
                });

                const preview = details.createEl('pre', {
                    text: this.errorDetails.responsePreview,
                    cls: 'ideatr-error-preview'
                });
                (preview as HTMLElement).setCssProps({
                    'font-size': '0.9em',
                    'max-height': '200px',
                    'overflow': 'auto',
                    'padding': '10px',
                    'background-color': 'var(--background-secondary)',
                    'border-radius': '4px',
                    'white-space': 'pre-wrap',
                    'word-break': 'break-word'
                });
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
                text: 'The AI model returned malformed JSON that could not be parsed' // eslint-disable-line obsidianmd/ui/sentence-case -- Contains technical acronym "JSON"
            });
            causesList.createEl('li', {
                text: 'The response may have been cut off mid-generation'
            });
            causesList.createEl('li', {
                text: 'Try again - the model may generate valid JSON on retry' // eslint-disable-line obsidianmd/ui/sentence-case -- Contains technical acronym "JSON"
            });
        }

        // Buttons
        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        (buttonContainer as HTMLElement).setCssProps({
            'margin-top': '20px'
        });

        if (this.errorDetails.canRetry && this.onRetry) {
            const retryButton = buttonContainer.createEl('button', {
                text: 'Retry',
                cls: 'mod-cta'
            });
            retryButton.addEventListener('click', () => {
                void (async () => {
                    this.close();
                    new Notice('Retrying mutation generation...');
                    try {
                        await this.onRetry!();
                    } catch (error) {
                        new Notice(`Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                })();
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

