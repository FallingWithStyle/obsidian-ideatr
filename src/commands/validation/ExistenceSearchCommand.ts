import { Notice, TFile } from 'obsidian';
import type { IdeaCategory } from '../../types/classification';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';

/**
 * Command: search-existence
 * Search for similar ideas/products/services
 */
export class ExistenceSearchCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'search existence';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.checkServiceAvailability(this.context.webSearchService, 'Web search')) {
            return;
        }

        const category = content.frontmatter.category ?? '';
        new Notice('Searching for similar ideas...');
        const results = await this.context.webSearchService.search(content.ideaText, category as IdeaCategory | undefined);

        if (results.length === 0) {
            new Notice('No similar ideas found.');
            return;
        }

        // Format results for frontmatter
        const summaries = results.map(r => 
            `${r.title}: ${r.snippet} (${r.url})`
        );

        await this.updateIdeaFrontmatter(file, { 'existence-check': summaries });

        new Notice(`Search complete: Found ${results.length} similar idea${results.length > 1 ? 's' : ''}`);
    }
}

