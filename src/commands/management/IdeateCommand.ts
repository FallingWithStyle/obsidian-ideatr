import { TFile, Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { RelatedIdConverter } from '../../utils/RelatedIdConverter';
import { extractIdeaNameRuleBased } from '../../utils/ideaNameExtractor';
import { Logger } from '../../utils/logger';

/**
 * Command: ideate
 * Apply AI ideation to the currently open note (same as Ideate button in capture modal)
 */
export class IdeateCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'ideate';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        // Check if LLM service is available
        if (!this.checkLLMAvailability()) {
            return;
        }

        if (!this.context.llmService) {
            new Notice('AI service is not configured. Please set up AI in settings.');
            return;
        }

        new Notice('Processing idea with AI...');

        try {
            // Step 1: Classify the idea (exclude current file from related notes)
            const classification = await this.context.classificationService.classifyIdea(content.ideaText, file.path);

            // Step 2: Generate simple title/subject
            let title = '';
            if (this.context.llmService.complete) {
                try {
                    const titlePrompt = `Generate a concise, descriptive title for this idea.

Idea: "${content.ideaText}"

Requirements:
- 2-8 words maximum
- Descriptive and clear (captures the core concept)
- Not overly creative or abstract
- Should help someone quickly understand what this idea is about
- Extract the key concept, not just use the first words

Examples:
- "AI generated puzzle full of interlinked monkeys" → "AI Monkey Puzzle Game"
- "notification app that sends alerts" → "Notification App"
- "task manager for remote teams" → "Team Task Manager"

Title:`;
                    const titleResponse = await this.context.llmService.complete(titlePrompt, {
                        temperature: 0.3,
                        n_predict: 50,
                        stop: ['\n', '.', '!', '?']
                    });
                    title = titleResponse.trim().replace(/^["']|["']$/g, '').substring(0, 100);
                } catch (error) {
                    Logger.warn('Title generation failed, using fallback:', error);
                    title = extractIdeaNameRuleBased(content.ideaText);
                }
            } else {
                title = extractIdeaNameRuleBased(content.ideaText);
            }

            // Step 3: Generate ideas and questions expansion
            let expansionText = '';
            if (this.context.llmService.expandIdea) {
                try {
                    // Try using the expandIdea method first
                    const expansionResult = await this.context.llmService.expandIdea(content.ideaText, {
                        category: classification.category,
                        tags: classification.tags,
                        detailLevel: 'detailed'
                    });
                    expansionText = expansionResult.expandedText;
                } catch (error) {
                    Logger.warn('Expansion via expandIdea failed, trying fallback:', error);
                    // Fallback to custom prompt if expandIdea fails
                    if (this.context.llmService.complete) {
                        try {
                            const expansionPrompt = `Expand this idea with related concepts, questions, and next steps.

Original Idea:
${content.ideaText}

Category: ${classification.category || 'general'}
Tags: ${classification.tags.join(', ') || 'none'}

Generate a structured expansion with:

## Related Ideas
2-3 variations or related concepts that explore different angles or implementations. Each should be:
- Distinct from the original but clearly related
- Brief (1-2 sentences each)
- Practical and actionable

## Key Questions
3-4 important questions to explore. Focus on:
- Validation questions (who needs this? what problem does it solve?)
- Implementation questions (how would this work? what's needed?)
- Strategic questions (what are the risks? what's the market?)

## Next Steps
1-2 concrete, actionable next steps to move forward. Be specific and practical.

Format as markdown with the sections above. Keep it concise and actionable - each item should be brief but meaningful.

Response:`;

                            expansionText = await this.context.llmService.complete(expansionPrompt, {
                                temperature: 0.7,
                                n_predict: 800
                            });
                        } catch (fallbackError) {
                            Logger.warn('Expansion generation failed:', fallbackError);
                            expansionText = '';
                        }
                    }
                }
            } else if (this.context.llmService.complete) {
                // If expandIdea is not available, use complete with custom prompt
                try {
                    const expansionPrompt = `Expand this idea with related concepts, questions, and next steps.

Original Idea:
${content.ideaText}

Category: ${classification.category || 'general'}
Tags: ${classification.tags.join(', ') || 'none'}

Generate a structured expansion with:

## Related Ideas
2-3 variations or related concepts that explore different angles or implementations. Each should be:
- Distinct from the original but clearly related
- Brief (1-2 sentences each)
- Practical and actionable

## Key Questions
3-4 important questions to explore. Focus on:
- Validation questions (who needs this? what problem does it solve?)
- Implementation questions (how would this work? what's needed?)
- Strategic questions (what are the risks? what's the market?)

## Next Steps
1-2 concrete, actionable next steps to move forward. Be specific and practical.

Format as markdown with the sections above. Keep it concise and actionable - each item should be brief but meaningful.

Response:`;

                    expansionText = await this.context.llmService.complete(expansionPrompt, {
                        temperature: 0.7,
                        n_predict: 800
                    });
                } catch (error) {
                    Logger.warn('Expansion generation failed:', error);
                    expansionText = '';
                }
            }

            // Step 4: Update file with title, classification, and expansion
            // First, update frontmatter with classification
            // Convert paths to IDs and filter out the current file's ID
            const allRelatedPaths = [...new Set(classification.related)];
            const idConverter = new RelatedIdConverter(this.context.ideaRepository);
            const allRelatedIds = await idConverter.pathsToIds(allRelatedPaths);
            
            // Get current file's ID from frontmatter and filter it out
            const currentFileId = typeof content.frontmatter.id === 'number' ? content.frontmatter.id : null;
            const filteredRelatedIds = currentFileId 
                ? allRelatedIds.filter(id => id !== currentFileId && id !== 0)
                : allRelatedIds.filter(id => id !== 0);
            
            await this.updateIdeaFrontmatter(file, {
                category: classification.category,
                tags: classification.tags,
                related: filteredRelatedIds
            });

            // Then, update the body: add title as heading, keep original text, add expansion
            await this.context.app.vault.process(file, (fileContent) => {
                // Extract body (everything after frontmatter)
                const frontmatterRegex = /^---\n[\s\S]*?\n---(\n\n?|\n?)/;
                const bodyMatch = fileContent.match(frontmatterRegex);
                const body = bodyMatch ? fileContent.substring(bodyMatch[0].length) : fileContent;

                // Preserve body content - only trim trailing whitespace, not leading
                const trimmedBody = body.replace(/\s+$/, '');

                // Check if body already has a heading (starts with #)
                const hasHeading = /^#+\s/.test(trimmedBody.trimStart());

                // Build new body: title heading + original text + expansion
                let newBody = '';
                if (title && !hasHeading) {
                    newBody += `# ${title}\n\n`;
                }
                // Preserve the body content, only removing trailing whitespace
                newBody += trimmedBody;
                if (expansionText?.trim()) {
                    // Check if expansion section already exists
                    const hasExpansion = trimmedBody.includes('## Ideas & Questions') || trimmedBody.includes('## Related Ideas');
                    if (!hasExpansion) {
                        // Add spacing if body doesn't end with newline
                        if (!trimmedBody.endsWith('\n')) {
                            newBody += '\n';
                        }
                        newBody += '\n---\n\n## Ideas & Questions\n\n' + expansionText.trim();
                    }
                }

                // Reconstruct full content
                const frontmatter = bodyMatch ? fileContent.substring(0, bodyMatch[0].length) : '';
                return frontmatter + newBody;
            });

            new Notice('Idea processed with AI!');
        } catch (error) {
            Logger.error('Ideate command failed:', error);
            this.handleError(error, this.getCommandName());
        }
    }
}

