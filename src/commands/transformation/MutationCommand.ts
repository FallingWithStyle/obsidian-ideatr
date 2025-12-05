import { TFile,  Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import type { IdeaCategory } from '../../types/classification';
import { CommandContext } from '../base/CommandContext';
import { MutationSelectionModal } from '../../views/MutationSelectionModal';
import { generateFilename } from '../../storage/FilenameGenerator';
import { RelatedIdConverter } from '../../utils/RelatedIdConverter';

/**
 * Command: generate-mutations
 * Generate idea variations/mutations
 */
export class MutationCommand extends IdeaFileCommand {
    private idConverter: RelatedIdConverter;

    constructor(context: CommandContext) {
        super(context);
        this.idConverter = new RelatedIdConverter(context.ideaRepository);
    }

    protected getCommandName(): string {
        return 'generate mutations';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.checkLLMAvailability()) {
            return;
        }

        new Notice('Generating mutations...');

        // Check if LLM service supports mutations
        if (!this.context.llmService.generateMutations) {
            new Notice('Mutation generation is not supported by the current AI provider.');
            return;
        }

        let mutations;
        try {
            mutations = await this.context.llmService.generateMutations(content.ideaText, {
                category: content.frontmatter.category as IdeaCategory | undefined,
                tags: (Array.isArray(content.frontmatter.tags) ? content.frontmatter.tags : undefined) as string[] | undefined,
                count: 8,
            });
        } catch (error) {
            // Show error modal with retry option
            const { MutationErrorModal } = await import('../../views/MutationErrorModal');
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const errorWithDetails = error as Error & { responseLength?: number; responsePreview?: string };
            const responseLength = errorWithDetails.responseLength ?? 
                (errorMessage.includes('empty response') ? 0 : undefined);
            const responsePreview = errorWithDetails.responsePreview;
            
            new MutationErrorModal(
                this.context.app,
                {
                    message: errorMessage,
                    responseLength,
                    responsePreview: responsePreview?.substring(0, 500),
                    canRetry: true,
                },
                async () => {
                    await this.execute();
                }
            ).open();
            return;
        }

        if (mutations.length === 0) {
            new Notice('No mutations could be generated.');
            return;
        }

        // Show modal with mutations
        new MutationSelectionModal(
            this.context.app,
            mutations,
            async (selected, action) => {
                if (action === 'save') {
                    // Save selected mutations as new ideas
                    // Convert file path to ID
                    const relatedIds = await this.idConverter.pathsToIds([file.path]);
                    
                    for (const mutation of selected) {
                        const newContent = `---
type: idea
status: captured
created: ${new Date().toISOString().split('T')[0]}
id: 0
category: ${typeof content.frontmatter.category === 'string' ? content.frontmatter.category : String(content.frontmatter.category || '')}
tags: ${JSON.stringify(content.frontmatter.tags || [])}
related: ${JSON.stringify(relatedIds)}
domains: []
existence-check: []
---

# ${mutation.title}

${mutation.description}

## Key Differences
${mutation.differences.map(d => `- ${d}`).join('\n')}
`;
                        const newPath = `Ideas/${generateFilename(mutation.title, new Date())}`;
                        await this.context.app.vault.create(newPath, newContent);
                    }
                    new Notice(`Created ${selected.length} new idea${selected.length > 1 ? 's' : ''} from mutations.`);
                } else {
                    // Append to current note
                    const mutationsText = selected.map(m => 
                        `## ${m.title}\n\n${m.description}\n\n**Key Differences:**\n${m.differences.map(d => `- ${d}`).join('\n')}`
                    ).join('\n\n---\n\n');
                    await this.context.fileManager.appendToFileBody(file, 'Mutations', mutationsText);
                    new Notice(`Added ${selected.length} mutation${selected.length > 1 ? 's' : ''} to note.`);
                }
            }
        ).open();
    }
}

