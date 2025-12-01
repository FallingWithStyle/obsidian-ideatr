import { Notice } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { extractIdeaNameRuleBased } from '../../utils/ideaNameExtractor';
import { formatDate, sanitizeTitle } from '../../storage/FilenameGenerator';

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
        const createdDate = new Date(content.frontmatter.created);
        const sanitizedCodename = sanitizeTitle(codename.trim());
        const dateStr = formatDate(createdDate);
        const newFilename = `${dateStr} ${sanitizedCodename}.md`;

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

        const prompt = `Generate a codename for this idea.

Idea: "${ideaText.substring(0, 500)}"

Requirements:
- 1-3 words maximum
- Easy to remember and pronounce
- Captures the idea's core concept
- Professional but creative
- Suitable for filenames

Examples:
- "bracelet that measures room volume" → "VolumeBand" or "SoundSense"
- "AI writing assistant" → "WriteBot" or "TextCraft"
- "social network for developers" → "DevNet" or "CodeConnect"

Return only the codename. No quotes, no explanation, just the name:`;

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

