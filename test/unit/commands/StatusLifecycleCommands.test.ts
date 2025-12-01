/**
 * Tests for Status & Lifecycle Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import { StatusCommand } from '../../../src/commands/lifecycle/StatusCommand';
import { ArchiveCommand } from '../../../src/commands/lifecycle/ArchiveCommand';
import { CommandContext } from '../../../src/commands/base/CommandContext';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { FileOrganizer } from '../../../src/utils/fileOrganization';
import { DEFAULT_SETTINGS } from '../../../src/settings';
import { StatusPickerModal } from '../../../src/views/StatusPickerModal';

// Mock Obsidian globals
global.Notice = Notice;

// Mock StatusPickerModal
vi.mock('../../../src/views/StatusPickerModal', () => ({
    StatusPickerModal: vi.fn().mockImplementation((app, currentStatus, callback) => ({
        open: vi.fn(() => {
            // Simulate user selecting a status
            callback('validated');
        })
    }))
}));

describe('Status & Lifecycle Commands', () => {
    let statusCommand: StatusCommand;
    let archiveCommand: ArchiveCommand;
    let unarchiveCommand: ArchiveCommand;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let mockFile: TFile;
    let mockFileOrganizer: FileOrganizer;
    let context: CommandContext;

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

        const settings = { ...DEFAULT_SETTINGS, moveArchivedToFolder: false };
        mockFileOrganizer = new FileOrganizer(mockVault, settings);
        const frontmatterParser = new FrontmatterParser();

        // Create command context
        context = new CommandContext(
            mockApp,
            {} as any, // plugin
            settings,
            {} as any, // fileManager
            {} as any, // classificationService
            {} as any, // duplicateDetector
            {} as any, // domainService
            {} as any, // webSearchService
            {} as any, // nameVariantService
            {} as any, // scaffoldService
            frontmatterParser,
            {} as any, // ideaRepository
            {} as any, // embeddingService
            {} as any, // clusteringService
            {} as any, // graphLayoutService
            {} as any, // resurfacingService
            {} as any, // projectElevationService
            {} as any, // tenuousLinkService
            {} as any, // exportService
            {} as any, // importService
            {} as any, // searchService
            {} as any, // llmService
            { logError: vi.fn() } as any, // errorLogService
            mockFileOrganizer
        );

        // Create command instances
        statusCommand = new StatusCommand(context);
        archiveCommand = new ArchiveCommand(context, true);
        unarchiveCommand = new ArchiveCommand(context, false);
        
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

            // Act
            await statusCommand.execute();
            
            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(StatusPickerModal).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await statusCommand.execute();

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
            await archiveCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(mockVault.modify).toHaveBeenCalled();
            
            // Verify status was updated to archived
            const modifyCall = (mockVault.modify as any).mock.calls[0];
            expect(modifyCall[1]).toContain('status: archived');
        });

        it('should move file to archive directory if enabled', async () => {
            // Arrange
            context.settings.moveArchivedToFolder = true;
            const fileOrganizerWithArchive = new FileOrganizer(mockVault, context.settings);
            context.fileOrganizer = fileOrganizerWithArchive;

            const archiveCommandWithMove = new ArchiveCommand(context, true);

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
            await archiveCommandWithMove.execute();

            // Assert
            expect(mockVault.rename).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await archiveCommand.execute();

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
            await unarchiveCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
            expect(mockVault.modify).toHaveBeenCalled();
            
            // Verify status was updated from archived
            const modifyCall = (mockVault.modify as any).mock.calls[0];
            expect(modifyCall[1]).not.toContain('status: archived');
        });

        it('should move file from archive if enabled', async () => {
            // Arrange
            context.settings.moveArchivedToFolder = true;
            const fileOrganizerWithArchive = new FileOrganizer(mockVault, context.settings);
            context.fileOrganizer = fileOrganizerWithArchive;

            const unarchiveCommandWithMove = new ArchiveCommand(context, false);

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
            await unarchiveCommandWithMove.execute();

            // Assert
            expect(mockVault.rename).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await unarchiveCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });
});

