import { Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { UserFacingError } from '../../utils/errors';
import { Logger } from '../../utils/logger';

/**
 * Command: refresh-idea
 * Refresh all aspects of the current idea
 */
export class RefreshIdeaCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'refresh idea';
    }

    protected async executeWithFile(
        file: any,
        content: { frontmatter: any; body: string; content: string; ideaText: string }
    ): Promise<void> {
        new Notice('Refreshing idea...');

        const updates: any = {};

        // Re-classify
        if (this.context.classificationService.isAvailable()) {
            try {
                const classification = await this.context.classificationService.classifyIdea(content.ideaText);
                updates.category = classification.category;
                updates.tags = classification.tags;
            } catch (error) {
                Logger.warn('Failed to re-classify:', error);
            }
        }

        // Refresh related notes
        try {
            const related = await this.context.searchService.findRelatedNotes(content.ideaText, 5);
            updates.related = related.map(r => r.path);
        } catch (error) {
            Logger.warn('Failed to refresh related notes:', error);
        }

        // Regenerate name variants (if enabled)
        if (this.context.settings.enableNameVariants && this.context.nameVariantService.isAvailable()) {
            try {
                const variants = await this.context.nameVariantService.generateVariants(content.ideaText);
                if (variants.length > 0) {
                    // Append variants to file body
                    const variantsText = this.context.nameVariantService.formatVariantsForMarkdown(variants);
                    await this.context.fileManager.appendToFileBody(file, 'Name Variants', variantsText);
                }
            } catch (error) {
                Logger.warn('Failed to regenerate name variants:', error);
            }
        }

        // Update frontmatter
        if (Object.keys(updates).length > 0) {
            await this.updateIdeaFrontmatter(file, updates);
        }

        new Notice('Idea refreshed successfully.');
    }
}

