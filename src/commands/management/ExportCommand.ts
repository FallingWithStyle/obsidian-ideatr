import { Notice } from 'obsidian';
import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';
import type { ExportFormat } from '../../services/ExportService';

/**
 * Command: export-ideas
 * Export all ideas to selected format
 */
export class ExportCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    async execute(): Promise<void> {
        try {
            // For now, default to JSON. In a full implementation, we'd show a format picker
            const format: ExportFormat = 'json';

            new Notice('Exporting ideas...');

            const exportContent = await this.context.exportService.exportIdeas(format);

            // Create export file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `Ideatr-Export-${timestamp}.${format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md'}`;
            const path = `Ideas/${filename}`;

            await this.context.app.vault.create(path, exportContent);

            new Notice(`Exported ${filename} successfully.`);
        } catch (error) {
            this.handleError(error, 'export ideas');
        }
    }
}

