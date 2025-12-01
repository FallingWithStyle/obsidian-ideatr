import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { IdeaStatsModal, type IdeaStats } from '../../views/IdeaStatsModal';

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

    protected async executeWithFile(
        file: any,
        content: { frontmatter: any; body: string; content: string; ideaText: string }
    ): Promise<void> {
        // Calculate stats
        const created = content.frontmatter.created 
            ? new Date(content.frontmatter.created) 
            : new Date(file.stat.mtime);
        const age = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)); // days
        const relatedCount = (content.frontmatter.related || []).length;
        const tagsCount = (content.frontmatter.tags || []).length;
        const domainsCount = (content.frontmatter.domains || []).length;
        const lastModified = new Date(file.stat.mtime);

        // Show modal with statistics
        const stats: IdeaStats = {
            age,
            status: content.frontmatter.status || 'unknown',
            category: content.frontmatter.category || 'none',
            relatedCount,
            tagsCount,
            domainsCount,
            lastModified,
            created,
            frontmatter: content.frontmatter
        };

        new IdeaStatsModal(this.context.app, stats).open();
    }
}

