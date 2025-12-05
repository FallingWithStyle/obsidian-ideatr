import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import type { DomainService } from '../../services/DomainService';

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
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
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
        // DomainService has a private prospectrService property
        // We need to check if the service is available through the public API
        const domainService = this.context.domainService as DomainService & { prospectrService?: { isAvailable(): boolean } };
        const prospectrService = domainService.prospectrService;
        if (!prospectrService || !prospectrService.isAvailable()) {
            if (this.context.settings.enableProspectr) {
                new Notice('Domain checking is not configured. Please set up the domain checking service in settings.');
            } else {
                new Notice('Domain checking is not available.');
            }
            return false;
        }
        return true;
    }
}

