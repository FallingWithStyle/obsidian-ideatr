import type { Vault, TFile } from 'obsidian';
import type { IIdeaRepository } from '../types/management';
import { generateUniqueId } from '../utils/IdeaIdGenerator';
import { FileManager } from '../storage/FileManager';
import { Logger } from '../utils/logger';

/**
 * IdeaIdService - Manages idea IDs and auto-assignment
 */
export class IdeaIdService {
    private vault: Vault;
    private ideaRepository: IIdeaRepository;
    private fileManager: FileManager;
    private isProcessing: boolean = false;
    private idleTimeoutId?: number;

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
     * Auto-assign IDs to ideas that don't have them (id === 0 or undefined)
     * Runs during idle time to avoid blocking the UI
     */
    async assignMissingIds(): Promise<{ assigned: number; errors: number }> {
        if (this.isProcessing) {
            Logger.debug('ID assignment already in progress, skipping');
            return { assigned: 0, errors: 0 };
        }

        this.isProcessing = true;
        let assigned = 0;
        let errors = 0;

        try {
            // Get all ideas
            const allIdeas = await this.ideaRepository.getAllIdeas();
            
            // Get all existing IDs
            const existingIds = allIdeas
                .map(idea => idea.frontmatter.id)
                .filter(id => id !== 0 && id !== undefined) as number[];

            // Find ideas that need IDs
            const ideasNeedingIds = allIdeas.filter(
                idea => !idea.frontmatter.id || idea.frontmatter.id === 0
            );

            Logger.debug(`Found ${ideasNeedingIds.length} ideas needing IDs`);

            // Assign IDs to each idea
            for (const idea of ideasNeedingIds) {
                try {
                    // Get the file
                    const file = this.vault.getAbstractFileByPath(
                        `Ideas/${idea.filename}`
                    ) as TFile;

                    if (!file) {
                        Logger.warn(`File not found for idea: ${idea.filename}`);
                        errors++;
                        continue;
                    }

                    // Generate unique ID
                    const newId = generateUniqueId(existingIds);
                    existingIds.push(newId);

                    // Update the file
                    await this.fileManager.updateIdeaFrontmatter(file, { id: newId });
                    assigned++;

                    Logger.debug(`Assigned ID ${newId} to idea: ${idea.filename}`);
                } catch (error) {
                    Logger.warn(`Failed to assign ID to idea ${idea.filename}:`, error);
                    errors++;
                }
            }

            if (assigned > 0) {
                Logger.info(`Auto-assigned ${assigned} idea IDs`);
            }
        } catch (error) {
            Logger.error('Error during ID assignment:', error);
            errors++;
        } finally {
            this.isProcessing = false;
        }

        return { assigned, errors };
    }

    /**
     * Schedule ID assignment to run during idle time
     * Uses requestIdleCallback if available, otherwise setTimeout
     */
    scheduleIdleAssignment(delay: number = 2000): void {
        // Clear any existing timeout
        if (this.idleTimeoutId) {
            clearTimeout(this.idleTimeoutId);
        }

        // Use requestIdleCallback if available (browser environment)
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(
                () => {
                    this.assignMissingIds().catch(error => {
                        Logger.warn('Idle ID assignment failed:', error);
                    });
                },
                { timeout: delay }
            );
        } else {
            // Fallback to setTimeout
            this.idleTimeoutId = window.setTimeout(() => {
                this.assignMissingIds().catch(error => {
                    Logger.warn('Idle ID assignment failed:', error);
                });
            }, delay);
        }
    }

    /**
     * Cancel any scheduled idle assignment
     */
    cancelScheduledAssignment(): void {
        if (this.idleTimeoutId) {
            clearTimeout(this.idleTimeoutId);
            this.idleTimeoutId = undefined;
        }
    }
}

