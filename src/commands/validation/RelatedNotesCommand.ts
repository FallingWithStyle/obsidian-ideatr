import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { RelatedNotesModal } from '../../views/RelatedNotesModal';
import { RelatedIdConverter } from '../../utils/RelatedIdConverter';

/**
 * Command: find-related-notes
 * Find related notes and allow user to link them
 */
export class RelatedNotesCommand extends IdeaFileCommand {
    private idConverter: RelatedIdConverter;

    constructor(context: CommandContext) {
        super(context);
        this.idConverter = new RelatedIdConverter(context.ideaRepository);
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

        // Get existing related IDs and convert to paths for display
        const existingRelatedIds = (Array.isArray(content.frontmatter.related) 
            ? content.frontmatter.related.filter((id): id is number => typeof id === 'number' && id !== 0)
            : []) as number[];
        const existingRelatedPaths = await this.idConverter.idsToPaths(existingRelatedIds);

        // Show modal with related notes (still uses paths for display)
        new RelatedNotesModal(
            this.context.app,
            relatedNotes,
            existingRelatedPaths,
            async (selected) => {
                // Convert selected paths to IDs
                const selectedPaths = selected.map(n => n.path);
                const relatedIds = await this.idConverter.pathsToIds(selectedPaths);
                await this.updateIdeaFrontmatter(file, { related: relatedIds });
                new Notice(`Linked ${selected.length} related note${selected.length > 1 ? 's' : ''} in frontmatter.`);
            }
        ).open();
    }
}

