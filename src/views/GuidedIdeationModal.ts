import { Modal, Notice } from 'obsidian';
import type { TransformationPlan, TransformationResult } from '../types/transformation';
import { GuidedIdeationService } from '../services/GuidedIdeationService';

/**
 * Modal for guided ideation transformation
 */
export class GuidedIdeationModal extends Modal {
    private inputEl!: HTMLTextAreaElement;
    private statusEl!: HTMLDivElement;
    private previewContainer!: HTMLDivElement;
    private buttonContainer!: HTMLDivElement;
    private service: GuidedIdeationService;
    private noteContent: string;
    private frontmatter: any;
    private body: string;
    private currentFilename?: string;
    private transformationResult?: TransformationResult;
    private transformationPlan?: TransformationPlan;
    private onAccept?: (result: TransformationResult, plan: TransformationPlan) => Promise<void>;
    private isProcessing: boolean = false;

    constructor(
        app: any,
        service: GuidedIdeationService,
        noteContent: string,
        frontmatter: any,
        body: string,
        currentFilename?: string,
        onAccept?: (result: TransformationResult, plan: TransformationPlan) => Promise<void>
    ) {
        super(app);
        this.service = service;
        this.noteContent = noteContent;
        this.frontmatter = frontmatter;
        this.body = body;
        this.currentFilename = currentFilename;
        this.onAccept = onAccept;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-guided-ideation-modal');

        // Title
        contentEl.createEl('h2', { text: 'Ideatr: Transform' });

        // Description
        const description = contentEl.createEl('p', {
            text: 'Describe the transformation you want to apply to this idea. Examples: "Organize this list alphabetically", "Add three alternatives", "Rename to Project Goodspring"'
        });
        description.addClass('ideatr-modal-description');

        // Input field
        this.inputEl = contentEl.createEl('textarea', {
            attr: {
                placeholder: 'Enter your transformation request...',
                rows: '4'
            }
        });
        this.inputEl.addClass('ideatr-input');
        this.inputEl.style.width = '100%';
        this.inputEl.style.marginBottom = '10px';

        // Status container
        this.statusEl = contentEl.createDiv('ideatr-status');
        this.statusEl.style.display = 'none';

        // Preview container
        this.previewContainer = contentEl.createDiv('ideatr-preview-container');
        this.previewContainer.style.display = 'none';
        this.previewContainer.style.maxHeight = '400px';
        this.previewContainer.style.overflowY = 'auto';
        this.previewContainer.style.padding = '10px';
        this.previewContainer.style.border = '1px solid var(--background-modifier-border)';
        this.previewContainer.style.borderRadius = '4px';
        this.previewContainer.style.marginTop = '10px';
        this.previewContainer.style.marginBottom = '10px';

        // Button container
        this.buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        this.buttonContainer.style.marginTop = '10px';

        // Transform button
        const transformButton = this.buttonContainer.createEl('button', {
            text: 'Transform',
            cls: 'mod-cta'
        });
        transformButton.addEventListener('click', () => this.handleTransform());

        // Cancel button
        const cancelButton = this.buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => this.close());

