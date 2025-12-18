/**
 * Service Adapters - Bridge between plugin interfaces and core services
 * 
 * These adapters convert between plugin types (IdeaFile) and core types (Idea)
 * to allow the plugin to use core services while maintaining backward compatibility.
 */

import type { IdeaFile, IdeaFrontmatter } from '../types/idea';
import type { Idea } from '@ideatr/core';
import type { 
    IProjectElevationService, 
    IResurfacingService,
    ElevationResult as PluginElevationResult,
    Digest as PluginDigest
} from '../types/management';
import type { 
    ProjectElevationService as CoreProjectElevationService,
    ResurfacingService as CoreResurfacingService,
    ElevationResult as CoreElevationResult,
    Digest as CoreDigest
} from '@ideatr/core';

/**
 * Convert IdeaFile to Idea
 */
function ideaFileToIdea(ideaFile: IdeaFile, path: string): Idea {
    const frontmatter = ideaFile.frontmatter;
    return {
        id: '', // Will be generated if missing
        title: extractTitleFromFilename(ideaFile.filename) || 'Untitled',
        status: mapStatus(frontmatter.status),
        category: frontmatter.category || '',
        tags: frontmatter.tags || [],
        created: frontmatter.created,
        modified: new Date().toISOString(),
        related: frontmatter.related || [],
        domain: frontmatter.domains?.[0],
        body: ideaFile.body,
        path,
        filename: ideaFile.filename,
        metadata: frontmatter as any
    };
}

/**
 * Convert Idea to IdeaFile
 */
function ideaToIdeaFile(idea: Idea): IdeaFile {
    return {
        frontmatter: {
            type: 'idea',
            status: idea.status as any,
            created: idea.created,
            category: idea.category || '',
            tags: idea.tags || [],
            related: idea.related || [],
            domains: idea.domain ? [idea.domain] : [],
            'existence-check': idea.metadata?.['existence-check'] || [],
            elevated: idea.metadata?.elevated,
            projectPath: idea.metadata?.projectPath
        },
        body: idea.body,
        filename: idea.filename
    };
}

/**
 * Map status string to IdeaStatus
 */
function mapStatus(status: string): 'captured' | 'validated' | 'promoted' | 'archived' {
    if (status === 'elevated') return 'promoted';
    if (status === 'captured' || status === 'validated' || status === 'promoted' || status === 'archived') {
        return status;
    }
    return 'captured';
}

/**
 * Extract title from filename
 */
function extractTitleFromFilename(filename: string): string {
    const withoutExt = filename.replace(/\.md$/, '');
    const datePrefixMatch = withoutExt.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
    if (datePrefixMatch) {
        return datePrefixMatch[1]
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    return withoutExt;
}

/**
 * Adapter for ProjectElevationService
 */
export class ProjectElevationServiceAdapter implements IProjectElevationService {
    constructor(
        private coreService: CoreProjectElevationService,
        private ideaManager: any // IdeaManager from core
    ) {}

    async elevateIdea(ideaFile: IdeaFile, projectName?: string): Promise<PluginElevationResult> {
        // Convert IdeaFile to Idea
        const path = `Ideas/${ideaFile.filename}`;
        const idea = ideaFileToIdea(ideaFile, path);
        
        // Get full idea from manager (to ensure we have ID)
        let fullIdea = await this.ideaManager.getIdeaByPath(path);
        if (!fullIdea) {
            // If idea doesn't exist in manager, use the converted one
            fullIdea = idea;
        }
        
        const result = await this.coreService.elevateIdea(fullIdea, projectName);
        return result as PluginElevationResult;
    }

    canElevate(ideaFile: IdeaFile): boolean {
        const path = `Ideas/${ideaFile.filename}`;
        const idea = ideaFileToIdea(ideaFile, path);
        return this.coreService.canElevate(idea);
    }

    generateProjectName(ideaFile: IdeaFile): string {
        const path = `Ideas/${ideaFile.filename}`;
        const idea = ideaFileToIdea(ideaFile, path);
        return this.coreService.generateProjectName(idea);
    }

    async isProjectNameAvailable(projectName: string): Promise<boolean> {
        return this.coreService.isProjectNameAvailable(projectName);
    }
}

/**
 * Adapter for ResurfacingService
 */
export class ResurfacingServiceAdapter implements IResurfacingService {
    constructor(
        private coreService: CoreResurfacingService,
        private ideaRepository: any // IdeaRepository from plugin (for backward compatibility)
    ) {}

    async identifyOldIdeas(thresholdDays?: number): Promise<IdeaFile[]> {
        const ideas = await this.coreService.identifyOldIdeas(thresholdDays);
        return ideas.map(idea => ideaToIdeaFile(idea));
    }

    async generateDigest(ideas?: IdeaFile[]): Promise<PluginDigest> {
        let coreIdeas: any[] | undefined;
        if (ideas) {
            // Convert IdeaFile[] to Idea[]
            coreIdeas = ideas.map(ideaFile => {
                const path = `Ideas/${ideaFile.filename}`;
                return ideaFileToIdea(ideaFile, path);
            });
        }
        
        const digest = await this.coreService.generateDigest(coreIdeas);
        return {
            id: digest.id,
            generatedAt: digest.generatedAt,
            ideas: digest.ideas.map(idea => ideaToIdeaFile(idea)),
            summary: digest.summary
        };
    }

    async markAsDismissed(ideaPath: string): Promise<void> {
        // Get idea from repository
        const ideaFile = await this.ideaRepository.getIdeaByPath(ideaPath);
        if (!ideaFile) return;
        
        const idea = ideaFileToIdea(ideaFile, ideaPath);
        await this.coreService.markAsDismissed(idea);
    }

    async markAsActedUpon(ideaPath: string): Promise<void> {
        // Get idea from repository
        const ideaFile = await this.ideaRepository.getIdeaByPath(ideaPath);
        if (!ideaFile) return;
        
        const idea = ideaFileToIdea(ideaFile, ideaPath);
        await this.coreService.markAsActedUpon(idea);
    }

    async isDismissedOrActedUpon(ideaPath: string): Promise<boolean> {
        const ideaFile = await this.ideaRepository.getIdeaByPath(ideaPath);
        if (!ideaFile) return false;
        
        const idea = ideaFileToIdea(ideaFile, ideaPath);
        return this.coreService.isDismissedOrActedUpon(idea);
    }
}

