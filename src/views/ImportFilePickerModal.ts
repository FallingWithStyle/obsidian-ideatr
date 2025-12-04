/**
 * Modal for selecting import files from vault
 * Improves import functionality UX
 */

import { App, SuggestModal } from 'obsidian';
import type { TFile } from 'obsidian';

export class ImportFilePickerModal extends SuggestModal<TFile> {
    private onSelect: (file: TFile) => void;
    private allowedExtensions: string[];

    constructor(
        app: App,
        allowedExtensions: string[] = ['json', 'csv', 'md'],
        onSelect: (file: TFile) => void
    ) {
        super(app);
        this.onSelect = onSelect;
        this.allowedExtensions = allowedExtensions;
        
        // Set placeholder
        this.setPlaceholder('Type to search for import files...');
    }

    getSuggestions(query: string): TFile[] {
        const allFiles = this.app.vault.getFiles();
        
        // Filter by allowed extensions
        const importableFiles = allFiles.filter(file => {
            const ext = file.extension.toLowerCase();
            return this.allowedExtensions.includes(ext);
        });

        // Filter by query
        if (!query) {
            return importableFiles.slice(0, 50); // Limit results
        }

        const queryLower = query.toLowerCase();
        return importableFiles
            .filter(file => 
                file.name.toLowerCase().includes(queryLower) ||
                file.path.toLowerCase().includes(queryLower)
            )
            .slice(0, 50);
    }

    renderSuggestion(file: TFile, el: HTMLElement) {
        el.createEl('div', {
            text: file.name,
            attr: { style: 'font-weight: bold;' }
        });
        el.createEl('div', {
            text: file.path,
            attr: { 
                style: 'font-size: 12px; color: var(--text-muted); margin-top: 2px;' 
            }
        });
        
        // Show file size if available
        if (file.stat && file.stat.size) {
            const sizeKB = (file.stat.size / 1024).toFixed(1);
            el.createEl('div', {
                text: `${sizeKB} KB`,
                attr: { 
                    style: 'font-size: 11px; color: var(--text-faint); margin-top: 2px;' 
                }
            });
        }
    }

    onChooseSuggestion(file: TFile, _evt: MouseEvent | KeyboardEvent) {
        this.onSelect(file);
    }
}

