import { TFile, Notice } from 'obsidian';
import { BaseCommand } from './BaseCommand';
import { CommandContext } from './CommandContext';

/**
 * Base class for commands that work with idea files
 * Handles common file validation and reading patterns
 */
export abstract class IdeaFileCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    /**
     * Execute the command with file validation
     */
    async execute(): Promise<void> {
        try {
            const file = this.getActiveIdeaFile();
            if (!file) {
                return;
            }

            const { frontmatter, body, content } = await this.readIdeaContent(file);
            const ideaText = body.trim();

            if (!ideaText || ideaText.length === 0) {
                new Notice('No idea text found in file.');
                return;
            }

            await this.executeWithFile(file, { frontmatter, body, content, ideaText });
        } catch (error) {
            this.handleError(error, this.getCommandName());
        }
    }

    /**
     * Execute the command with validated file and content
     */
    protected abstract executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void>;

    /**
     * Get the command name for error messages
     */
    protected abstract getCommandName(): string;

    /**
     * Get active idea file or show error
     */
    protected getActiveIdeaFile(): TFile | null {
        const file = this.context.app.workspace.getActiveFile();
        if (!file) {
            this.debug('No active file found');
            new Notice('No active note. Please open an idea file.');
            return null;
        }
        if (!file.path.startsWith('Ideas/')) {
            new Notice('This command works best with idea files in the Ideas/ directory.');
            // Continue anyway (user might have moved file)
        }
        return file;
    }

    /**
     * Read idea content and parse frontmatter
     */
    protected async readIdeaContent(file: TFile): Promise<{ frontmatter: Record<string, unknown>; body: string; content: string }> {
        const content = await this.context.app.vault.read(file);
        const parsed = this.context.frontmatterParser.parse(content);
        return {
            frontmatter: parsed.frontmatter,
            body: parsed.body,
            content: content
        };
    }

    /**
     * Update idea frontmatter with new values
     */
    protected async updateIdeaFrontmatter(
        file: TFile,
        updates: Partial<any>
    ): Promise<void> {
        const content = await this.context.app.vault.read(file);
        const parsed = this.context.frontmatterParser.parse(content);

        const updated = { ...parsed.frontmatter, ...updates };
        const newContent = this.context.frontmatterParser.build(updated, parsed.body);

        await this.context.app.vault.modify(file, newContent);
    }

    /**
     * Check service availability and show notice if unavailable
     */
    protected checkServiceAvailability(
        service: { isAvailable(): boolean },
        serviceName: string
    ): boolean {
        if (!service.isAvailable()) {
            new Notice(`${serviceName} is not configured. Please set it up in settings.`);
            return false;
        }
        return true;
    }

    /**
     * Check if LLM service is available
     */
    protected checkLLMAvailability(): boolean {
        if (!this.context.llmService.isAvailable()) {
            this.debug('LLM service not available');
            new Notice('AI service is not configured. Please set up AI in settings.');
            return false;
        }
        return true;
    }
}

