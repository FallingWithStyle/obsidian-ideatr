/**
 * Tests for Analysis & Insights Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import { TenuousLinksCommand } from '../../../src/commands/analysis/TenuousLinksCommand';
import { ClusterAnalysisCommand } from '../../../src/commands/analysis/ClusterAnalysisCommand';
import { IdeaStatsCommand } from '../../../src/commands/analysis/IdeaStatsCommand';
import { CommandContext } from '../../../src/commands/base/CommandContext';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { FileOrganizer } from '../../../src/utils/fileOrganization';
import { DEFAULT_SETTINGS } from '../../../src/settings';
import { TenuousLinksModal } from '../../../src/views/TenuousLinksModal';

// Mock Obsidian globals
global.Notice = Notice;

// Mock modals
const MockTenuousLinksModal = vi.hoisted(() => vi.fn().mockImplementation((app, links, callback) => ({
    open: vi.fn()
})));

vi.mock('../../../src/views/TenuousLinksModal', () => ({
    TenuousLinksModal: MockTenuousLinksModal
}));

describe('Analysis & Insights Commands', () => {
    let tenuousLinksCommand: TenuousLinksCommand;
    let clusterAnalysisCommand: ClusterAnalysisCommand;
    let ideaStatsCommand: IdeaStatsCommand;
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

        // Create command instances
        tenuousLinksCommand = new TenuousLinksCommand(context);
        clusterAnalysisCommand = new ClusterAnalysisCommand(context);
        ideaStatsCommand = new IdeaStatsCommand(context);
        
        // Mock vault methods
        vi.spyOn(mockVault, 'read');
        vi.spyOn(mockVault, 'getMarkdownFiles');
    });

    describe('Command: find-tenuous-links', () => {
        it('should find tenuous links and show modal', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
---

Test idea content
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.getMarkdownFiles as any).mockReturnValue([mockFile]);

            // Mock tenuous link service
            context.tenuousLinkService = {
                findTenuousLinks: vi.fn().mockResolvedValue([
                    {
                        idea: { path: 'Ideas/other.md', title: 'other', similarity: 0.4 },
                        similarity: 0.4,
                        explanation: 'Unexpected connection',
                        relevance: 0.7
                    }
                ])
            } as any;

            // Act
            await tenuousLinksCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalled();
            expect(context.tenuousLinkService.findTenuousLinks).toHaveBeenCalled();
            expect(MockTenuousLinksModal).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await tenuousLinksCommand.execute();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });

    describe('Command: analyze-idea-cluster', () => {
        it('should analyze cluster and show modal', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
---

Test idea
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            (mockVault.getMarkdownFiles as any).mockReturnValue([mockFile]);

            // Mock clustering service
            context.clusteringService = {
                clusterIdeas: vi.fn().mockResolvedValue([
                    {
                        id: 'cluster-0',
                        ideas: [{ path: mockFile.path, name: mockFile.name, frontmatter: {}, body: 'Test' }],
                        label: 'Test Cluster'
                    }
                ])
            } as any;

            // Act
            await clusterAnalysisCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalled();
        });
    });

    describe('Command: show-idea-stats', () => {
        it('should calculate and show idea statistics', async () => {
            // Arrange
            const fileContent = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
related: []
---

Test idea
`;

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(fileContent);
            mockFile.stat = { mtime: Date.now() };

            // Act
            await ideaStatsCommand.execute();

            // Assert
            expect(mockVault.read).toHaveBeenCalled();
        });
    });
});

