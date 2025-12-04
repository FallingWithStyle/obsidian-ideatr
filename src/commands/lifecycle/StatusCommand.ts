import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { StatusPickerModal, type IdeaStatus } from '../../views/StatusPickerModal';

/**
 * Command: change-status
 * Change idea status with picker modal
 */
export class StatusCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'change status';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        const currentStatusStr = (content.frontmatter.status as string) || 'captured';

        // Show status picker modal
        new StatusPickerModal(
            this.context.app,
            currentStatusStr,
            async (newStatus: IdeaStatus) => {
                await this.updateIdeaFrontmatter(file, { status: newStatus });

                // Handle file movement based on status
                const prevStatus: any = content.frontmatter.status;
                const wasArchived = prevStatus === 'archived';
                const isNowArchived = (newStatus as string) === 'archived';
                if (isNowArchived) {
                    await this.context.fileOrganizer.moveToArchive(file);
                } else if (wasArchived && !isNowArchived) {
                    await this.context.fileOrganizer.moveFromArchive(file);
                }

                new Notice(`Status changed to ${newStatus}`);
            }
        ).open();
    }
}

