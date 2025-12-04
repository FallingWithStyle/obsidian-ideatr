import type { Vault, TFile } from 'obsidian';
import type { IIdeaRepository } from '../types/management';
import type { IdeaFile } from '../types/idea';
import type { IdeaFilter } from '../types/management';
import { ManagementError, ManagementErrorCode } from '../types/management';
import { FrontmatterParser } from './FrontmatterParser';
import type { IFrontmatterParser } from '../types/management';
import { Logger } from '../utils/logger';

/**
 * IdeaRepository - Manages reading and caching of idea files from vault
 */
export class IdeaRepository implements IIdeaRepository {
    private cache: Map<string, IdeaFile> = new Map();
    private watchers: Set<() => void> = new Set();
    private parser: IFrontmatterParser;
    private readonly MAX_CACHE_SIZE = 10000; // Prevent unbounded cache growth

    constructor(
        private vault: Vault,
        parser?: IFrontmatterParser
    ) {
        this.parser = parser || new FrontmatterParser();
    }

    /**
     * Get all ideas from the vault
     * @returns Array of parsed idea files
     */
    async getAllIdeas(): Promise<IdeaFile[]> {
        // Get all markdown files
        const allFiles = this.vault.getMarkdownFiles();

        // Filter to only Ideas/ directory
        const ideaFiles = allFiles.filter(file => file.path.startsWith('Ideas/'));

        // Read and parse each file
        const ideas: IdeaFile[] = [];
        for (const file of ideaFiles) {
            try {
                const content = await this.vault.read(file);
                const idea = this.parser.parseIdeaFile(file, content);
                ideas.push(idea);
                // Update cache with size limit to prevent unbounded growth
                this.cache.set(file.path, idea);
                // If cache exceeds limit, remove oldest entries (LRU-like, but simple FIFO)
                if (this.cache.size > this.MAX_CACHE_SIZE) {
                    const firstKey = this.cache.keys().next().value;
                    if (firstKey) {
                        this.cache.delete(firstKey);
                    }
                }
            } catch (error) {
                // Wrap underlying error in a typed ManagementError for better diagnostics (QA 4.6)
                const managementError = new ManagementError(
                    `Failed to read idea file: ${file.path}`,
                    ManagementErrorCode.FILE_READ_ERROR
                );
                Logger.warn(managementError.message, managementError);
                // Continue with other files
            }
        }

        return ideas;
    }

    /**
     * Get ideas matching filter criteria
     * @param filter - Filter criteria
     * @returns Array of filtered idea files
     */
    async getIdeasByFilter(filter: IdeaFilter): Promise<IdeaFile[]> {
        // Get all ideas (prefer in-memory cache when available, QA 4.4)
        const allIdeas = this.cache.size > 0
            ? Array.from(this.cache.values())
            : await this.getAllIdeas();

        // Apply filters
        let filtered = allIdeas;

        // Filter by category
        if (filter.categories && filter.categories.length > 0) {
            filtered = filtered.filter(idea =>
                filter.categories!.includes(idea.frontmatter.category)
            );
        }

        // Filter by tags
        if (filter.tags && filter.tags.length > 0) {
            filtered = filtered.filter(idea =>
                filter.tags!.some(tag => idea.frontmatter.tags.includes(tag))
            );
        }

        // Filter by status
        if (filter.status) {
            filtered = filtered.filter(idea => idea.frontmatter.status === filter.status);
        }

        // Filter uncategorized
        if (filter.uncategorized) {
            filtered = filtered.filter(idea => idea.frontmatter.category === '');
        }

        // Filter by search text
        if (filter.searchText) {
            const searchLower = filter.searchText.toLowerCase();
            filtered = filtered.filter(idea => {
                const title = idea.filename.toLowerCase();
                const body = idea.body.toLowerCase();
                const tags = idea.frontmatter.tags.join(' ').toLowerCase();
                return title.includes(searchLower) || body.includes(searchLower) || tags.includes(searchLower);
            });
        }

        // Filter by date range
        if (filter.dateRange) {
            filtered = filtered.filter(idea => {
                const createdDate = new Date(idea.frontmatter.created);
                return createdDate >= filter.dateRange!.start && createdDate <= filter.dateRange!.end;
            });
        }

        return filtered;
    }

    /**
     * Get a single idea by file path
     * @param path - File path relative to vault root
     * @returns Idea file or null if not found
     */
    async getIdeaByPath(path: string): Promise<IdeaFile | null> {
        // Must be in Ideas/ directory
        if (!path.startsWith('Ideas/')) {
            return null;
        }

        const fileAbstract = this.vault.getAbstractFileByPath(path);
        const file = fileAbstract instanceof TFile ? fileAbstract : null;
        if (!file) {
            return null;
        }

        try {
            const content = await this.vault.read(file);
            const idea = this.parser.parseIdeaFile(file, content);
            // Update cache with size limit
            this.cache.set(path, idea);
            // If cache exceeds limit, remove oldest entries
            if (this.cache.size > this.MAX_CACHE_SIZE) {
                const firstKey = this.cache.keys().next().value;
                if (firstKey) {
                    this.cache.delete(firstKey);
                }
            }
            return idea;
        } catch (error) {
            Logger.warn(`Failed to read idea file: ${path}`, error);
            return null;
        }
    }

    /**
     * Watch for changes to ideas and notify callback
     * @param callback - Function called when ideas change
     * @returns Unsubscribe function
     */
    watchIdeas(callback: (ideas: IdeaFile[]) => void): () => void {
        const onFileChange = async (file: TFile) => {
            if (file.path.startsWith('Ideas/')) {
                // Refresh cache for this file
                try {
                    const content = await this.vault.read(file);
                    const idea = this.parser.parseIdeaFile(file, content);
                    this.cache.set(file.path, idea);
                } catch (error) {
                    // File might have been deleted
                    this.cache.delete(file.path);
                }

                // Notify callback with all ideas
                const allIdeas = Array.from(this.cache.values());
                callback(allIdeas);
            }
        };

        const onDelete = (file: TFile) => {
            if (file.path.startsWith('Ideas/')) {
                this.cache.delete(file.path);
                const allIdeas = Array.from(this.cache.values());
                callback(allIdeas);
            }
        };

        // Register watchers for modify/create/delete and track their unregister functions (QA 4.5)
        const unregisterModify = (this.vault.on as any)('modify', onFileChange);
        const unregisterCreate = (this.vault.on as any)('create', onFileChange);
        const unregisterDelete = (this.vault.on as any)('delete', onDelete);

        this.watchers.add(unregisterModify);
        this.watchers.add(unregisterCreate);
        this.watchers.add(unregisterDelete);

        // Return unsubscribe function that cleans up all listeners
        return () => {
            // EventRef is callable in Obsidian, but TypeScript doesn't know that
            (unregisterModify as any)();
            (unregisterCreate as any)();
            (unregisterDelete as any)();
            this.watchers.delete(unregisterModify);
            this.watchers.delete(unregisterCreate);
            this.watchers.delete(unregisterDelete);
        };
    }

    /**
     * Refresh the idea cache (force re-read all files)
     */
    async refresh(): Promise<void> {
        // Clear cache
        this.cache.clear();
        // Re-read all ideas
        await this.getAllIdeas();
    }
}

