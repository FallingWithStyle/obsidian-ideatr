/**
 * Tests for Quick Actions Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import { RefreshIdeaCommand } from '../../../src/commands/management/RefreshIdeaCommand';
import { CommandContext } from '../../../src/commands/base/CommandContext';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { FileOrganizer } from '../../../src/utils/fileOrganization';
import { DEFAULT_SETTINGS } from '../../../src/settings';

// Mock Obsidian globals
global.Notice = Notice;

describe('Quick Actions Commands', () => {
    let refreshIdeaCommand: RefreshIdeaCommand;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let mockFile: TFile;
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

        const settings = { ...DEFAULT_SETTINGS };
        const fileOrganizer = new FileOrganizer(mockVault, settings);
        const frontmatterParser = new FrontmatterParser();

        // Create command context
        context = new CommandContext(
            mockApp,
            {} as any, // plugin
            settings,
            { appendToFileBody: vi.fn().mockResolvedValue(undefined) } as any, // fileManager
            { isAvailable: vi.fn().mockReturnValue(true), classifyIdea: vi.fn() } as any, // classificationService
            {} as any, // duplicateDetector
            {} as any, // domainService
            {} as any, // webSearchService
            { isAvailable: vi.fn().mockReturnValue(true), generateVariants: vi.fn(), formatVariantsForMarkdown: vi.fn() } as any, // nameVariantService
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
            { findRelatedNotes: vi.fn() } as any, // searchService
            {} as any, // llmService
            { logError: vi.fn() } as any, // errorLogService
            fileOrganizer
        );

        // Create command instance
        refreshIdeaCommand = new RefreshIdeaCommand(context);
        
        // Mock vault methods
        vi.spyOn(mockVault, 'read');
        vi.spyOn(mockVault, 'modify');
    });

    describe('Command: refresh-idea', () => {
        it('should refresh idea classification, related notes, and variants', async () => {
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

Test idea content
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.modify as any).mockResolvedValue(undefined);

            // Mock services
            context.classificationService = {
                classifyIdea: vi.fn().mockResolvedValue({
                    category: 'app',
                    tags: ['test'],
                    related: []
                }),
                isAvailable: vi.fn().mockReturnValue(true)
            } as any;

            context.searchService = {
                findRelatedNotes: vi.fn().mockResolvedValue([
                    { path: 'Ideas/related.md', title: 'related', similarity: 0.8 }
                ])
            } as any;

            context.nameVariantService = {
                generateVariants: vi.fn().mockResolvedValue([]),
                isAvailable: vi.fn().mockReturnValue(true),
                formatVariantsForMarkdown: vi.fn().mockReturnValue('')
            } as any;

            // Act
            await refreshIdeaCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalled();
            expect(context.classificationService.classifyIdea).toHaveBeenCalled();
            expect(context.searchService.findRelatedNotes).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await refreshIdeaCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });
});

