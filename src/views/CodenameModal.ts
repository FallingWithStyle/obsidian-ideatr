import { Modal, App, Notice } from 'obsidian';
import type { ILLMService } from '../types/classification';

/**
 * CodenameModal - Modal for generating or entering a codename for an idea
 */
export class CodenameModal extends Modal {
    private inputEl!: HTMLInputElement;
    private onSubmit: (codename: string) => void;
    private currentCodename?: string;
    private ideaBody?: string;
    private llmService?: ILLMService;
    private generateButton?: HTMLButtonElement;
    private isGenerating: boolean = false;

    constructor(
        app: App,
        onSubmit: (codename: string) => void,
        currentCodename?: string,
        ideaBody?: string,
        llmService?: ILLMService
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.currentCodename = currentCodename;
        this.ideaBody = ideaBody;
        this.llmService = llmService;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-codename-modal');

        // Title
        contentEl.createEl('h2', { text: 'Generate Codename' });

        // Description
        contentEl.createEl('p', {
            text: 'Enter or generate a codename for this idea:',
            cls: 'ideatr-codename-description'
        });

        // Input field
        this.inputEl = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'Enter codename...',
            value: this.currentCodename || ''
        });
        this.inputEl.addClass('ideatr-codename-input');
        this.inputEl.style.width = '100%';
        this.inputEl.style.marginBottom = '1rem';

        // Button container
        const buttonContainer = contentEl.createEl('div', {
            cls: 'ideatr-button-container'
        });

        // Generate button (if LLM is available and idea body is provided)
        if (this.llmService?.isAvailable() && this.ideaBody) {
            this.generateButton = buttonContainer.createEl('button', {
                text: this.currentCodename ? 'Regenerate' : 'Generate',
                cls: 'mod-primary'
            });
            this.generateButton.addEventListener('click', () => this.handleGenerate());
        }

        // Save button
        const saveButton = buttonContainer.createEl('button', {
            text: 'Save',
            cls: 'mod-cta'
        });
        saveButton.addEventListener('click', () => this.handleSubmit());

        // Cancel button
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => this.close());

        // Clear button (only show if there's a current codename)
        if (this.currentCodename) {
            const clearButton = buttonContainer.createEl('button', {
                text: 'Clear',
                cls: 'mod-warning'
            });
            clearButton.addEventListener('click', () => this.handleClear());
        }

        // Focus input and select existing text
        this.inputEl.focus();
        this.inputEl.select();

        // Handle Enter key
        this.inputEl.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter') {
                evt.preventDefault();
                this.handleSubmit();
            }
            if (evt.key === 'Escape') {
                evt.preventDefault();
                this.close();
            }
        });

        // Auto-generate codename if none exists and LLM is available
        if (!this.currentCodename && this.llmService?.isAvailable() && this.ideaBody) {
            this.handleGenerate();
        }
    }

    private async handleGenerate(): Promise<void> {
        if (!this.llmService?.complete || !this.ideaBody || this.isGenerating) {
            return;
        }

        this.isGenerating = true;
        if (this.generateButton) {
            this.generateButton.disabled = true;
            this.generateButton.textContent = 'Generating...';
        }
        this.inputEl.disabled = true;
        this.inputEl.placeholder = 'Generating codename...';

        try {
            const codename = await this.generateCodename(this.ideaBody);
            if (codename) {
                this.inputEl.value = codename;
                this.inputEl.placeholder = 'Enter codename...';
            } else {
                new Notice('Failed to generate codename. Please enter one manually.');
                this.inputEl.placeholder = 'Enter codename...';
            }
        } catch (error) {
            console.error('Failed to generate codename:', error);
            new Notice('Failed to generate codename. Please enter one manually.');
            this.inputEl.placeholder = 'Enter codename...';
        } finally {
            this.isGenerating = false;
            if (this.generateButton) {
                this.generateButton.disabled = false;
                this.generateButton.textContent = this.currentCodename ? 'Regenerate' : 'Generate';
            }
            this.inputEl.disabled = false;
            this.inputEl.focus();
            this.inputEl.select();
        }
    }

    private async generateCodename(ideaBody: string): Promise<string | null> {
        if (!this.llmService?.complete) {
            return null;
        }

        const prompt = `Generate a codename for this idea.

Idea: "${ideaBody.substring(0, 500)}"

Requirements:
- 1-3 words maximum
- Easy to remember and pronounce
- Captures the idea's core concept
- Professional but creative
- Suitable for filenames

Examples:
- "bracelet that measures room volume" → "VolumeBand" or "SoundSense"
- "AI writing assistant" → "WriteBot" or "TextCraft"
- "social network for developers" → "DevNet" or "CodeConnect"

Return only the codename. No quotes, no explanation, just the name:`;

        try {
            const response = await this.llmService.complete(prompt, {
                temperature: 0.8, // Higher creativity for codenames
                n_predict: 50, // Short response
                stop: ['\n', '.', '!', '?', '"', "'"]
            });

            // Clean and validate the response
            let codename = response.trim();
            
            // Remove quotes if present
            codename = codename.replace(/^["']|["']$/g, '');
            
            // Truncate to 30 characters (reasonable for codenames)
            codename = codename.substring(0, 30).trim();
            
            // Remove special characters (keep alphanumeric, spaces, hyphens)
            codename = codename.replace(/[^a-zA-Z0-9\s-]/g, '');
            
            // Validate: must be at least 2 characters
            if (codename.length < 2) {
                return null;
            }
            
            return codename;
        } catch (error) {
            console.error('Codename generation failed:', error);
            return null;
        }
    }

    private handleSubmit() {
        const codename = this.inputEl.value.trim();
        this.onSubmit(codename);
        this.close();
    }

    private handleClear() {
        this.onSubmit('');
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

