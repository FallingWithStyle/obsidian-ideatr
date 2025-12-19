import { Modal, App } from 'obsidian';

/**
 * Simple confirmation modal for replacing browser confirm() dialogs
 */
class ConfirmationModal extends Modal {
    private message: string;
    private resolve: (value: boolean) => void;

    constructor(app: App, message: string, resolve: (value: boolean) => void) {
        super(app);
        this.message = message;
        this.resolve = resolve;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Confirm' });
        contentEl.createEl('p', { text: this.message });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        const confirmButton = buttonContainer.createEl('button', { 
            text: 'Confirm',
            cls: 'mod-cta'
        });
        confirmButton.onclick = () => {
            this.resolve(true);
            this.close();
        };

        const cancelButton = buttonContainer.createEl('button', { 
            text: 'Cancel'
        });
        cancelButton.onclick = () => {
            this.resolve(false);
            this.close();
        };
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
        // If modal is closed without clicking a button, resolve as false
        this.resolve(false);
    }
}

/**
 * Show a confirmation dialog (replacement for browser confirm())
 * @param app - Obsidian App instance
 * @param message - Message to display
 * @returns Promise that resolves to true if confirmed, false otherwise
 */
export async function showConfirmation(app: App, message: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        new ConfirmationModal(app, message, resolve).open();
    });
}

