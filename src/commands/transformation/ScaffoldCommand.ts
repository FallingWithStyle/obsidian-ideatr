import { Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import type { TFile } from 'obsidian';
import { CommandContext } from '../base/CommandContext';
import type { IdeaCategory } from '../../types/classification';

/**
 * Command: generate-scaffold
 * Generate scaffold for the current active note
 */
export class ScaffoldCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'generate scaffold';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        // Extract category from frontmatter if available
        let category: IdeaCategory = '';
        const frontmatterMatch = content.content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const categoryMatch = frontmatterMatch[1].match(/^category:\s*(.+)$/m);
            if (categoryMatch) {
                const categoryValue = categoryMatch[1].trim();
                category = categoryValue as IdeaCategory;
            }
        }

        new Notice('Generating scaffold...');
        const scaffold = this.context.scaffoldService.generateScaffold(content.ideaText, category);

        // Determine action (append or new note)
        const action = this.context.settings.scaffoldDefaultAction || 'append';

        if (action === 'append') {
            await this.context.fileManager.appendToFileBody(file, 'Scaffold', scaffold);
            new Notice('Scaffold generated and added to note.');
        } else {
            // Create new note (future enhancement - for now, just append)
            await this.context.fileManager.appendToFileBody(file, 'Scaffold', scaffold);
            new Notice('Scaffold generated and added to note.');
        }
    }
}

