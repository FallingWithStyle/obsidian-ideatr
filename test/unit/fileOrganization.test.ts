/**
 * Tests for fileOrganization.ts
 * Tests FileOrganizer file movement and archive operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Vault, TFile } from '../../test/mocks/obsidian';
import { FileOrganizer } from '../../src/utils/fileOrganization';
import { DEFAULT_SETTINGS } from '../../src/settings';

describe('FileOrganizer', () => {
    let organizer: FileOrganizer;
    let mockVault: Vault;
    let mockSettings: typeof DEFAULT_SETTINGS;

    beforeEach(() => {
        mockVault = {
            getAbstractFileByPath: vi.fn(),
            rename: vi.fn().mockResolvedValue(undefined),
            createFolder: vi.fn().mockResolvedValue(undefined),
        } as any;

        mockSettings = { ...DEFAULT_SETTINGS };
        organizer = new FileOrganizer(mockVault, mockSettings);
    });

    describe('constructor', () => {
        it('should create FileOrganizer instance', () => {
            expect(organizer).toBeInstanceOf(FileOrganizer);
        });

        it('should store vault and settings', () => {
            expect((organizer as any).vault).toBe(mockVault);
            expect((organizer as any).settings).toBe(mockSettings);
        });
    });

    describe('moveToArchive', () => {
        it('should not move file when moveArchivedToFolder is disabled', async () => {
            mockSettings.moveArchivedToFolder = false;
            const file = { path: 'Ideas/test.md', name: 'test.md' } as TFile;

            await organizer.moveToArchive(file);

            expect(mockVault.rename).not.toHaveBeenCalled();
        });

        it('should move file to archive directory', async () => {
            mockSettings.moveArchivedToFolder = true;
            (mockVault.getAbstractFileByPath as any).mockReturnValue(null); // Archive dir doesn't exist
            const file = { path: 'Ideas/test.md', name: 'test.md', basename: 'test', extension: 'md' } as TFile;

            await organizer.moveToArchive(file);

            expect(mockVault.createFolder).toHaveBeenCalledWith('Ideas/Archived/');
            expect(mockVault.rename).toHaveBeenCalledWith(file, 'Ideas/Archived/test.md');
        });

        it('should not move file if already in archive', async () => {
            mockSettings.moveArchivedToFolder = true;
            const file = { path: 'Ideas/Archived/test.md', name: 'test.md' } as TFile;

            await organizer.moveToArchive(file);

            expect(mockVault.rename).not.toHaveBeenCalled();
        });

        it('should handle filename conflicts with timestamp', async () => {
            mockSettings.moveArchivedToFolder = true;
            (mockVault.getAbstractFileByPath as any).mockReturnValueOnce(null); // Archive dir doesn't exist
            (mockVault.getAbstractFileByPath as any).mockReturnValueOnce({} as TFile); // File exists in archive
            const file = { path: 'Ideas/test.md', name: 'test.md', basename: 'test', extension: 'md' } as TFile;

            await organizer.moveToArchive(file);

            expect(mockVault.rename).toHaveBeenCalled();
            const renameCall = (mockVault.rename as any).mock.calls[0];
            expect(renameCall[1]).toMatch(/Ideas\/Archived\/test-\d+\.md/);
        });

        it('should create archive directory if it does not exist', async () => {
            mockSettings.moveArchivedToFolder = true;
            (mockVault.getAbstractFileByPath as any).mockReturnValue(null);
            const file = { path: 'Ideas/test.md', name: 'test.md' } as TFile;

            await organizer.moveToArchive(file);

            expect(mockVault.createFolder).toHaveBeenCalledWith('Ideas/Archived/');
        });

        it('should not create archive directory if it already exists', async () => {
            mockSettings.moveArchivedToFolder = true;
            (mockVault.getAbstractFileByPath as any).mockReturnValue({} as any); // Directory exists
            const file = { path: 'Ideas/test.md', name: 'test.md' } as TFile;

            await organizer.moveToArchive(file);

            expect(mockVault.createFolder).not.toHaveBeenCalled();
        });
    });

    describe('moveFromArchive', () => {
        it('should move file from archive to Ideas/ root', async () => {
            (mockVault.getAbstractFileByPath as any).mockReturnValue(null); // File doesn't exist in Ideas/
            const file = { path: 'Ideas/Archived/test.md', name: 'test.md' } as TFile;

            await organizer.moveFromArchive(file);

            expect(mockVault.rename).toHaveBeenCalledWith(file, 'Ideas/test.md');
        });

        it('should not move file if not in archive', async () => {
            const file = { path: 'Ideas/test.md', name: 'test.md' } as TFile;

            await organizer.moveFromArchive(file);

            expect(mockVault.rename).not.toHaveBeenCalled();
        });

        it('should handle filename conflicts with timestamp', async () => {
            (mockVault.getAbstractFileByPath as any).mockReturnValue({} as TFile); // File exists in Ideas/
            const file = { path: 'Ideas/Archived/test.md', name: 'test.md', basename: 'test', extension: 'md' } as TFile;

            await organizer.moveFromArchive(file);

            expect(mockVault.rename).toHaveBeenCalled();
            const renameCall = (mockVault.rename as any).mock.calls[0];
            expect(renameCall[1]).toMatch(/Ideas\/test-\d+\.md/);
        });
    });
});

