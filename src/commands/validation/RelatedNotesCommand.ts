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
        const relatedNotes = await this.context.searchService.findRelatedNotes(content.ideaText, 10, file.path);

        if (relatedNotes.length === 0) {
            new Notice('No related notes found.');
            return;
        }

        // Get existing related IDs and convert to paths for display
        const existingRelatedIds = Array.isArray(content.frontmatter.related) 
            ? content.frontmatter.related.filter((id): id is number => typeof id === 'number' && id !== 0)
            : [];
        const existingRelatedPaths = await this.idConverter.idsToPaths(existingRelatedIds);

        // Show modal with related notes (still uses paths for display)
        new RelatedNotesModal(
            this.context.app,
            relatedNotes,
            existingRelatedPaths,
            (selected) => {
                void (async () => {
                    // Convert selected paths to IDs and filter out the current file's ID
                    const selectedPaths = selected.map(n => n.path);
                    const relatedIds = await this.idConverter.pathsToIds(selectedPaths);
                    const currentFileId = typeof content.frontmatter.id === 'number' ? content.frontmatter.id : null;
                    const filteredRelatedIds = currentFileId 
                        ? relatedIds.filter(id => id !== currentFileId && id !== 0)
                        : relatedIds.filter(id => id !== 0);
                    await this.updateIdeaFrontmatter(file, { related: filteredRelatedIds });
                    new Notice(`Linked ${selected.length} related note${selected.length > 1 ? 's' : ''} in frontmatter.`);
                })();
            }
        ).open();
    }
}

