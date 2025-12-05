import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';

/**
 * Command: archive-idea / unarchive-idea
 * Archive or unarchive the current idea
 */
export class ArchiveCommand extends IdeaFileCommand {
    constructor(context: CommandContext, private readonly isArchive: boolean) {
        super(context);
    }

    protected getCommandName(): string {
        return this.isArchive ? 'archive idea' : 'unarchive idea';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (this.isArchive) {
            // Update status to archived
            await this.updateIdeaFrontmatter(file, { status: 'archived' });
            // Move to archive directory if enabled
            await this.context.fileOrganizer.moveToArchive(file);
            new Notice('Idea archived successfully.');
        } else {
            // Determine previous status
            const previousStatus = (content.frontmatter.status === 'archived' ? 'captured' : content.frontmatter.status || 'captured');
            // Update status from archived
            await this.updateIdeaFrontmatter(file, { status: previousStatus });
            // Move from archive if enabled
            await this.context.fileOrganizer.moveFromArchive(file);
            new Notice('Idea unarchived successfully.');
        }
    }
}

