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
        contentEl.createEl('h2', { text: 'Generate codename' });

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

        const prompt = `Generate a memorable, brandable codename for this idea.

Idea: "${ideaBody.substring(0, 500)}"

CRITICAL REQUIREMENTS:
- Extract the CORE CONCEPT, not just use the literal text
- Focus on what makes the idea unique or memorable
- Create a codename that could work as a project/product name
- Prioritize memorability and pronounceability over literal accuracy

Requirements:
- 1-3 words maximum (prefer 1-2 words)
- Easy to remember and pronounce (test: can you say it naturally?)
- Captures the idea's essence in a creative way
- Professional but distinctive
- Suitable for filenames (alphanumeric, hyphens, spaces only)
- 2-20 characters total (shorter is usually better)
- IMPORTANT: Avoid unpronounceable acronyms longer than 6 characters. If using acronyms, they must be pronounceable (e.g., "ACME" is fine, "AGPFOIM" is not)

Codename strategies:
- Portmanteau: Blend key words (e.g., "net" + "flicks" → "Netflix")
- Compound: Combine two relevant words (e.g., "VolumeBand", "SoundSense")
- Single word: Use a powerful, relevant word (e.g., "Zen", "Ping", "Alert")
- Short acronym: Only if pronounceable and 6 chars or fewer (e.g., "NASA", "ACME")

Examples:
- "bracelet that measures room volume" → "VolumeBand", "SoundSense", "EchoBand"
- "AI writing assistant" → "WriteBot", "TextCraft", "WordSmith"
- "social network for developers" → "DevNet", "CodeConnect", "DevHub"
- "AI generated puzzle full of interlinked monkeys that look similar, sort of a where's waldo of monkeys" → "MonkeyFind", "PrimateSeek", "ApeSpot", "FindMonkey"
- "task manager for remote teams" → "TaskFlow", "TeamSync", "RemoteTask"

Return ONLY the codename. No quotes, no explanation, no prefixes like "Codename:" or "Name:". Just the name itself:`;

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

