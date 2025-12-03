import { Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { extractIdeaNameRuleBased } from '../../utils/ideaNameExtractor';
import { sanitizeTitle } from '../../storage/FilenameGenerator';

/**
 * Command: add-codename
 * Generate or update codename for the current idea
 */
export class CodenameCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'generate codename';
    }

    protected async executeWithFile(
        file: any,
        content: { frontmatter: any; body: string; content: string; ideaText: string }
    ): Promise<void> {
        // Check if LLM is available
        if (!this.context.llmService?.isAvailable() || !this.context.llmService.complete) {
            new Notice('LLM service is not available. Cannot generate codename.');
            return;
        }

        // Extract idea name/title for context
        const ideaName = extractIdeaNameRuleBased(content.body);
        const ideaText = ideaName ? `${ideaName}\n\n${content.body}` : content.body;

        // Generate codename automatically
        new Notice('Generating codename...');
        
        const codename = await this.generateCodename(ideaText);
        
        if (!codename) {
            new Notice('Failed to generate codename. Please try again.');
            return;
        }

        // Update frontmatter with generated codename
        await this.updateIdeaFrontmatter(file, {
            codename: codename.trim()
        });

        // Update filename
        const sanitizedCodename = sanitizeTitle(codename.trim());
        const newFilename = `${sanitizedCodename}.md`;

        // Rename file if filename changed
        const currentFilename = file.name;
        if (currentFilename !== newFilename) {
            const directory = file.path.substring(0, file.path.lastIndexOf('/') + 1);
            const newPath = directory + newFilename;
            await this.context.app.vault.rename(file, newPath);
        }

        new Notice(`Codename "${codename}" generated successfully.`);
    }

    private async generateCodename(ideaText: string): Promise<string | null> {
        if (!this.context.llmService?.complete) {
            return null;
        }

        const prompt = `Generate a memorable, brandable codename for this idea.

Idea: "${ideaText.substring(0, 500)}"

CRITICAL REQUIREMENTS:
- Extract the CORE CONCEPT, not just use the literal text
- Focus on what makes the idea unique or memorable
- Create a codename that could work as a project/product name
- Prioritize memorability and pronounceability over literal accuracy

Requirements:
- 1-3 words maximum (prefer 1-2 words)
- Easy to remember and pronounce (test: can you say it naturally?)
- Captures the idea's essence in a creative way
- Professional but distinctive
- Suitable for filenames (alphanumeric, hyphens, spaces only)
- 2-20 characters total (shorter is usually better)
- IMPORTANT: Avoid unpronounceable acronyms longer than 6 characters. If using acronyms, they must be pronounceable (e.g., "ACME" is fine, "AGPFOIM" is not)

Codename strategies:
- Portmanteau: Blend key words (e.g., "net" + "flicks" → "Netflix")
- Compound: Combine two relevant words (e.g., "VolumeBand", "SoundSense")
- Single word: Use a powerful, relevant word (e.g., "Zen", "Ping", "Alert")
- Short acronym: Only if pronounceable and 6 chars or fewer (e.g., "NASA", "ACME")

Examples:
- "bracelet that measures room volume" → "VolumeBand", "SoundSense", "EchoBand"
- "AI writing assistant" → "WriteBot", "TextCraft", "WordSmith"
- "social network for developers" → "DevNet", "CodeConnect", "DevHub"
- "AI generated puzzle full of interlinked monkeys that look similar, sort of a where's waldo of monkeys" → "MonkeyFind", "PrimateSeek", "ApeSpot", "FindMonkey"
- "task manager for remote teams" → "TaskFlow", "TeamSync", "RemoteTask"

Return ONLY the codename. No quotes, no explanation, no prefixes like "Codename:" or "Name:". Just the name itself:`;

        try {
            const response = await this.context.llmService.complete(prompt, {
                temperature: 0.8,
                n_predict: 50,
                stop: ['\n', '.', '!', '?', '"', "'"]
            });

            // Clean and validate the response
            let codename = response.trim();
            
            // Remove quotes if present
            codename = codename.replace(/^["']|["']$/g, '');
            
            // Truncate to 30 characters
            codename = codename.substring(0, 30).trim();
            
            // Remove special characters (keep alphanumeric, spaces, hyphens)
            codename = codename.replace(/[^a-zA-Z0-9\s-]/g, '');
            
            // Validate: must be at least 2 characters
            if (codename.length < 2) {
                return null;
            }
            
            return codename;
        } catch (error) {
            console.error('Codename generation failed:', error);
            throw error;
        }
    }
}

