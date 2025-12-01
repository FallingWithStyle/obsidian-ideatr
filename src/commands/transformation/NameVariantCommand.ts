import { Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';

/**
 * Command: generate-name-variants
 * Generate name variants for the current active note
 */
export class NameVariantCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'generate name variants';
    }

    protected async executeWithFile(
        file: any,
        content: { frontmatter: any; body: string; content: string; ideaText: string }
    ): Promise<void> {
        new Notice('Generating name variants...');
        const variants = await this.context.nameVariantService.generateVariants(content.ideaText);

        if (variants.length === 0) {
            new Notice('No name variants could be generated.');
            return;
        }

        // Format and append
        const formatted = this.context.nameVariantService.formatVariantsForMarkdown(variants);
        await this.context.fileManager.appendToFileBody(file, 'Name Variants', formatted);

        new Notice(`Name variants generated and added to note.`);
    }
}

