import { Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';

/**
 * Command: check-domains
 * Check domain availability for current note
 */
export class DomainCheckCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'check domains';
    }

    protected async executeWithFile(
        file: any,
        content: { frontmatter: any; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.checkDomainServiceAvailability()) {
            return;
        }

        new Notice('Checking domains...');
        const results = await this.context.domainService.checkDomains(content.ideaText);

        if (results.length === 0) {
            new Notice('No domains found in idea text.');
            return;
        }

        // Format results for frontmatter
        const domainStrings = results.map(r => 
            r.available ? `${r.domain}: available` : `${r.domain}: unavailable${r.error ? ` (${r.error})` : ''}`
        );

        await this.updateIdeaFrontmatter(file, { domains: domainStrings });

        const availableCount = results.filter(r => r.available).length;
        new Notice(`Domain check complete: ${availableCount}/${results.length} available`);
    }

    private checkDomainServiceAvailability(): boolean {
        const prospectrService = (this.context.domainService as any).prospectrService;
        if (!prospectrService || !prospectrService.isAvailable()) {
            if (this.context.settings.enableProspectr) {
                new Notice('Domain checking is not configured. Please set up Prospectr in settings.');
            } else {
                new Notice('Domain checking is not available.');
            }
            return false;
        }
        return true;
    }
}

