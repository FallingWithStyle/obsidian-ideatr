import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { TenuousLinksModal } from '../../views/TenuousLinksModal';
import { RelatedIdConverter } from '../../utils/RelatedIdConverter';

/**
 * Command: find-tenuous-links
 * Find unexpected connections between ideas
 */
export class TenuousLinksCommand extends IdeaFileCommand {
    private idConverter: RelatedIdConverter;

    constructor(context: CommandContext) {
        super(context);
        this.idConverter = new RelatedIdConverter(context.ideaRepository);
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

        // Convert related IDs to paths for the service (it expects paths)
        const relatedIds = Array.isArray(content.frontmatter.related) 
            ? content.frontmatter.related.filter((id): id is number => typeof id === 'number' && id !== 0)
            : [];
        const relatedPaths = await this.idConverter.idsToPaths(relatedIds);

        const links = await this.context.tenuousLinkService.findTenuousLinks(
            content.ideaText,
            (content.frontmatter.category as string) || '',
            (Array.isArray(content.frontmatter.tags) ? content.frontmatter.tags : []) as string[],
            relatedPaths
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
                    // Add to related notes - convert path to ID
                    const currentRelatedIds = Array.isArray(content.frontmatter.related) 
                        ? content.frontmatter.related.filter((id): id is number => typeof id === 'number' && id !== 0)
                        : [];
                    const linkId = await this.idConverter.pathsToIds([link.idea.path]);
                    if (linkId.length > 0 && !currentRelatedIds.includes(linkId[0])) {
                        await this.updateIdeaFrontmatter(file, {
                            related: [...currentRelatedIds, linkId[0]]
                        });
                        new Notice(`Linked to ${link.idea.title}`);
                    }
                } else if (action === 'combine') {
                    // Create combined idea - convert paths to IDs
                    const currentFileId = await this.idConverter.pathsToIds([file.path]);
                    const linkId = await this.idConverter.pathsToIds([link.idea.path]);
                    const relatedIds = [...currentFileId, ...linkId].filter(id => id !== 0);
                    
                    const combinedContent = `---
type: idea
status: captured
created: ${new Date().toISOString().split('T')[0]}
id: 0
category: ${typeof content.frontmatter.category === 'string' ? content.frontmatter.category : String(content.frontmatter.category || '')}
tags: ${JSON.stringify([...(Array.isArray(content.frontmatter.tags) ? content.frontmatter.tags : []), 'combined'])}
related: ${JSON.stringify(relatedIds)}
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

