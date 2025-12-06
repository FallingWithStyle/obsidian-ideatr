import { Notice, TFile } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import type { IdeaCategory } from '../../types/classification';
import type { IdeaFrontmatter } from '../../types/idea';

/**
 * Command: quick-validate
 * Run all validations in parallel
 */
export class QuickValidateCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'run validations';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        new Notice('Running all validations...');

        // Run all validations in parallel
        const results = await Promise.allSettled([
            this.context.domainService.checkDomains(content.ideaText).catch(e => {
                console.error('Domain check failed:', e);
                return [];
            }),
            this.context.webSearchService.isAvailable() 
                ? this.context.webSearchService.search(content.ideaText, content.frontmatter.category as IdeaCategory | undefined).catch(e => {
                    console.error('Web search failed:', e);
                    return [];
                })
                : Promise.resolve([]),
            this.context.duplicateDetector.checkDuplicate(content.ideaText).catch(e => {
                console.error('Duplicate check failed:', e);
                return { isDuplicate: false, duplicates: [], threshold: 0.75 };
            }),
        ]);

        const domainResults = results[0].status === 'fulfilled' ? results[0].value : [];
        const searchResults = results[1].status === 'fulfilled' ? results[1].value : [];
        const duplicateResult = results[2].status === 'fulfilled' ? results[2].value : { isDuplicate: false, duplicates: [], threshold: 0.75 };

        // Update frontmatter with all results
        const updates: Partial<IdeaFrontmatter> = {};

        if (domainResults.length > 0) {
            const domainStrings = domainResults.map(r => 
                r.available ? `${r.domain}: available` : `${r.domain}: unavailable${r.error ? ` (${r.error})` : ''}`
            );
            updates.domains = domainStrings;
        }

        if (searchResults.length > 0) {
            const summaries = searchResults.map(r => 
                `${r.title}: ${r.snippet} (${r.url})`
            );
            updates['existence-check'] = summaries;
        }

        if (duplicateResult.isDuplicate && duplicateResult.duplicates.length > 0) {
            new Notice(`Found ${duplicateResult.duplicates.length} potential duplicate${duplicateResult.duplicates.length > 1 ? 's' : ''}. Use "check-duplicates" command to review.`);
        }

        if (Object.keys(updates).length > 0) {
            await this.updateIdeaFrontmatter(file, updates);
        }

        const summary = [
            `Domains: ${domainResults.length} checked`,
            `Search: ${searchResults.length} found`,
            `Duplicates: ${duplicateResult.isDuplicate ? duplicateResult.duplicates.length + ' found' : 'none'}`
        ].join(', ');

        new Notice(`Validation complete: ${summary}`);
    }
}

