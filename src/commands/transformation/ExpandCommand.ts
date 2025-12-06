import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import type { IdeaCategory } from '../../types/classification';
import { CommandContext } from '../base/CommandContext';
import { ExpansionPreviewModal } from '../../views/ExpansionPreviewModal';

/**
 * Command: expand-idea
 * Expand idea with detailed description
 */
export class ExpandCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'expand idea';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.checkLLMAvailability()) {
            return;
        }

        new Notice('Expanding idea...');

        // Check if LLM service supports expansion
        if (!this.context.llmService.expandIdea) {
            this.debug('LLM service does not support expandIdea');
            new Notice('Idea expansion is not supported by the current AI provider.');
            return;
        }

        const expansion = await this.context.llmService.expandIdea(content.ideaText, {
            category: content.frontmatter.category as IdeaCategory | undefined,
            tags: (Array.isArray(content.frontmatter.tags) ? content.frontmatter.tags : undefined) as string[] | undefined,
            detailLevel: 'detailed',
        });

        // Show preview modal
        new ExpansionPreviewModal(
            this.context.app,
            expansion,
            (action) => {
                void (async () => {
                    if (action === 'append') {
                        await this.context.fileManager.appendToFileBody(file, 'Expanded Idea', expansion.expandedText);
                        new Notice('Expanded content added to note.');
                    } else if (action === 'replace') {
                        const parsed = this.context.frontmatterParser.parse(content.content);
                        const newContent = this.context.frontmatterParser.build(parsed.frontmatter, expansion.expandedText);
                        await this.context.app.vault.modify(file, newContent);
                        new Notice('Idea content replaced with expanded version.');
                    }
                })();
            }
        ).open();
    }
}

