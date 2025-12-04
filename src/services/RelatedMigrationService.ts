import type { Vault, TFile } from 'obsidian';
import type { IIdeaRepository } from '../types/management';
import { FileManager } from '../storage/FileManager';
import { Logger } from '../utils/logger';

/**
 * RelatedMigrationService - Migrates related field from file paths to idea IDs
 */
export class RelatedMigrationService {
    private vault: Vault;
    private ideaRepository: IIdeaRepository;
    private fileManager: FileManager;

    constructor(
        vault: Vault,
        ideaRepository: IIdeaRepository,
        fileManager: FileManager
    ) {
        this.vault = vault;
        this.ideaRepository = ideaRepository;
        this.fileManager = fileManager;
    }

    /**
     * Migrate related field from file paths to idea IDs
     * @returns Migration result with counts
     */
    async migrateRelatedToIds(): Promise<{ migrated: number; errors: number; skipped: number }> {
        let migrated = 0;
        let errors = 0;
        let skipped = 0;

        try {
            // Get all ideas
            const allIdeas = await this.ideaRepository.getAllIdeas();

            // Create a map of file path to idea ID
            const pathToIdMap = new Map<string, number>();
            for (const idea of allIdeas) {
                const path = `Ideas/${idea.filename}`;
                if (idea.frontmatter.id && idea.frontmatter.id !== 0) {
                    pathToIdMap.set(path, idea.frontmatter.id);
                }
            }

            Logger.debug(`Created path-to-ID map with ${pathToIdMap.size} entries`);

            // Process each idea
            for (const idea of allIdeas) {
                try {
                    // Check if related contains any paths (strings) or invalid IDs
                    const related = idea.frontmatter.related || [];
                    
                    // Check if any related items are strings (paths) or 0 (invalid)
                    const needsMigration = related.some(
                        (item: number | string) => 
                            typeof item === 'string' || 
                            item === 0 ||
                            (typeof item === 'number' && !pathToIdMap.has(`Ideas/${item}`) && !allIdeas.find(i => i.frontmatter.id === item))
                    );

                    if (!needsMigration) {
                        skipped++;
                        continue;
                    }

                    // Convert paths to IDs
                    const migratedRelated: number[] = [];
                    for (const item of related) {
                        if (typeof item === 'string') {
                            // It's a file path - convert to ID
                            const id = pathToIdMap.get(item);
                            if (id) {
                                migratedRelated.push(id);
                            } else {
                                Logger.warn(`Could not find ID for path: ${item}`);
                            }
                        } else if (typeof item === 'number' && item !== 0) {
                            // It's already an ID - check if it's valid
                            const isValidId = allIdeas.some(i => i.frontmatter.id === item);
                            if (isValidId) {
                                migratedRelated.push(item);
                            } else {
                                Logger.warn(`Invalid ID found: ${item}`);
                            }
                        }
                        // Skip 0 values (invalid IDs)
                    }

                    // Remove duplicates
                    const uniqueRelated = Array.from(new Set(migratedRelated));

                    // Update the file if there are changes
                    if (uniqueRelated.length !== related.length || 
                        !uniqueRelated.every((id, idx) => related[idx] === id)) {
                        const file = this.vault.getAbstractFileByPath(
                            `Ideas/${idea.filename}`
                        ) as TFile;

                        if (file) {
                            await this.fileManager.updateIdeaFrontmatter(file, {
                                related: uniqueRelated
                            });
                            migrated++;
                            Logger.debug(`Migrated related for idea: ${idea.filename}`);
                        } else {
                            Logger.warn(`File not found for idea: ${idea.filename}`);
                            errors++;
                        }
                    } else {
                        skipped++;
                    }
                } catch (error) {
                    Logger.warn(`Failed to migrate related for idea ${idea.filename}:`, error);
                    errors++;
                }
            }

            if (migrated > 0) {
                Logger.info(`Migrated ${migrated} ideas' related fields from paths to IDs`);
            }
        } catch (error) {
            Logger.error('Error during related migration:', error);
            errors++;
        }

        return { migrated, errors, skipped };
    }
}

