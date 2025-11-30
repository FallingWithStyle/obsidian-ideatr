/**
 * Tests for Analysis & Insights Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import IdeatrPlugin from '../../../src/main';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { DEFAULT_SETTINGS } from '../../../src/settings';

// Mock Obsidian globals
global.Notice = Notice;

describe('Analysis & Insights Commands', () => {
    let plugin: IdeatrPlugin;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;
    let mockFile: TFile;

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
        plugin.settings = { ...DEFAULT_SETTINGS };

        plugin.frontmatterParser = new FrontmatterParser();
        
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
            plugin.tenuousLinkService = {
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
            await (plugin as any).findTenuousLinks();

            // Assert
            expect(mockVault.read).toHaveBeenCalled();
            expect(plugin.tenuousLinkService.findTenuousLinks).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await (plugin as any).findTenuousLinks();

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
            plugin.clusteringService = {
                clusterIdeas: vi.fn().mockResolvedValue([
                    {
                        id: 'cluster-0',
                        ideas: [{ path: mockFile.path, name: mockFile.name, frontmatter: {}, body: 'Test' }],
                        label: 'Test Cluster'
                    }
                ])
            } as any;

            // Act
            await (plugin as any).analyzeIdeaCluster();

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
            await (plugin as any).showIdeaStats();

            // Assert
            expect(mockVault.read).toHaveBeenCalled();
        });
    });
});

