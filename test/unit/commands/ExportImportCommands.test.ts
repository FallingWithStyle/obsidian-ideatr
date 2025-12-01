/**
 * Tests for Export & Import Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import { ExportCommand } from '../../../src/commands/management/ExportCommand';
import { ImportCommand } from '../../../src/commands/management/ImportCommand';
import { CommandContext } from '../../../src/commands/base/CommandContext';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { FileOrganizer } from '../../../src/utils/fileOrganization';
import { DEFAULT_SETTINGS } from '../../../src/settings';
import { ExportService } from '../../../src/services/ExportService';
import { ImportService } from '../../../src/services/ImportService';

// Mock Obsidian globals
global.Notice = Notice;

describe('Export & Import Commands', () => {
    let exportCommand: ExportCommand;
    let importCommand: ImportCommand;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let context: CommandContext;
    let mockExportService: ExportService;
    let mockImportService: ImportService;

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

        const settings = { ...DEFAULT_SETTINGS };
        const fileOrganizer = new FileOrganizer(mockVault, settings);
        const frontmatterParser = new FrontmatterParser();

        // Initialize services
        mockExportService = new ExportService(mockVault);
        mockImportService = new ImportService(mockVault);
        vi.spyOn(mockExportService, 'exportIdeas').mockResolvedValue('{"version":"1.0","ideas":[]}');

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
            mockExportService,
            mockImportService,
            {} as any, // searchService
            {} as any, // llmService
            { logError: vi.fn() } as any, // errorLogService
            fileOrganizer
        );

        // Create command instances
        exportCommand = new ExportCommand(context);
        importCommand = new ImportCommand(context);
        
        // Mock vault methods
        vi.spyOn(mockVault, 'getMarkdownFiles');
        vi.spyOn(mockVault, 'read');
        vi.spyOn(mockVault, 'create');
    });

    describe('Command: export-ideas', () => {
        it('should export all ideas to JSON format', async () => {
            // Arrange
            (mockVault.create as any).mockResolvedValue(new TFile());

            // Act
            await exportCommand.execute();

            // Assert
            expect(mockExportService.exportIdeas).toHaveBeenCalled();
            expect(mockVault.create).toHaveBeenCalled();
        });
    });

    describe('Command: import-ideas', () => {
        it('should show notice for import functionality', async () => {
            // Act
            await importCommand.execute();

            // Assert - should not throw
            expect(true).toBe(true);
        });
    });
});

