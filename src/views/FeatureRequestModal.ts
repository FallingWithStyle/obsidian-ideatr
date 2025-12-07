/**
 * FeatureRequestModal - Modal for submitting feature requests and bug reports
 */

import { Modal, App, Notice } from 'obsidian';
import type { ErrorLogService } from '../services/ErrorLogService';
import { Logger } from '../utils/logger';

export type RequestType = 'bug' | 'feature' | 'performance';

export interface SystemInfo {
    obsidianVersion: string;
    pluginVersion: string;
    platform: string;
    os: string;
}

/**
 * Modal for submitting feature requests and bug reports
 */
export class FeatureRequestModal extends Modal {
    private errorLogService?: ErrorLogService;
    private systemInfo: SystemInfo;
    private requestType: RequestType = 'feature';
    private description: string = '';
    private includeErrorLogs: boolean = false;
    private includeSystemInfo: boolean = true;

    constructor(
        app: App,
        systemInfo: SystemInfo,
        errorLogService?: ErrorLogService
    ) {
        super(app);
        this.systemInfo = systemInfo;
        this.errorLogService = errorLogService;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ideatr-feedback-modal');

        // Title
        contentEl.createEl('h2', { text: 'Submit feedback' });
        contentEl.createEl('p', {
            // eslint-disable-next-line obsidianmd/ui/sentence-case
            text: 'Help improve Ideatr by submitting a feature request or bug report.',
            cls: 'ideatr-feedback-description'
        });

        // Request type selection
        const typeContainer = contentEl.createEl('div', { cls: 'ideatr-setting-item' });
        typeContainer.createEl('label', { 
            text: 'Type:', 
            attr: { for: 'ideatr-request-type' },
            cls: 'ideatr-label'
        });
        const typeSelect = typeContainer.createEl('select', {
            attr: { id: 'ideatr-request-type' },
            cls: 'ideatr-select'
        });
        typeSelect.createEl('option', { text: 'Feature request', attr: { value: 'feature' } });
        typeSelect.createEl('option', { text: 'Bug report', attr: { value: 'bug' } });
        typeSelect.createEl('option', { text: 'Performance issue', attr: { value: 'performance' } });
        typeSelect.value = this.requestType;
        typeSelect.addEventListener('change', (e) => {
            this.requestType = (e.target as HTMLSelectElement).value as RequestType;
            this.updateDescriptionPlaceholder();
        });

        // Description textarea
        const descContainer = contentEl.createEl('div', { cls: 'ideatr-setting-item' });
        descContainer.createEl('label', { 
            text: 'Description:', 
            attr: { for: 'ideatr-description' },
            cls: 'ideatr-label'
        });
        const descriptionTextarea = descContainer.createEl('textarea', {
            attr: {
                id: 'ideatr-description',
                rows: '8',
                placeholder: this.getDescriptionPlaceholder()
            },
            cls: 'ideatr-textarea'
        });
        descriptionTextarea.value = this.description;
        descriptionTextarea.addEventListener('input', (e) => {
            this.description = (e.target as HTMLTextAreaElement).value;
        });

        // Options section
        const optionsContainer = contentEl.createEl('div', { cls: 'ideatr-feedback-options' });
        optionsContainer.createEl('h3', { text: 'Additional information (optional)' });

        // Include system info checkbox
        const systemInfoContainer = optionsContainer.createEl('div', { cls: 'ideatr-checkbox-item' });
        const systemInfoCheckbox = systemInfoContainer.createEl('input', {
            attr: {
                type: 'checkbox',
                id: 'ideatr-include-system-info',
                checked: this.includeSystemInfo
            }
        });
        systemInfoContainer.createEl('label', {
            // eslint-disable-next-line obsidianmd/ui/sentence-case
            text: 'Include system information (Obsidian version, plugin version, OS)',
            attr: { for: 'ideatr-include-system-info' }
        });
        systemInfoCheckbox.addEventListener('change', (e) => {
            this.includeSystemInfo = (e.target as HTMLInputElement).checked;
        });

        // Include error logs checkbox (only if error log service is available)
        if (this.errorLogService) {
            const errorLogsContainer = optionsContainer.createEl('div', { cls: 'ideatr-checkbox-item' });
            const errorLogsCheckbox = errorLogsContainer.createEl('input', {
                attr: {
                    type: 'checkbox',
                    id: 'ideatr-include-error-logs',
                    checked: this.includeErrorLogs
                }
            });
            errorLogsContainer.createEl('label', {
                text: 'Include recent error logs (last 7 days, sanitized)',
                attr: { for: 'ideatr-include-error-logs' }
            });
            errorLogsCheckbox.addEventListener('change', (e) => {
                this.includeErrorLogs = (e.target as HTMLInputElement).checked;
            });

            // Show count of available error logs
            const recentLogs = this.errorLogService.getRecentLogs();
            if (recentLogs.length > 0) {
                const logCount = optionsContainer.createEl('p', {
                    text: `${recentLogs.length} error log${recentLogs.length > 1 ? 's' : ''} available`,
                    cls: 'ideatr-help-text'
                });
                logCount.addClass('ideatr-log-count');
            }
        }

        // Preview section
        const previewContainer = contentEl.createEl('div', { cls: 'ideatr-feedback-preview' });
        previewContainer.createEl('h3', { text: 'Preview' }); // Single word, OK as-is
        const previewTextarea = previewContainer.createEl('textarea', {
            attr: {
                id: 'ideatr-preview',
                rows: '12',
                readonly: 'true'
            },
            cls: 'ideatr-textarea'
        });
        previewTextarea.addClass('ideatr-preview-textarea');

        // Update preview when inputs change
        const updatePreview = () => {
            previewTextarea.value = this.generateIssueContent();
        };
        typeSelect.addEventListener('change', updatePreview);
        descriptionTextarea.addEventListener('input', updatePreview);
        systemInfoCheckbox.addEventListener('change', updatePreview);
        if (this.errorLogService) {
            const errorLogsCheckbox = contentEl.querySelector('#ideatr-include-error-logs') as HTMLInputElement;
            if (errorLogsCheckbox) {
                errorLogsCheckbox.addEventListener('change', updatePreview);
            }
        }

        // Initial preview update
        updatePreview();

        // Buttons
        const buttonContainer = contentEl.createEl('div', { cls: 'ideatr-button-container' });
        
        // Copy to clipboard button
        const copyButton = buttonContainer.createEl('button', {
            text: 'Copy to clipboard',
            cls: 'mod-cta'
        });
        copyButton.addEventListener('click', () => void this.handleCopyToClipboard());

        // Open email button
        const emailButton = buttonContainer.createEl('button', {
            text: 'Open email',
            cls: 'mod-cta'
        });
        emailButton.addEventListener('click', () => this.handleOpenEmail());

        // Open GitHub issue button
        const githubButton = buttonContainer.createEl('button', {
            text: 'Open GitHub issue',
            cls: 'mod-cta'
        });
        githubButton.addEventListener('click', () => this.handleOpenGitHub());

        // Cancel button
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => this.close());
    }

    private getDescriptionPlaceholder(): string {
        if (this.requestType === 'bug') {
            return 'Describe the bug:\n\n1. What happened?\n2. What did you expect to happen?\n3. Steps to reproduce:\n   - Step 1\n   - Step 2\n   - Step 3';
        } else if (this.requestType === 'performance') {
            return 'Describe the performance issue:\n\n- What operation is slow?\n- How long does it take?\n- When did you first notice this?\n- Any patterns (specific features, large vaults, etc.)?';
        } else {
            return 'Describe your feature request:\n\n- What problem does this solve?\n- How would you like it to work?\n- Any additional context or examples?';
        }
    }

    private updateDescriptionPlaceholder(): void {
        const textarea = this.contentEl.querySelector('#ideatr-description') as HTMLTextAreaElement;
        if (textarea) {
            textarea.placeholder = this.getDescriptionPlaceholder();
        }
    }

    private generateIssueContent(): string {
        const typeLabel = this.requestType === 'bug' 
            ? 'Bug Report' 
            : this.requestType === 'performance' 
                ? 'Performance Issue' 
                : 'Feature Request';
        
        let content = `## ${typeLabel}\n\n`;
        
        if (this.description.trim()) {
            content += `${this.description}\n\n`;
        } else {
            content += `[Please describe your ${this.requestType === 'bug' ? 'bug' : 'feature request'} here]\n\n`;
        }

        if (this.includeSystemInfo) {
            content += `## System Information\n\n`;
            content += `- **Obsidian Version:** ${this.systemInfo.obsidianVersion}\n`;
            content += `- **Ideatr Version:** ${this.systemInfo.pluginVersion}\n`;
            content += `- **Platform:** ${this.systemInfo.platform}\n`;
            content += `- **OS:** ${this.systemInfo.os}\n\n`;
        }

        if (this.includeErrorLogs && this.errorLogService) {
            const recentLogs = this.errorLogService.getRecentLogs();
            if (recentLogs.length > 0) {
                content += this.errorLogService.formatLogsForIssue(recentLogs);
                content += '\n\n';
            }
        }

        return content.trim();
    }

    private generateIssueTitle(): string {
        const typePrefix = this.requestType === 'bug' 
            ? '[Bug]' 
            : this.requestType === 'performance' 
                ? '[Performance]' 
                : '[Feature]';
        const description = this.description.trim();
        
        if (description) {
            // Extract first line or first 50 characters
            const firstLine = description.split('\n')[0].trim();
            const title = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
            return `${typePrefix} ${title}`;
        }
        
        const defaultTitle = this.requestType === 'bug' 
            ? 'Bug report' 
            : this.requestType === 'performance' 
                ? 'Performance issue' 
                : 'Feature request';
        return `${typePrefix} ${defaultTitle}`;
    }

    private async handleCopyToClipboard(): Promise<void> {
        if (!this.description.trim()) {
            new Notice('Please enter a description first');
            return;
        }

        const content = this.generateIssueContent();
        
        try {
            // Use Obsidian's clipboard API if available, otherwise fall back to navigator
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(content);
            } else {
                throw new Error('Clipboard API not available');
            }
            new Notice('Content copied to clipboard! Paste it into a GitHub issue.');
        } catch (error) {
            Logger.error('Failed to copy to clipboard:', error);
            new Notice('Failed to copy to clipboard. Please copy manually from the preview.');
        }
    }

    private handleOpenEmail(): void {
        if (!this.description.trim()) {
            new Notice('Please enter a description first');
            return;
        }

        const subject = this.generateEmailSubject();
        const body = this.generateIssueContent();
        
        // Encode for mailto: URL
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(body);
        
        const mailtoUrl = `mailto:ideatr@paraphlabs.com?subject=${encodedSubject}&body=${encodedBody}`;
        
        // Open email client
        window.location.href = mailtoUrl;
        new Notice('Opening email client...');
    }

    private generateEmailSubject(): string {
        const typePrefix = this.requestType === 'bug' 
            ? '[Bug]' 
            : this.requestType === 'performance' 
                ? '[Performance]' 
                : '[Feature]';
        
        const description = this.description.trim();
        
        if (description) {
            // Extract first line or first 60 characters for subject
            const firstLine = description.split('\n')[0].trim();
            const summary = firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
            return `${typePrefix} ${summary}`;
        }
        
        const defaultTitle = this.requestType === 'bug' 
            ? 'Bug report' 
            : this.requestType === 'performance' 
                ? 'Performance issue' 
                : 'Feature request';
        return `${typePrefix} ${defaultTitle}`;
    }

    private handleOpenGitHub(): void {
        if (!this.description.trim()) {
            new Notice('Please enter a description first');
            return;
        }

        const title = encodeURIComponent(this.generateIssueTitle());
        const body = encodeURIComponent(this.generateIssueContent());
        const labels = this.requestType === 'bug' 
            ? 'bug' 
            : this.requestType === 'performance' 
                ? 'performance' 
                : 'enhancement';
        
        const url = `https://github.com/FallingWithStyle/obsidian-ideatr/issues/new?title=${title}&body=${body}&labels=${labels}`;
        
        // Open in default browser
        window.open(url, '_blank');
        new Notice('Opening GitHub issue page...');
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}

