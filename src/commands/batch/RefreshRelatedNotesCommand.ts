import { Notice } from 'obsidian';
import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';
import { ProgressModal } from '../../views/ProgressModal';
import { RelatedIdConverter } from '../../utils/RelatedIdConverter';

/**
 * Command: refresh-all-related-notes
 * Refresh related notes for all ideas
 */
export class RefreshRelatedNotesCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    async execute(): Promise<void> {
        try {
            // Get all idea files
            const allFiles = this.context.app.vault.getMarkdownFiles();
            const ideaFiles = allFiles.filter(file => 
                file.path.startsWith('Ideas/') && !file.path.startsWith('Ideas/Archived/')
            );

            if (ideaFiles.length === 0) {
                new Notice('No idea files found in ideas/ directory.');
                return;
            }

            // Create progress modal
            const progressModal = new ProgressModal(
                this.context.app,
                'Refreshing related notes'
            );
            progressModal.open();

            let completed = 0;
            let failed = 0;
            const errors: string[] = [];

            // Process each idea
            for (let i = 0; i < ideaFiles.length; i++) {
                if (progressModal.isCancelled()) {
                    break;
                }

                const file = ideaFiles[i];
                progressModal.updateProgress({
                    current: i + 1,
                    total: ideaFiles.length,
                    currentItem: file.name,
                    status: 'processing'
                });

                try {
                    const content = await this.context.app.vault.read(file);
                    const parsed = this.context.frontmatterParser.parse(content);
                    const ideaText = parsed.body.trim();

                    if (ideaText.length === 0) {
                        errors.push(`${file.name}: No content to search`);
                        failed++;
                        continue;
                    }

                    // Find related notes
                    const related = await this.context.searchService.findRelatedNotes(ideaText, 5);

                    // Convert paths to IDs and update frontmatter
                    const idConverter = new RelatedIdConverter(this.context.ideaRepository);
                    const relatedPaths = related.map(r => r.path);
                    const relatedIds = await idConverter.pathsToIds(relatedPaths);
                    const updated = { ...parsed.frontmatter, related: relatedIds };
                    const newContent = this.context.frontmatterParser.build(updated, parsed.body);
                    await this.context.app.vault.modify(file, newContent);

                    completed++;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(`${file.name}: ${errorMessage}`);
                    failed++;
                }
            }

            // Show summary
            progressModal.updateProgress({
                current: ideaFiles.length,
                total: ideaFiles.length,
                status: progressModal.isCancelled() ? 'cancelled' : 'completed',
                errors: errors.length > 0 ? errors : undefined
            });

            if (!progressModal.isCancelled()) {
                new Notice(`Refresh complete: ${completed} updated, ${failed} failed`);
            }
        } catch (error) {
            this.handleError(error, 'refresh all related notes');
        }
    }
}

