import { TFile, Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { EditRelatedNotesModal } from '../../views/EditRelatedNotesModal';

/**
 * Command: edit-related-notes
 * Edit related notes for the current idea
 */
export class EditRelatedNotesCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'edit related notes';
    }

    protected executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): void {
        // Get current related IDs
        const relatedItems = Array.isArray(content.frontmatter.related) 
            ? content.frontmatter.related 
            : [];
        const relatedIds = relatedItems.filter((item): item is number => typeof item === 'number' && item !== 0);
        
        // Get current file's ID
        const currentFileId = typeof content.frontmatter.id === 'number' ? content.frontmatter.id : null;

        // Show edit modal
        const handleSave = (updatedRelatedIds: number[]): void => {
            // Filter out the current file's ID if it somehow got in
            const filteredIds = currentFileId 
                ? updatedRelatedIds.filter(id => id !== currentFileId && id !== 0)
                : updatedRelatedIds.filter(id => id !== 0);
            
            void this.updateIdeaFrontmatter(file, { related: filteredIds }).then(() => {
                new Notice(`Updated related notes: ${filteredIds.length} linked`);
            });
        };
        
        new EditRelatedNotesModal(
            this.context.app,
            relatedIds,
            this.context.ideaRepository,
            currentFileId,
            handleSave
        ).open();
    }
}

