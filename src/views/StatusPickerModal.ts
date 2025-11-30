/**
 * Modal for picking idea status
 */

import { Modal } from 'obsidian';

export type IdeaStatus = 'captured' | 'validated' | 'promoted' | 'archived';

export class StatusPickerModal extends Modal {
    private currentStatus: string;
    private onSelect?: (status: IdeaStatus) => void;
    private selectedStatus: IdeaStatus | null = null;

    constructor(
        app: any,
        currentStatus: string,
        onSelect?: (status: IdeaStatus) => void
    ) {
        super(app);
        this.currentStatus = currentStatus;
        this.onSelect = onSelect;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Change Idea Status' });

        const description = contentEl.createEl('p', {
            text: `Current status: ${this.currentStatus}. Select a new status:`
        });
        description.addClass('ideatr-modal-description');

        const statusContainer = contentEl.createDiv('ideatr-status-list');

        const statuses: Array<{ value: IdeaStatus; label: string; description: string }> = [
            { value: 'captured', label: 'Captured', description: 'Newly captured idea' },
            { value: 'validated', label: 'Validated', description: 'Idea has been validated' },
            { value: 'promoted', label: 'Promoted', description: 'Idea has been promoted' },
            { value: 'archived', label: 'Archived', description: 'Archived idea' },
        ];

        statuses.forEach((status) => {
            const item = statusContainer.createDiv('ideatr-status-item');
            
            const radio = item.createEl('input', {
                type: 'radio',
                name: 'status',
                value: status.value,
                attr: { 
                    checked: this.currentStatus === status.value ? 'true' : undefined
                }
            });

            if (this.currentStatus === status.value) {
                this.selectedStatus = status.value;
            }

            radio.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                if (target.checked) {
                    this.selectedStatus = status.value;
                }
            });

            const label = item.createDiv('ideatr-status-label');
            label.createEl('strong', { text: status.label });
            label.createEl('div', {
                text: status.description,
                cls: 'ideatr-status-description'
            });
        });

        const buttonContainer = contentEl.createDiv('ideatr-modal-buttons');
        
        const applyButton = buttonContainer.createEl('button', {
            text: 'Apply',
            cls: 'mod-cta'
        });
        applyButton.addEventListener('click', () => {
            if (this.selectedStatus && this.onSelect) {
                this.onSelect(this.selectedStatus);
            }
            this.close();
        });

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