        // Handle Enter key (Cmd+Enter to submit)
        this.inputEl.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!this.isProcessing) {
                    this.handleTransform();
                }
            }
        });

        // Focus input
        this.inputEl.focus();
    }

    private async handleTransform() {
        const prompt = this.inputEl.value.trim();
        if (!prompt) {
            new Notice('Please enter a transformation request.');
            return;
        }

        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        this.showStatus('Analyzing intent...');

        try {
            // Step 1: Analyze intent
            const plan = await this.service.analyzeIntent(prompt, this.noteContent, this.frontmatter);
            this.transformationPlan = plan;

            this.showStatus('Generating transformation...');

            // Step 2: Execute transformation
            const result = await this.service.executeTransformation(
                prompt,
                plan,
                this.noteContent,
                this.frontmatter,
                this.body,
                this.currentFilename
            );

            this.transformationResult = result;
            this.showPreview(result, plan);
            this.showAcceptButton();

        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Failed to transform idea.');
            console.error('Transformation failed:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    private showStatus(message: string) {
        this.statusEl.empty();
        this.statusEl.style.display = 'block';
        this.statusEl.createEl('p', { text: message });
        this.previewContainer.style.display = 'none';
        this.hideAcceptButton();
    }

    private showError(message: string) {
        this.statusEl.empty();
        this.statusEl.style.display = 'block';
        this.statusEl.addClass('ideatr-error');
        this.statusEl.createEl('p', { text: message });
        this.previewContainer.style.display = 'none';
        this.hideAcceptButton();
    }

    private showPreview(result: TransformationResult, plan: TransformationPlan) {
        this.statusEl.style.display = 'none';
        this.previewContainer.empty();
        this.previewContainer.style.display = 'block';

        // Show plan description
        const planEl = this.previewContainer.createDiv('ideatr-plan-description');
        planEl.createEl('strong', { text: 'Transformation: ' });
        planEl.createEl('span', { text: plan.description });

        // Show summary
        if (result.summary) {
            const summaryEl = this.previewContainer.createDiv('ideatr-summary');
            summaryEl.createEl('strong', { text: 'Summary: ' });
            summaryEl.createEl('span', { text: result.summary });
        }

        // Show filename change if applicable
        if (result.newFilename && result.newFilename !== this.currentFilename) {
            const filenameEl = this.previewContainer.createDiv('ideatr-filename-change');
            filenameEl.createEl('strong', { text: 'Filename: ' });
            filenameEl.createEl('span', { text: `${this.currentFilename} → ${result.newFilename}` });
        }

        // Show body preview
        if (result.body) {
            const bodyLabel = this.previewContainer.createEl('strong', { text: 'Body Preview:' });
            bodyLabel.style.display = 'block';
            bodyLabel.style.marginTop = '10px';
            bodyLabel.style.marginBottom = '5px';

            const bodyPreview = this.previewContainer.createDiv('ideatr-body-preview');
            bodyPreview.style.whiteSpace = 'pre-wrap';
            bodyPreview.style.fontFamily = 'var(--font-monospace)';
            bodyPreview.style.fontSize = '0.9em';
            bodyPreview.style.padding = '10px';
            bodyPreview.style.backgroundColor = 'var(--background-secondary)';
            bodyPreview.style.borderRadius = '4px';
            bodyPreview.textContent = result.body.substring(0, 2000); // Limit preview size
            if (result.body.length > 2000) {
                bodyPreview.textContent += '\n\n... (content truncated for preview)';
            }
        }

        // Show frontmatter changes if applicable
        if (result.frontmatter) {
            const fmLabel = this.previewContainer.createEl('strong', { text: 'Frontmatter Changes:' });
            fmLabel.style.display = 'block';
            fmLabel.style.marginTop = '10px';
            fmLabel.style.marginBottom = '5px';

            const fmPreview = this.previewContainer.createDiv('ideatr-frontmatter-preview');
            fmPreview.style.whiteSpace = 'pre-wrap';
            fmPreview.style.fontFamily = 'var(--font-monospace)';
            fmPreview.style.fontSize = '0.9em';
            fmPreview.style.padding = '10px';
            fmPreview.style.backgroundColor = 'var(--background-secondary)';
            fmPreview.style.borderRadius = '4px';
            fmPreview.textContent = JSON.stringify(result.frontmatter, null, 2);
        }
    }

    private showAcceptButton() {
        // Remove existing accept button if any
        const existingAccept = this.buttonContainer.querySelector('.ideatr-accept-button');
        if (existingAccept) {
            existingAccept.remove();
        }

        const acceptButton = this.buttonContainer.createEl('button', {
            text: 'Accept Changes',
            cls: 'mod-cta ideatr-accept-button'
        });
        acceptButton.style.marginLeft = '10px';
        acceptButton.addEventListener('click', async () => {
            if (this.transformationResult && this.transformationPlan && this.onAccept) {
                try {
                    await this.onAccept(this.transformationResult, this.transformationPlan);
                    this.close();
                } catch (error) {
                    new Notice(`Failed to apply changes: ${error instanceof Error ? error.message : String(error)}`);
                    console.error('Failed to apply transformation:', error);
                }
            }
        });
    }

    private hideAcceptButton() {
        const acceptButton = this.buttonContainer.querySelector('.ideatr-accept-button');
        if (acceptButton) {
            acceptButton.remove();
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}


