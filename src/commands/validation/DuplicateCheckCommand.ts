import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { DuplicateResultsModal } from '../../views/DuplicateResultsModal';
import { RelatedIdConverter } from '../../utils/RelatedIdConverter';

/**
 * Command: check-duplicates
 * Check for duplicate ideas
 */
export class DuplicateCheckCommand extends IdeaFileCommand {
    private idConverter: RelatedIdConverter;

    constructor(context: CommandContext) {
        super(context);
        this.idConverter = new RelatedIdConverter(context.ideaRepository);
    }

    protected getCommandName(): string {
        return 'check duplicates';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
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
            (selected) => {
                void (async () => {
                    // Convert paths to IDs
                    const relatedPaths = selected.map(d => d.path);
                    const relatedIds = await this.idConverter.pathsToIds(relatedPaths);
                    await this.updateIdeaFrontmatter(file, { related: relatedIds });
                    new Notice(`Linked ${selected.length} duplicate${selected.length > 1 ? 's' : ''} in frontmatter.`);
                })();
            }
        ).open();
    }
}

