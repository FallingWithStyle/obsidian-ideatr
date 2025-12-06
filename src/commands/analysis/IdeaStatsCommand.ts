import { TFile } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { IdeaStatsModal, type IdeaStats } from '../../views/IdeaStatsModal';
import type { IdeaFrontmatter } from '../../types/idea';

/**
 * Command: show-idea-stats
 * Show statistics for the current idea
 */
export class IdeaStatsCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'show idea stats';
    }

    // Note: This method is async to satisfy the base class interface (IdeaFileCommand.executeWithFile),
    // even though it doesn't contain any await expressions
    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        // Calculate stats
        const created = content.frontmatter.created 
            ? new Date(content.frontmatter.created as string | number | Date) 
            : new Date(file.stat.mtime);
        const age = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)); // days
        const relatedCount = Array.isArray(content.frontmatter.related) ? content.frontmatter.related.length : 0;
        const tagsCount = Array.isArray(content.frontmatter.tags) ? content.frontmatter.tags.length : 0;
        const domainsCount = Array.isArray(content.frontmatter.domains) ? content.frontmatter.domains.length : 0;
        const lastModified = new Date(file.stat.mtime);

        // Show modal with statistics
        const stats: IdeaStats = {
            age,
            status: (content.frontmatter.status as string) || 'unknown',
            category: (content.frontmatter.category as string) || 'none',
            relatedCount,
            tagsCount,
            domainsCount,
            lastModified,
            created,
            frontmatter: content.frontmatter as unknown as IdeaFrontmatter
        };

        new IdeaStatsModal(this.context.app, stats, this.context.ideaRepository).open();
    }
}

