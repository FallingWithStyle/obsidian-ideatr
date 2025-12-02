import type { Vault, TFile } from 'obsidian';
import type { IdeaFile, IdeaFrontmatter } from '../types/idea';
import type { IProjectElevationService, ElevationResult } from '../types/management';
import type { IdeatrSettings } from '../settings';
import { FrontmatterParser } from './FrontmatterParser';
import { extractIdeaNameRuleBased } from '../utils/ideaNameExtractor';
import { frontmatterToYAML } from '../metadata/FrontmatterBuilder';
import { Logger } from '../utils/logger';

/**
 * ProjectElevationService - Handles elevation of ideas to projects
 */
export class ProjectElevationService implements IProjectElevationService {
    private vault: Vault;
    private frontmatterParser: FrontmatterParser;
    private settings: IdeatrSettings;

    constructor(vault: Vault, frontmatterParser: FrontmatterParser, settings: IdeatrSettings) {
        this.vault = vault;
        this.frontmatterParser = frontmatterParser;
        this.settings = settings;
    }

    /**
     * Get projects directory from settings
     */
    private getProjectsDirectory(): string {
        return this.settings.elevationProjectsDirectory || 'Projects';
    }

    /**
     * Get default folders from settings
     */
    private getDefaultFolders(): string[] {
        const foldersStr = this.settings.elevationDefaultFolders || 'docs,notes,assets';
        return foldersStr
            .split(',')
            .map(f => f.trim())
            .filter(f => f.length > 0);
    }

    /**
     * Validate if an idea can be elevated
     */
    canElevate(ideaFile: IdeaFile): boolean {
        // Check if idea has required frontmatter
        if (!ideaFile.frontmatter || !ideaFile.frontmatter.type || !ideaFile.frontmatter.status) {
            return false;
        }

        // Check if idea is already elevated
        if (ideaFile.frontmatter.status === 'elevated') {
            return false;
        }

        // Check if idea type is correct
        if (ideaFile.frontmatter.type !== 'idea') {
            return false;
        }

        return true;
    }

    /**
     * Generate project name from idea
     */
    generateProjectName(ideaFile: IdeaFile): string {
        // Extract name from body
        let name = extractIdeaNameRuleBased(ideaFile.body);

        // If body extraction failed, try filename
        if (!name || name.trim().length === 0) {
            // Remove extension from filename
            const filenameWithoutExt = ideaFile.filename.replace(/\.md$/, '');
            
            // Try format: YYYY-MM-DD Title
            const formatMatch = filenameWithoutExt.match(/^\d{4}-\d{2}-\d{2}\s+(.+)$/);
            if (formatMatch) {
                name = formatMatch[1];
            } else {
                name = filenameWithoutExt;
            }
        }

        // Sanitize for filesystem
        return this.sanitizeProjectName(name);
    }

    /**
     * Sanitize project name for filesystem use
     */
    private sanitizeProjectName(name: string): string {
        // Convert to lowercase
        let sanitized = name.toLowerCase();

        // Replace spaces and special characters with hyphens
        sanitized = sanitized.replace(/[^a-z0-9-]/g, '-');

        // Remove multiple consecutive hyphens
        sanitized = sanitized.replace(/-+/g, '-');

        // Remove leading/trailing hyphens
        sanitized = sanitized.replace(/^-+|-+$/g, '');

        // Truncate to 50 characters
        if (sanitized.length > 50) {
            sanitized = sanitized.substring(0, 50);
            // Remove trailing hyphen if truncated
            sanitized = sanitized.replace(/-+$/, '');
        }

        // Ensure minimum length
        if (sanitized.length < 1) {
            sanitized = 'project';
        }

        return sanitized;
    }

    /**
     * Check if project name is available
     */
    async isProjectNameAvailable(projectName: string): Promise<boolean> {
        const projectPath = `${this.getProjectsDirectory()}/${projectName}`;
        const existing = this.vault.getAbstractFileByPath(projectPath);
        return existing === null;
    }

