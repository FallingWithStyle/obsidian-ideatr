/**
 * Tests for Status & Lifecycle Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import IdeatrPlugin from '../../../src/main';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { FileOrganizer } from '../../../src/utils/fileOrganization';
import { DEFAULT_SETTINGS } from '../../../src/settings';

// Mock Obsidian globals
global.Notice = Notice;

describe('Status & Lifecycle Commands', () => {
    let plugin: IdeatrPlugin;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let mockFile: TFile;
    let mockFileOrganizer: FileOrganizer;

    beforeEach(() => {
        // Create mock app
        mockVault = new Vault();
        mockWorkspace = {
            getActiveFile: vi.fn(),
        } as any;
        mockApp = {
            vault: mockVault,
            workspace: mockWorkspace,
        } as any;

        // Create mock file
        mockFile = new TFile();
        mockFile.path = 'Ideas/2025-01-15-test-idea.md';
        mockFile.name = '2025-01-15-test-idea.md';

        // Create plugin instance
        plugin = new IdeatrPlugin();
        plugin.app = mockApp;
        plugin.settings = { ...DEFAULT_SETTINGS, moveArchivedToFolder: false };

        // Create file organizer (will be initialized in plugin.onload, but we set it here for tests)
        mockFileOrganizer = new FileOrganizer(mockVault, plugin.settings);
        plugin.fileOrganizer = mockFileOrganizer;

        plugin.frontmatterParser = new FrontmatterParser();
        
        // Mock vault methods as spies
        vi.spyOn(mockVault, 'read');
        vi.spyOn(mockVault, 'modify');
        vi.spyOn(mockVault, 'rename');
        vi.spyOn(mockVault, 'createFolder');
    });

    describe('Command: change-status', () => {
        it('should change status and update frontmatter', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
domains: []
existence-check: []
---

Test idea
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Act - changeStatus opens a modal, so we can't fully test it without mocking the modal
            // For now, just verify it doesn't throw
            await expect((plugin as any).changeStatus()).resolves.not.toThrow();
            
            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            // Note: Modal interaction would be tested separately
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await (plugin as any).changeStatus();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });

    describe('Command: archive-idea', () => {
        it('should archive idea and update frontmatter', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
domains: []
existence-check: []
---

Test idea
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Act
            await (plugin as any).archiveIdea();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(mockVault.modify).toHaveBeenCalled();
            
            // Verify status was updated to archived
            const modifyCall = (mockVault.modify as any).mock.calls[0];
            expect(modifyCall[1]).toContain('status: archived');
        });

        it('should move file to archive directory if enabled', async () => {
            // Arrange
            plugin.settings.moveArchivedToFolder = true;
            mockFileOrganizer = new FileOrganizer(mockVault, plugin.settings);
            plugin.fileOrganizer = mockFileOrganizer as any;

            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
---

Test idea
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);
            mockVault.createFolder = vi.fn().mockResolvedValue(undefined);
            (mockVault.rename as any).mockResolvedValue(undefined);

            // Act
            await (plugin as any).archiveIdea();

            // Assert
            expect(mockVault.rename).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await (plugin as any).archiveIdea();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });

    describe('Command: unarchive-idea', () => {
        it('should unarchive idea and update frontmatter', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: archived
created: 2025-01-15
category: app
tags: []
related: []
domains: []
existence-check: []
---

Test idea
`;

            mockFile.path = 'Ideas/Archived/2025-01-15-test-idea.md';
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Act
            await (plugin as any).unarchiveIdea();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(mockVault.modify).toHaveBeenCalled();
            
            // Verify status was updated from archived
            const modifyCall = (mockVault.modify as any).mock.calls[0];
            expect(modifyCall[1]).not.toContain('status: archived');
        });

        it('should move file from archive if enabled', async () => {
            // Arrange
            plugin.settings.moveArchivedToFolder = true;
            mockFileOrganizer = new FileOrganizer(mockVault, plugin.settings);
            plugin.fileOrganizer = mockFileOrganizer as any;

            const fileContent = `---
type: idea
status: archived
created: 2025-01-15
---

Test idea
`;

            mockFile.path = 'Ideas/Archived/2025-01-15-test-idea.md';
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);
            (mockVault.rename as any).mockResolvedValue(undefined);

            // Act
            await (plugin as any).unarchiveIdea();

            // Assert
            expect(mockVault.rename).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await (plugin as any).unarchiveIdea();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });
});

