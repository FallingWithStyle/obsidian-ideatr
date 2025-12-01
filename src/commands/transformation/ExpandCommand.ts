import { Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
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
        file: any,
        content: { frontmatter: any; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.checkLLMAvailability()) {
            return;
        }

        new Notice('Expanding idea...');

        // Check if LLM service supports expansion
        if (!this.context.llmService.expandIdea) {
            new Notice('Idea expansion is not supported by the current AI provider.');
            return;
        }

        const expansion = await this.context.llmService.expandIdea(content.ideaText, {
            category: content.frontmatter.category,
            tags: content.frontmatter.tags,
            detailLevel: 'detailed',
        });

        // Show preview modal
        new ExpansionPreviewModal(
            this.context.app,
            expansion,
            async (action) => {
                if (action === 'append') {
                    await this.context.fileManager.appendToFileBody(file, 'Expanded Idea', expansion.expandedText);
                    new Notice('Expanded content added to note.');
                } else if (action === 'replace') {
                    const parsed = this.context.frontmatterParser.parse(content.content);
                    const newContent = this.context.frontmatterParser.build(parsed.frontmatter, expansion.expandedText);
                    await this.context.app.vault.modify(file, newContent);
                    new Notice('Idea content replaced with expanded version.');
                }
            }
        ).open();
    }
}