    /**
     * Elevate an idea to a project
     */
    async elevateIdea(ideaFile: IdeaFile, projectName?: string): Promise<ElevationResult> {
        // Validate idea can be elevated
        if (!this.canElevate(ideaFile)) {
            return {
                success: false,
                error: 'Idea cannot be elevated. It may already be elevated or have invalid frontmatter.'
            };
        }

        // Find original file in vault
        const originalPath = `Ideas/${ideaFile.filename}`;
        const originalFile = this.vault.getAbstractFileByPath(originalPath) as TFile | null;

        if (!originalFile) {
            return {
                success: false,
                error: `Idea file not found: ${originalPath}`
            };
        }

        // Generate or use provided project name
        const baseProjectName = projectName || this.generateProjectName(ideaFile);
        const finalProjectName = await this.resolveProjectNameCollision(baseProjectName);
        const projectPath = `${this.getProjectsDirectory()}/${finalProjectName}`;

        const createdPaths: string[] = [];
        const warnings: string[] = [];

        try {
            // Read original file content
            const originalContent = await this.vault.read(originalFile);

            // Ensure Projects directory exists
            await this.ensureProjectsDirectory();

            // Create project folder structure
            await this.createProjectStructure(projectPath, createdPaths);

            // Create README.md with updated content
            const updatedContent = await this.prepareElevatedContent(originalContent, projectPath);
            await this.vault.create(`${projectPath}/README.md`, updatedContent);
            createdPaths.push(`${projectPath}/README.md`);

            // Create project metadata file
            try {
                await this.handleDevraIntegration(projectPath, ideaFile);
                createdPaths.push(`${projectPath}/.devra.json`);
            } catch (error) {
                warnings.push('Failed to create project metadata file (non-fatal)');
                Logger.warn('Project metadata integration failed:', error);
            }

            // Delete original file (last step)
            try {
                await this.vault.delete(originalFile);
            } catch (error) {
                warnings.push('Failed to delete original idea file (project created successfully)');
                Logger.warn('Failed to delete original file:', error);
            }

            return {
                success: true,
                projectPath,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        } catch (error) {
            // Rollback on critical failure
            await this.rollback(createdPaths);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error during elevation'
            };
        }
    }

    /**
     * Resolve project name collision by adding numeric suffix
     */
    private async resolveProjectNameCollision(baseName: string): Promise<string> {
        let projectName = baseName;
        let suffix = 2;

        while (!(await this.isProjectNameAvailable(projectName))) {
            projectName = `${baseName}-${suffix}`;
            suffix++;
        }

        return projectName;
    }

    /**
     * Ensure Projects directory exists
     */
    private async ensureProjectsDirectory(): Promise<void> {
        const projectsDir = this.getProjectsDirectory();
        const folder = this.vault.getAbstractFileByPath(projectsDir);
        if (!folder) {
            await this.vault.createFolder(projectsDir);
        }
    }

    /**
     * Create project folder structure
     */
    private async createProjectStructure(projectPath: string, createdPaths: string[]): Promise<void> {
        const folders = this.getDefaultFolders();

        // Create project root folder
        await this.vault.createFolder(projectPath);
        createdPaths.push(projectPath);

        // Create subfolders from settings
        for (const folder of folders) {
            const folderPath = `${projectPath}/${folder}`;
            await this.vault.createFolder(folderPath);
            createdPaths.push(folderPath);
        }
    }

    /**
     * Prepare content for elevated project (update frontmatter)
     */
    private async prepareElevatedContent(originalContent: string, projectPath: string): Promise<string> {
        // Parse existing frontmatter
        const frontmatter = this.frontmatterParser.parseFrontmatter(originalContent);
        if (!frontmatter) {
            throw new Error('Failed to parse frontmatter from original file');
        }

        // Extract body
        const bodyMatch = originalContent.match(/^---\n[\s\S]*?\n---(\n\n?|\n?)([\s\S]*)$/);
        const body = bodyMatch ? bodyMatch[2].trim() : '';

        // Update frontmatter
        const updatedFrontmatter: IdeaFrontmatter = {
            ...frontmatter,
            status: 'elevated',
            elevated: new Date().toISOString().split('T')[0],
            projectPath
        };

        // Convert to YAML
        const yaml = frontmatterToYAML(updatedFrontmatter);

        // Combine frontmatter and body
        return `${yaml}\n\n${body}`;
    }

    /**
     * Handle project metadata integration (stubbed)
     */
    private async handleDevraIntegration(projectPath: string, ideaFile: IdeaFile): Promise<void> {
        // Only create project metadata if enabled in settings
        if (!this.settings.elevationCreateDevraMetadata) {
            return;
        }

        const devraMetadata = {
            name: this.generateProjectName(ideaFile),
            type: 'project',
            source: 'ideatr',
            elevated: new Date().toISOString().split('T')[0],
            ideaPath: ideaFile.filename,
            ideaCategory: ideaFile.frontmatter.category || '',
            ideaTags: ideaFile.frontmatter.tags || [],
            devraReady: false,
            devraProjectPath: null
        };

        const metadataPath = `${projectPath}/.devra.json`;
        await this.vault.adapter.write(metadataPath, JSON.stringify(devraMetadata, null, 2));
    }

    /**
     * Rollback created paths on failure
     */
    private async rollback(createdPaths: string[]): Promise<void> {
        // Delete in reverse order
        for (const path of [...createdPaths].reverse()) {
            try {
                const file = this.vault.getAbstractFileByPath(path);
                if (file) {
                    // Check if it's a file (TFile) or folder
                    if ('extension' in file) {
                        // It's a file
                        await this.vault.delete(file as TFile);
                    } else {
                        // It's a folder
                        await this.vault.adapter.rmdir(path, true);
                    }
                }
            } catch (error) {
                Logger.warn(`Failed to rollback ${path}:`, error);
            }
        }
    }
}

