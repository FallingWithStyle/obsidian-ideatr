import type { IIdeaRepository } from '../types/management';
import type { IdeaFile } from '../types/idea';
import { Logger } from './logger';

/**
 * RelatedIdConverter - Utility to convert between file paths and idea IDs
 */
export class RelatedIdConverter {
    private ideaRepository: IIdeaRepository;
    private pathToIdCache: Map<string, number> | null = null;
    private idToPathCache: Map<number, string> | null = null;
    private idToTitleCache: Map<number, string> | null = null;

    constructor(ideaRepository: IIdeaRepository) {
        this.ideaRepository = ideaRepository;
    }

    /**
     * Build cache of path to ID mappings and ID to title mappings
     */
    private async buildCache(): Promise<void> {
        if (this.pathToIdCache && this.idToPathCache && this.idToTitleCache) {
            return; // Cache already built
        }

        this.pathToIdCache = new Map();
        this.idToPathCache = new Map();
        this.idToTitleCache = new Map();

        try {
            const allIdeas = await this.ideaRepository.getAllIdeas();
            for (const idea of allIdeas) {
                const path = `Ideas/${idea.filename}`;
                if (idea.frontmatter.id && idea.frontmatter.id !== 0) {
                    this.pathToIdCache.set(path, idea.frontmatter.id);
                    this.idToPathCache.set(idea.frontmatter.id, path);
                    // Store title (filename without .md extension) for tooltips
                    const title = idea.filename.replace(/\.md$/, '');
                    this.idToTitleCache.set(idea.frontmatter.id, title);
                }
            }
        } catch (error) {
            Logger.warn('Failed to build path-to-ID cache:', error);
        }
    }

    /**
     * Convert file paths to idea IDs
     */
    async pathsToIds(paths: string[]): Promise<number[]> {
        await this.buildCache();
        const ids: number[] = [];

        for (const path of paths) {
            const id = this.pathToIdCache?.get(path);
            if (id) {
                ids.push(id);
            } else {
                Logger.warn(`Could not find ID for path: ${path}`);
            }
        }

        return ids;
    }

    /**
     * Convert idea IDs to file paths
     */
    async idsToPaths(ids: number[]): Promise<string[]> {
        await this.buildCache();
        const paths: string[] = [];

        for (const id of ids) {
            const path = this.idToPathCache?.get(id);
            if (path) {
                paths.push(path);
            } else {
                Logger.warn(`Could not find path for ID: ${id}`);
            }
        }

        return paths;
    }

    /**
     * Get idea title/filename from ID
     */
    async idToTitle(id: number): Promise<string | null> {
        await this.buildCache();
        return this.idToTitleCache?.get(id) || null;
    }

    /**
     * Get idea titles/filenames from IDs
     */
    async idsToTitles(ids: number[]): Promise<Map<number, string>> {
        await this.buildCache();
        const result = new Map<number, string>();
        
        for (const id of ids) {
            const title = this.idToTitleCache?.get(id);
            if (title) {
                result.set(id, title);
            }
        }
        
        return result;
    }

    /**
     * Clear the cache (useful after ideas are added/removed)
     */
    clearCache(): void {
        this.pathToIdCache = null;
        this.idToPathCache = null;
        this.idToTitleCache = null;
    }
}

