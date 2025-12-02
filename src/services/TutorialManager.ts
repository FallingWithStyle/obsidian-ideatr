import { App, TFile, TFolder, Notice } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service for managing tutorial files (copy, delete, reset)
 */
export class TutorialManager {
    constructor(
        private app: App,
        private pluginDir?: string
    ) {}

    /**
     * Get the tutorial directory path in the vault
     */
    private getTutorialVaultPath(): string {
        return 'tutorials';
    }

    /**
     * Get tutorial file paths from plugin directory or vault
     * Tries multiple locations where tutorials might be stored
     */
    private async getBundledTutorialFiles(): Promise<Map<string, string>> {
        const tutorials = new Map<string, string>();
        
        // Try to read from plugin directory first
        if (this.pluginDir) {
            const tutorialDir = path.join(this.pluginDir, 'tutorials');
            try {
                if (fs.existsSync(tutorialDir) && fs.statSync(tutorialDir).isDirectory()) {
                    const files = fs.readdirSync(tutorialDir);
                    for (const file of files) {
                        if (file.endsWith('.md')) {
                            const filePath = path.join(tutorialDir, file);
                            try {
                                const content = fs.readFileSync(filePath, 'utf-8');
                                tutorials.set(file, content);
                            } catch (fileError) {
                                console.warn(`Error reading tutorial file ${file}:`, fileError);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('Error reading tutorial directory from plugin:', error);
            }
        }

        // If no tutorials found in plugin dir, try reading from vault as fallback
        // (in case they were manually placed there)
        if (tutorials.size === 0) {
            const vaultPath = this.getTutorialVaultPath();
            try {
                const tutorialDir = this.app.vault.getAbstractFileByPath(vaultPath);
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
            const vaultPath = this.getTutorialVaultPath();
            const tutorialDir = this.app.vault.getAbstractFileByPath(vaultPath);
            
            if (!tutorialDir) {
                new Notice('No tutorial files found to delete.');
                return false;
            }

            // Get all files in the tutorial directory
            const files: TFile[] = [];
            const processFile = (file: any) => {
                if (file instanceof TFile && file.path.startsWith(vaultPath)) {
                    files.push(file);
                }
                if (file.children) {
                    file.children.forEach(processFile);
                }
            };
            processFile(tutorialDir);

            if (files.length === 0) {
                new Notice('No tutorial files found to delete.');
                return false;
            }

            // Delete all tutorial files
            for (const file of files) {
                await this.app.vault.delete(file);
            }

            // Try to delete the directory if it's empty
            try {
                const dir = this.app.vault.getAbstractFileByPath(vaultPath);
                if (dir instanceof TFolder && (!dir.children || dir.children.length === 0)) {
                    await this.app.vault.delete(dir, true);
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
     * Check if tutorials exist in vault
     */
    async tutorialsExistInVault(): Promise<boolean> {
        const vaultPath = this.getTutorialVaultPath();
        const indexFile = this.app.vault.getAbstractFileByPath(`${vaultPath}/00-Index.md`);
        return indexFile instanceof TFile;
    }

    /**
     * Check if bundled tutorials are available
     */
    async bundledTutorialsAvailable(): Promise<boolean> {
        const tutorialFiles = await this.getBundledTutorialFiles();
        return tutorialFiles.size > 0;
    }
}

