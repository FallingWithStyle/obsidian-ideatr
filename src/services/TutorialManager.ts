import { App, Notice, TFile, TFolder } from 'obsidian';

/**
 * Service for managing tutorial files (copy, delete, reset)
 */
export class TutorialManager {
    constructor(
        private app: App
    ) {}

    /**
     * Get the tutorial directory path in the vault
     */
    private getTutorialVaultPath(): string {
        return 'Tutorials';
    }

    /**
     * Check if tutorials exist in either case (for backward compatibility)
     */
    private findTutorialFolder(): TFolder | null {
        const capitalizedPath = 'Tutorials';
        const lowercasePath = 'tutorials';
        
        const capitalizedDir = this.app.vault.getAbstractFileByPath(capitalizedPath);
        if (capitalizedDir instanceof TFolder) {
            return capitalizedDir;
        }
        
        const lowercaseDir = this.app.vault.getAbstractFileByPath(lowercasePath);
        if (lowercaseDir instanceof TFolder) {
            return lowercaseDir;
        }
        
        return null;
    }

    /**
     * Get tutorial file paths from vault
     * Reads tutorials from the vault's Tutorials folder
     */
    private async getBundledTutorialFiles(): Promise<Map<string, string>> {
        const tutorials = new Map<string, string>();
        
        // Read tutorials from vault
        try {
            const tutorialDir = this.findTutorialFolder();
            if (tutorialDir instanceof TFolder && tutorialDir.children) {
                for (const child of tutorialDir.children) {
                    if (child instanceof TFile && child.name.endsWith('.md')) {
                        try {
                            const content = await this.app.vault.read(child);
                            tutorials.set(child.name, content);
                        } catch (fileError) {
                            console.warn(`Error reading tutorial file ${child.name}:`, fileError);
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Error reading tutorial directory from vault:', error);
        }

        return tutorials;
    }

    /**
     * Reset tutorials - copy from plugin directory to vault
     * @param overwrite - If true, overwrite existing files. If false, skip existing files silently.
     */
    async resetTutorials(overwrite: boolean = false): Promise<boolean> {
        try {
            const tutorialFiles = await this.getBundledTutorialFiles();
            
            if (tutorialFiles.size === 0) {
                new Notice('Tutorial files not found in plugin directory. They may need to be manually restored.');
                return false;
            }

            const vaultPath = this.getTutorialVaultPath();
            
            // Ensure tutorial directory exists
            const tutorialDir = this.app.vault.getAbstractFileByPath(vaultPath);
            if (!tutorialDir) {
                try {
                    await this.app.vault.createFolder(vaultPath);
                } catch (error) {
                    // Check if error is about folder already existing
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (errorMessage.includes('already exists') || errorMessage.includes('Folder already exists')) {
                        // Folder already exists, verify and continue silently
                        const checkDir = this.app.vault.getAbstractFileByPath(vaultPath);
                        if (!checkDir) {
                            // Folder doesn't actually exist, but error said it does - might be a race condition
                            // Just continue anyway, file operations will handle it
                        }
                        // Folder exists (or will be handled by file operations), continue silently
                    } else {
                        // Folder might have been created by another process, check again
                        const checkDir = this.app.vault.getAbstractFileByPath(vaultPath);
                        if (!checkDir) {
                            // If it still doesn't exist, re-throw the error
                            throw error;
                        }
                        // Otherwise, folder exists now, continue
                    }
                }
            }

            // Copy each tutorial file
            let copiedCount = 0;
            for (const [filename, content] of tutorialFiles.entries()) {
                const filePath = `${vaultPath}/${filename}`;
                const existingFile = this.app.vault.getAbstractFileByPath(filePath);
                
                if (existingFile && existingFile instanceof TFile) {
                    // File already exists
                    if (overwrite) {
                        // User explicitly requested reset - overwrite the file
                        await this.app.vault.modify(existingFile, content);
                        copiedCount++;
                    }
                    // If overwrite is false, skip silently (for auto-load scenario)
                } else {
                    // File doesn't exist, create it
                    try {
                        await this.app.vault.create(filePath, content);
                        copiedCount++;
                    } catch (createError) {
                        // Handle case where file exists but wasn't found by getAbstractFileByPath
                        // (could be a race condition or timing issue)
                        const errorMessage = createError instanceof Error ? createError.message : String(createError);
                        if (errorMessage.includes('already exists') || errorMessage.includes('File already exists')) {
                            // File exists but wasn't detected - if overwrite is true, try to update it
                            if (overwrite) {
                                const foundFile = this.app.vault.getAbstractFileByPath(filePath);
                                if (foundFile && foundFile instanceof TFile) {
                                    await this.app.vault.modify(foundFile, content);
                                    copiedCount++;
                                }
                            }
                            // Otherwise skip silently
                        } else {
                            // Different error, re-throw it
                            throw createError;
                        }
                    }
                }
            }

            if (copiedCount > 0) {
                new Notice(`Tutorials reset successfully! ${copiedCount} files restored.`);
            } else if (overwrite) {
                // User clicked reset but no files were copied (all already existed and were skipped)
                new Notice('All tutorial files already exist. No changes made.');
            }
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Don't log "file already exists" as an error - it's handled gracefully above
            if (!errorMessage.includes('already exists') && !errorMessage.includes('File already exists')) {
                console.error('Error resetting tutorials:', error);
                if (overwrite) {
                    // Only show error notice if user explicitly requested reset
                    new Notice(`Failed to reset tutorials: ${errorMessage}`);
                }
            }
            // For auto-load (overwrite=false), fail silently
            return false;
        }
    }

    /**
     * Delete all tutorial files from vault
     */
    async deleteTutorials(): Promise<boolean> {
        try {
            // Check for tutorials in either case (for backward compatibility)
            const tutorialDir = this.findTutorialFolder();
            
            if (!tutorialDir) {
                new Notice('No tutorial files found to delete.');
                return false;
            }
            
            const vaultPath = tutorialDir.path;

            // Get all files in the tutorial directory
            const files: TFile[] = [];
            const processFile = (file: TFile | TFolder) => {
                if (file instanceof TFile && file.path.startsWith(vaultPath)) {
                    files.push(file);
                }
                if (file instanceof TFolder && file.children) {
                    file.children.forEach((child) => processFile(child as TFile | TFolder));
                }
            };
            processFile(tutorialDir);

            if (files.length === 0) {
                new Notice('No tutorial files found to delete.');
                return false;
            }

            // Delete all tutorial files
            for (const file of files) {
                await this.app.fileManager.trashFile(file);
            }

            // Try to delete the directory if it's empty
            try {
                if (tutorialDir instanceof TFolder && (!tutorialDir.children || tutorialDir.children.length === 0)) {
                    // For folders, we use vault.adapter.rmdir as trashFile is only for files
                    await this.app.vault.adapter.rmdir(tutorialDir.path, true);
                }
            } catch {
                // Directory might not be empty or deletion might fail, that's okay
            }

            new Notice(`Tutorials deleted successfully! ${files.length} files removed.`);
            return true;
        } catch (error) {
            console.error('Error deleting tutorials:', error);
            new Notice(`Failed to delete tutorials: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    /**
     * Check if tutorials exist in vault (checks both capitalized and lowercase for backward compatibility)
     */
    tutorialsExistInVault(): boolean {
        const capitalizedPath = 'Tutorials/00-Index.md';
        const lowercasePath = 'tutorials/00-Index.md';
        
        const capitalizedIndex = this.app.vault.getAbstractFileByPath(capitalizedPath);
        if (capitalizedIndex instanceof TFile) {
            return true;
        }
        
        const lowercaseIndex = this.app.vault.getAbstractFileByPath(lowercasePath);
        return lowercaseIndex instanceof TFile;
    }

    /**
     * Check if bundled tutorials are available
     */
    async bundledTutorialsAvailable(): Promise<boolean> {
        const tutorialFiles = await this.getBundledTutorialFiles();
        return tutorialFiles.size > 0;
    }
}

