import { Notice, TFile } from 'obsidian';
import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';
import { ImportFilePickerModal } from '../../views/ImportFilePickerModal';
import { ProgressModal } from '../../views/ProgressModal';

/**
 * Command: import-ideas
 * Import ideas from file
 */
export class ImportCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    execute(): Promise<void> {
        try {
            // Check service availability
            if (!this.context.importService) {
                new Notice('Import service is not available.');
                return Promise.resolve();
            }

            // Show file picker modal
            new ImportFilePickerModal(
                this.context.app,
                ['json', 'csv', 'md'],
                (importFile: TFile) => {
                    void (async () => {
                        // Detect format from file extension
                        let format: 'json' | 'csv' | 'markdown' = 'json';
                        const ext = importFile.extension?.toLowerCase() || '';
                        if (ext === 'json') {
                            format = 'json';
                        } else if (ext === 'csv') {
                            format = 'csv';
                        } else if (ext === 'md' || ext === 'markdown') {
                            format = 'markdown';
                        } else {
                            new Notice(`Unsupported file format: ${ext}. Please use JSON, CSV, or Markdown files.`);
                            return;
                        }

                        try {
                            // Read file content
                            const content = await this.context.app.vault.read(importFile);

                            // Show progress modal
                            const progressModal = new ProgressModal(this.context.app, 'Importing Ideas');
                            progressModal.open();

                            // Import ideas
                            progressModal.updateProgress({
                                current: 0,
                                total: 1,
                                currentItem: `Parsing ${importFile.name}...`,
                                status: 'processing'
                            });

                            const result = await this.context.importService.importIdeas(content, format);

                            progressModal.updateProgress({
                                current: result.total,
                                total: result.total,
                                status: result.failed === 0 ? 'completed' : 'completed',
                                errors: result.errors.length > 0 ? result.errors.map(e => `${e.item}: ${e.error}`) : undefined
                            });

                            // Show summary
                            if (result.imported > 0) {
                                new Notice(`Import complete: ${result.imported} imported, ${result.failed} failed${result.errors.length > 0 ? '. Check console for details.' : '.'}`);
                            } else {
                                new Notice(`Import failed: ${result.failed} failed. Check console for details.`);
                            }

                            // Close progress modal after a short delay
                            setTimeout(() => {
                                progressModal.close();
                            }, 2000);
                        } catch (error) {
                            console.error('Failed to import ideas:', error);
                            new Notice('Failed to import ideas. Please try again or check console for details.');
                        }
                    })();
                }
            ).open();
            return Promise.resolve();
        } catch (error) {
            this.handleError(error, 'show import file picker');
            return Promise.resolve();
        }
    }
}

