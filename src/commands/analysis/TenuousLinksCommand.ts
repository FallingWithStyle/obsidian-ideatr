import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { TenuousLinksModal } from '../../views/TenuousLinksModal';

/**
 * Command: find-tenuous-links
 * Find unexpected connections between ideas
 */
export class TenuousLinksCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'find tenuous links';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.context.tenuousLinkService) {
            new Notice('Tenuous link service is not available.');
            return;
        }

        new Notice('Finding tenuous links... This may take a moment.');

        const links = await this.context.tenuousLinkService.findTenuousLinks(
            content.ideaText,
            (content.frontmatter.category as string) || '',
            (Array.isArray(content.frontmatter.tags) ? content.frontmatter.tags : []) as string[],
            (Array.isArray(content.frontmatter.related) ? content.frontmatter.related : []) as string[]
        );

        if (links.length === 0) {
            new Notice('No tenuous links found.');
            return;
        }

        // Show modal with links
        new TenuousLinksModal(
            this.context.app,
            links,
            async (link, action) => {
                if (action === 'link') {
                    // Add to related notes
                    const currentRelated = (Array.isArray(content.frontmatter.related) ? content.frontmatter.related : []) as string[];
                    if (!currentRelated.includes(link.idea.path)) {
                        await this.updateIdeaFrontmatter(file, {
                            related: [...currentRelated, link.idea.path]
                        });
                        new Notice(`Linked to ${link.idea.title}`);
                    }
                } else if (action === 'combine') {
                    // Create combined idea
                    const combinedContent = `---
type: idea
status: captured
created: ${new Date().toISOString().split('T')[0]}
category: ${content.frontmatter.category || ''}
tags: ${JSON.stringify([...(Array.isArray(content.frontmatter.tags) ? content.frontmatter.tags : []), 'combined'])}
related: ${JSON.stringify([file.path, link.idea.path])}
domains: []
existence-check: []
---

# Combined Idea

## Original Idea
${content.ideaText}

## Linked Idea
${link.explanation}

## Synergy
${link.synergy || 'Potential combination of these ideas'}
`;
                    const newPath = `Ideas/${new Date().toISOString().split('T')[0]}-combined-idea.md`;
                    await this.context.app.vault.create(newPath, combinedContent);
                    new Notice('Created combined idea.');
                }
            }
        ).open();
    }
}

