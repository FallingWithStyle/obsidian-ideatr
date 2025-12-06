import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import type { IdeaCategory } from '../../types/classification';
import { CommandContext } from '../base/CommandContext';
import { ReorganizationPreviewModal } from '../../views/ReorganizationPreviewModal';
import { Logger } from '../../utils/logger';

/**
 * Command: reorganize-idea
 * Reorganize idea into structured format
 */
export class ReorganizeCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'reorganize idea';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.checkLLMAvailability()) {
            return;
        }

        new Notice('Reorganizing idea...');

        // Check if LLM service supports reorganization
        if (!this.context.llmService.reorganizeIdea) {
            new Notice('Idea reorganization is not supported by the current AI provider.');
            return;
        }

        // Create backup file
        const backupPath = file.path.replace(/\.md$/, '.backup.md');
        try {
            await this.context.app.vault.create(backupPath, content.content);
        } catch (error) {
            Logger.warn('Failed to create backup file:', error);
            // Continue anyway
        }

        const reorganization = await this.context.llmService.reorganizeIdea(content.ideaText, {
            category: content.frontmatter.category as IdeaCategory | undefined,
            tags: (Array.isArray(content.frontmatter.tags) ? content.frontmatter.tags : undefined) as string[] | undefined,
        });

        // Show preview modal with before/after comparison
        new ReorganizationPreviewModal(
            this.context.app,
            content.ideaText,
            reorganization,
            (action) => {
                void (async () => {
                    if (action === 'accept') {
                        const parsed = this.context.frontmatterParser.parse(content.content);
                        const newContent = this.context.frontmatterParser.build(parsed.frontmatter, reorganization.reorganizedText);
                        await this.context.app.vault.modify(file, newContent);
                        new Notice('Idea reorganized successfully.');
                    } else if (action === 'reject') {
                        new Notice('Reorganization cancelled.');
                    }
                })();
            }
        ).open();
    }
}

