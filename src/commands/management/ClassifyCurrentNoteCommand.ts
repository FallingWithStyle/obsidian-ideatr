import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { RelatedIdConverter } from '../../utils/RelatedIdConverter';

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
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.checkServiceAvailability(this.context.classificationService, 'AI classification')) {
            return;
        }

        new Notice('Classifying idea...');
        const classification = await this.context.classificationService.classifyIdea(content.ideaText, file.path);

        // Update frontmatter
        const parsed = this.context.frontmatterParser.parse(content.content);
        parsed.frontmatter.category = classification.category;
        parsed.frontmatter.tags = classification.tags;
        
        // Convert related paths to IDs and filter out the current file's ID
        if (classification.related.length > 0) {
            const idConverter = new RelatedIdConverter(this.context.ideaRepository);
            const relatedIds = await idConverter.pathsToIds(classification.related);
            const currentFileId = typeof parsed.frontmatter.id === 'number' ? parsed.frontmatter.id : null;
            const filteredRelatedIds = currentFileId 
                ? relatedIds.filter(id => id !== currentFileId && id !== 0)
                : relatedIds.filter(id => id !== 0);
            parsed.frontmatter.related = filteredRelatedIds;
        }

        const updatedContent = this.context.frontmatterParser.build(parsed.frontmatter, parsed.body);
        await this.context.app.vault.modify(file, updatedContent);

        new Notice('Classification complete!');
    }
}

