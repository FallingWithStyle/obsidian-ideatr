import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { RelatedNotesModal } from '../../views/RelatedNotesModal';

/**
 * Command: find-related-notes
 * Find related notes and allow user to link them
 */
export class RelatedNotesCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'find related notes';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        new Notice('Finding related notes...');
        const relatedNotes = await this.context.searchService.findRelatedNotes(content.ideaText, 10);

        if (relatedNotes.length === 0) {
            new Notice('No related notes found.');
            return;
        }

        // Show modal with related notes
        new RelatedNotesModal(
            this.context.app,
            relatedNotes,
            (Array.isArray(content.frontmatter.related) ? content.frontmatter.related : []) as string[],
            async (selected) => {
                const relatedPaths = selected.map(n => n.path);
                await this.updateIdeaFrontmatter(file, { related: relatedPaths });
                new Notice(`Linked ${selected.length} related note${selected.length > 1 ? 's' : ''} in frontmatter.`);
            }
        ).open();
    }
}

