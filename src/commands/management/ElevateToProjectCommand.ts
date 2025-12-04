import { Notice } from 'obsidian';
import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';
import { Logger } from '../../utils/logger';
import { showConfirmation } from '../../utils/confirmation';

/**
 * Command: elevate-to-project
 * Elevate idea to project
 */
export class ElevateToProjectCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    async execute(): Promise<void> {
        try {
            const activeFile = this.context.app.workspace.getActiveFile();
            
            if (!activeFile) {
                new Notice('No active note. Please open an idea file.');
                return;
            }
            
            // Check if file is in Ideas/ directory
            if (!activeFile.path.startsWith('Ideas/')) {
                new Notice('This command works with idea files in the Ideas/ directory.');
                return;
            }
            
            // Read file content
            const content = await this.context.app.vault.read(activeFile);
            
            // Parse idea file
            const ideaFile = this.context.frontmatterParser.parseIdeaFile(
                { path: activeFile.path, name: activeFile.name },
                content
            );
            
            // Validate idea can be elevated
            if (!this.context.projectElevationService.canElevate(ideaFile)) {
                new Notice('This idea cannot be elevated. It may already be elevated or have invalid frontmatter.');
                return;
            }
            
            // Show confirmation
            const projectName = this.context.projectElevationService.generateProjectName(ideaFile);
            const confirmed = await showConfirmation(
                this.context.app,
                `Elevate idea to project?\n\n` +
                `Project name: ${projectName}\n\n` +
                `The idea file will be moved to Projects/${projectName}/README.md\n` +
                `Original file will be deleted.`
            );
            
            if (!confirmed) {
                return;
            }
            
            // Elevate idea
            new Notice('Elevating idea to project...');
            const result = await this.context.projectElevationService.elevateIdea(ideaFile);
            
            if (result.success) {
                new Notice(`Idea elevated to project: ${result.projectPath}`);
                
                // Refresh idea repository cache
                await this.context.ideaRepository.refresh();
                
                // Open the new project README
                const projectReadme = this.context.app.vault.getAbstractFileByPath(`${result.projectPath}/README.md`);
                if (projectReadme) {
                    await this.context.app.workspace.openLinkText(`${result.projectPath}/README.md`, '', false);
                }
            } else {
                new Notice(`Failed to elevate idea: ${result.error || 'Unknown error'}`);
                if (result.warnings && result.warnings.length > 0) {
                    Logger.warn('Elevation warnings:', result.warnings);
                }
            }
        } catch (error) {
            this.handleError(error, 'elevate idea to project', 'elevate-idea');
        }
    }
}

