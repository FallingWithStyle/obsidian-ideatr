import { Notice, TFile } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { GuidedIdeationService } from '../../services/GuidedIdeationService';
import { GuidedIdeationModal } from '../../views/GuidedIdeationModal';
import { Logger } from '../../utils/logger';
import type { TransformationResult, TransformationPlan } from '../../types/transformation';

/**
 * Command: Transform
 * Allows users to describe transformations in natural language
 */
export class GuidedIdeationCommand extends IdeaFileCommand {
    private service: GuidedIdeationService;

    constructor(context: CommandContext) {
        super(context);
        this.service = new GuidedIdeationService(context.llmService);
    }

    protected getCommandName(): string {
        return 'Transform';
    }

    protected async executeWithFile(
        file: TFile,
        content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.checkLLMAvailability()) {
            return;
        }

        // Open modal for user input
        new GuidedIdeationModal(
            this.context.app,
            this.service,
            content.content,
            content.frontmatter,
            content.body,
            file.basename,
            async (result, plan) => {
                await this.applyTransformation(file, result, plan, content);
            }
        ).open();
    }

    /**
     * Apply transformation result to file
     */
    private async applyTransformation(
        file: TFile,
        result: TransformationResult,
        plan: TransformationPlan,
        originalContent: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        try {
            // Create backup
            const backupPath = file.path.replace(/\.md$/, '.backup.md');
            try {
                await this.context.app.vault.create(backupPath, originalContent.content);
            } catch (error) {
                Logger.warn('Failed to create backup file:', error);
                // Continue anyway
            }

            let targetFile = file;

            // Handle file rename if needed
            if (result.newFilename) {
                // Extract just the filename (remove any path components)
                let newFilename = result.newFilename.split('/').pop() || result.newFilename;
                // Remove .md extension if present for comparison
                const newBasename = newFilename.replace(/\.md$/, '');
                
                // Only rename if different
                if (newBasename !== file.basename) {
                    // Ensure .md extension
                    if (!newFilename.endsWith('.md')) {
                        newFilename = `${newFilename}.md`;
                    }
                    const newPath = file.path.replace(file.name, newFilename);
                    try {
                        await this.context.app.vault.rename(file, newPath);
                        const targetFileAbstract = this.context.app.vault.getAbstractFileByPath(newPath);
                        targetFile = targetFileAbstract instanceof TFile ? targetFileAbstract : null;
                        if (!targetFile) {
                            throw new Error('File rename succeeded but could not find renamed file');
                        }
                        new Notice(`File renamed to ${newFilename}`);
                    } catch (error) {
                        Logger.error('Failed to rename file:', error);
                        new Notice('Failed to rename file. Other changes will still be applied.');
                    }
                }
            }

            // Update frontmatter if needed
            if (result.frontmatter && plan.requiresFrontmatterUpdate) {
                await this.context.fileManager.updateIdeaFrontmatter(targetFile, result.frontmatter);
            }

            // Update body if needed
            if (result.body && plan.requiresBodyModification) {
                await this.updateFileBody(targetFile, result.body);
            }

            new Notice('Transformation applied successfully!');
        } catch (error) {
            Logger.error('Failed to apply transformation:', error);
            throw error;
        }
    }

    /**
     * Update file body content
     */
    private async updateFileBody(file: TFile, newBody: string): Promise<void> {
        await this.context.app.vault.process(file, (content) => {
            // Extract frontmatter
            const frontmatterRegex = /^---\n([\s\S]*?)\n---(\n\n?|\n?)/;
            const match = content.match(frontmatterRegex);
            
            if (match) {
                // Replace body while keeping frontmatter
                return match[0] + newBody;
            } else {
                // No frontmatter, just replace entire content
                return newBody;
            }
        });
    }
}

