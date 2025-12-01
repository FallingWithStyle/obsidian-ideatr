import { Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { DuplicateResultsModal } from '../../views/DuplicateResultsModal';

/**
 * Command: check-duplicates
 * Check for duplicate ideas
 */
export class DuplicateCheckCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'check duplicates';
    }

    protected async executeWithFile(
        file: any,
        content: { frontmatter: any; body: string; content: string; ideaText: string }
    ): Promise<void> {
        new Notice('Checking for duplicates...');
        const result = await this.context.duplicateDetector.checkDuplicate(content.ideaText);

        if (!result.isDuplicate || result.duplicates.length === 0) {
            new Notice('No duplicates found.');
            return;
        }

        // Show modal with duplicates
        new DuplicateResultsModal(
            this.context.app,
            result.duplicates,
            async (selected) => {
                const relatedPaths = selected.map(d => d.path);
                await this.updateIdeaFrontmatter(file, { related: relatedPaths });
                new Notice(`Linked ${selected.length} duplicate${selected.length > 1 ? 's' : ''} in frontmatter.`);
            }
        ).open();
    }
}

