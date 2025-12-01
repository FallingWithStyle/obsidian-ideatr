import { Notice } from 'obsidian';
import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';

/**
 * Command: generate-digest
 * Generate weekly digest
 */
export class DigestCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    async execute(): Promise<void> {
        try {
            new Notice('Generating digest...');
            const digest = await this.context.resurfacingService.generateDigest();
            
            // For v1, open digest in a new note
            // In v2, we'd show it in a modal or dedicated view
            const digestContent = digest.summary;
            const digestPath = `Ideas/.ideatr-digest-${Date.now()}.md`;
            
            await this.context.app.vault.create(digestPath, digestContent);
            new Notice(`Digest generated: ${digest.ideas.length} ideas`);
            
            // Open the digest file
            const file = this.context.app.vault.getAbstractFileByPath(digestPath);
            if (file) {
                await this.context.app.workspace.openLinkText(digestPath, '', false);
            }
        } catch (error) {
            this.handleError(error, 'generate digest');
        }
    }
}

