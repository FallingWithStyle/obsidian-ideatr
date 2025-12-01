import { Notice, TFile } from 'obsidian';
import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';
import { ProgressModal } from '../../views/ProgressModal';

/**
 * Command: reclassify-all-ideas
 * Reclassify all ideas in the Ideas/ directory
 */
export class ReclassifyAllCommand extends BaseCommand {
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
                new Notice('No idea files found in Ideas/ directory.');
                return;
            }

            if (!this.context.classificationService.isAvailable()) {
                new Notice('Classification service is not available. Please configure AI in settings.');
                return;
            }

            // Create progress modal
            const progressModal = new ProgressModal(
                this.context.app,
                'Reclassifying Ideas'
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
                        errors.push(`${file.name}: No content to classify`);
                        failed++;
                        continue;
                    }

                    // Classify
                    const classification = await this.context.classificationService.classifyIdea(ideaText);

                    // Update frontmatter
                    const updated = { ...parsed.frontmatter, ...classification };
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
                new Notice(`Reclassification complete: ${completed} updated, ${failed} failed`);
            }
        } catch (error) {
            this.handleError(error, 'reclassify all ideas');
        }
    }
}

