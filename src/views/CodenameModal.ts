import { Modal, App } from 'obsidian';

/**
 * CodenameModal - Simple modal for entering a codename for an idea
 */
export class CodenameModal extends Modal {
    private inputEl!: HTMLInputElement;
    private onSubmit: (codename: string) => void;
    private currentCodename?: string;

    constructor(
        app: App,
        onSubmit: (codename: string) => void,
        currentCodename?: string
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.currentCodename = currentCodename;
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

