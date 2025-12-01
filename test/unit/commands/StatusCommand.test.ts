import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../mocks/obsidian';
import { StatusCommand } from '../../../src/commands/lifecycle/StatusCommand';
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

describe('StatusCommand', () => {
    let command: StatusCommand;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let mockFile: TFile;
    let context: CommandContext;

    beforeEach(() => {
        mockVault = new Vault();
        mockWorkspace = {
            getActiveFile: vi.fn(),
        } as any;
        mockApp = {
            vault: mockVault,
            workspace: mockWorkspace,
        } as any;

        mockFile = new TFile();
        mockFile.path = 'Ideas/2025-01-15-test-idea.md';
        mockFile.name = '2025-01-15-test-idea.md';

        const settings = { ...DEFAULT_SETTINGS };
        const fileOrganizer = new FileOrganizer(mockVault, settings);
        const frontmatterParser = new FrontmatterParser();

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
            fileOrganizer
        );

        command = new StatusCommand(context);

        vi.spyOn(mockVault, 'read');
        vi.spyOn(mockVault, 'modify');
        vi.spyOn(mockVault, 'rename');
    });

    it('should change status when executed', async () => {
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

        await command.execute();

        expect(mockVault.read).toHaveBeenCalledWith(mockFile);
        expect(StatusPickerModal).toHaveBeenCalled();
    });

    it('should handle no active file gracefully', async () => {
        mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

        await command.execute();

        expect(mockVault.read).not.toHaveBeenCalled();
    });
});

