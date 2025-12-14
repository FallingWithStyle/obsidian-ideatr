import { App, Modal, Notice } from 'obsidian';
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
    private frontmatter: Record<string, unknown>;
    private body: string;
    private currentFilename?: string;
    private transformationResult?: TransformationResult;
    private transformationPlan?: TransformationPlan;
    private onAccept?: (result: TransformationResult, plan: TransformationPlan) => Promise<void>;
    private isProcessing: boolean = false;

    constructor(
        app: App,
        service: GuidedIdeationService,
        noteContent: string,
        frontmatter: Record<string, unknown>,
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
        contentEl.createEl('h2', { text: 'Ideatr: transform' });

        // Description
        const description = contentEl.createEl('p', {
            text: 'Describe the transformation you want to apply to this idea. Examples: "organize this list alphabetically", "add three alternatives", "rename to Project Goodspring"' // eslint-disable-line obsidianmd/ui/sentence-case -- Contains quoted examples and proper noun "Project Goodspring"
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
        this.inputEl.setCssProps({
            'width': '100%',
            'margin-bottom': '10px'
        });

        // Status container
        this.statusEl = contentEl.createDiv('ideatr-status');
        (this.statusEl as HTMLElement).setCssProps({
            'display': 'none'
        });

        // Preview container
        this.previewContainer = contentEl.createDiv('ideatr-preview-container');
        (this.previewContainer as HTMLElement).setCssProps({
            'display': 'none',
            'max-height': '400px',
            'overflow-y': 'auto',
            'padding': '10px',
            'border': '1px solid var(--background-modifier-border)',
            'border-radius': '4px',
            'margin-top': '10px',
            'margin-bottom': '10px'
        });

        // Button container
        this.buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        (this.buttonContainer as HTMLElement).setCssProps({
            'margin-top': '10px'
        });

        // Transform button
        const transformButton = this.buttonContainer.createEl('button', {
            text: 'Transform',
            cls: 'mod-cta'
        });
        transformButton.addEventListener('click', () => void this.handleTransform());

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
                    void this.handleTransform();
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
        (this.statusEl as HTMLElement).setCssProps({
            'display': 'block'
        });
        this.statusEl.createEl('p', { text: message });
        (this.previewContainer as HTMLElement).setCssProps({
            'display': 'none'
        });
        this.hideAcceptButton();
    }

    private showError(message: string) {
        this.statusEl.empty();
        (this.statusEl as HTMLElement).setCssProps({
            'display': 'block'
        });
        this.statusEl.addClass('ideatr-error');
        this.statusEl.createEl('p', { text: message });
        (this.previewContainer as HTMLElement).setCssProps({
            'display': 'none'
        });
        this.hideAcceptButton();
    }

    private showPreview(result: TransformationResult, plan: TransformationPlan) {
        (this.statusEl as HTMLElement).setCssProps({
            'display': 'none'
        });
        this.previewContainer.empty();
        (this.previewContainer as HTMLElement).setCssProps({
            'display': 'block'
        });

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
            const bodyLabel = this.previewContainer.createEl('strong', { text: 'Body preview:' });
            (bodyLabel).setCssProps({
                'display': 'block',
                'margin-top': '10px',
                'margin-bottom': '5px'
            });

            const bodyPreview = this.previewContainer.createDiv('ideatr-body-preview');
            (bodyPreview as HTMLElement).setCssProps({
                'white-space': 'pre-wrap',
                'font-family': 'var(--font-monospace)',
                'font-size': '0.9em',
                'padding': '10px',
                'background-color': 'var(--background-secondary)',
                'border-radius': '4px'
            });
            bodyPreview.textContent = result.body.substring(0, 2000); // Limit preview size
            if (result.body.length > 2000) {
                bodyPreview.textContent += '\n\n... (content truncated for preview)';
            }
        }

        // Show frontmatter changes if applicable
        if (result.frontmatter) {
            const fmLabel = this.previewContainer.createEl('strong', { text: 'Frontmatter changes:' });
            (fmLabel).setCssProps({
                'display': 'block',
                'margin-top': '10px',
                'margin-bottom': '5px'
            });

            const fmPreview = this.previewContainer.createDiv('ideatr-frontmatter-preview');
            (fmPreview as HTMLElement).setCssProps({
                'white-space': 'pre-wrap',
                'font-family': 'var(--font-monospace)',
                'font-size': '0.9em',
                'padding': '10px',
                'background-color': 'var(--background-secondary)',
                'border-radius': '4px'
            });
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
            text: 'Accept changes',
            cls: 'mod-cta ideatr-accept-button'
        });
        (acceptButton as HTMLElement).setCssProps({
            'margin-left': '10px'
        });
        acceptButton.addEventListener('click', () => {
            void (async () => {
                if (this.transformationResult && this.transformationPlan && this.onAccept) {
                    try {
                        await this.onAccept(this.transformationResult, this.transformationPlan);
                        this.close();
                    } catch (error) {
                        new Notice(`Failed to apply changes: ${error instanceof Error ? error.message : String(error)}`);
                        console.error('Failed to apply transformation:', error);
                    }
                }
            })();
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


