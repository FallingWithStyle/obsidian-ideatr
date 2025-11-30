/**
 * File organization utilities for status-based file management
 */

import type { Vault, TFile } from 'obsidian';
import type { IdeatrSettings } from '../settings';

export interface FileMoveOptions {
    moveToArchive?: boolean; // Settings option
    preserveHistory?: boolean; // Keep original path in frontmatter
}

/**
 * FileOrganizer - Handles file movement based on status
 */
export class FileOrganizer {
    private vault: Vault;
    private settings: IdeatrSettings;
    private readonly ARCHIVE_DIR = 'Ideas/Archived/';

    constructor(vault: Vault, settings: IdeatrSettings) {
        this.vault = vault;
        this.settings = settings;
    }

    /**
     * Move file to archive directory
     */
    async moveToArchive(file: TFile): Promise<void> {
        if (!this.settings.moveArchivedToFolder) {
            // Just update status, don't move
            return;
        }

        // Ensure archive directory exists
        await this.ensureDirectoryExists(this.ARCHIVE_DIR);

        // Check if already in archive
        if (file.path.startsWith(this.ARCHIVE_DIR)) {
            return; // Already archived
        }

        const newPath = `${this.ARCHIVE_DIR}${file.name}`;
        
        // Check if file already exists in archive
        const existingFile = this.vault.getAbstractFileByPath(newPath);
        if (existingFile) {
            // Add timestamp to filename to avoid conflicts
            const timestamp = Date.now();
            const nameWithoutExt = file.basename;
            const ext = file.extension;
            const newName = `${nameWithoutExt}-${timestamp}.${ext}`;
            await this.vault.rename(file, `${this.ARCHIVE_DIR}${newName}`);
        } else {
            await this.vault.rename(file, newPath);
        }
    }

    /**
     * Move file from archive back to Ideas/ root
     */
    async moveFromArchive(file: TFile): Promise<void> {
        if (!file.path.startsWith(this.ARCHIVE_DIR)) {
            return; // Not in archive
        }

        const newPath = `Ideas/${file.name}`;
        
        // Check if file already exists
        const existingFile = this.vault.getAbstractFileByPath(newPath);
        if (existingFile) {
            // Add timestamp to filename to avoid conflicts
            const timestamp = Date.now();
            const nameWithoutExt = file.basename;
            const ext = file.extension;
            const newName = `${nameWithoutExt}-${timestamp}.${ext}`;
            await this.vault.rename(file, `Ideas/${newName}`);
        } else {
            await this.vault.rename(file, newPath);
        }
    }

    /**
     * Ensure directory exists, create if it doesn't
     */
    private async ensureDirectoryExists(path: string): Promise<void> {
        const dir = this.vault.getAbstractFileByPath(path);
        if (!dir) {
            await this.vault.createFolder(path);
        }
    }
}

