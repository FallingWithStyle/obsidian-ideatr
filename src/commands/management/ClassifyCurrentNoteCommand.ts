import { Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import type { IdeaClassification } from '../../types/classification';

/**
 * Command: classify-current-note
 * Classify the current active note
 */
export class ClassifyCurrentNoteCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'classify note';
    }

    protected async executeWithFile(
        file: any,
        content: { frontmatter: any; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.checkServiceAvailability(this.context.classificationService, 'AI classification')) {
            return;
        }

        new Notice('Classifying idea...');
        const classification = await this.context.classificationService.classifyIdea(content.ideaText);

        // Update frontmatter
        const parsed = this.context.frontmatterParser.parse(content.content);
        parsed.frontmatter.category = classification.category;
        parsed.frontmatter.tags = classification.tags;
        if (classification.related.length > 0) {
            parsed.frontmatter.related = classification.related;
        }

        const updatedContent = this.context.frontmatterParser.build(parsed.frontmatter, parsed.body);
        await this.context.app.vault.modify(file, updatedContent);

        new Notice('Classification complete!');
    }
}

