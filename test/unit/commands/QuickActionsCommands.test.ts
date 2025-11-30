/**
 * Tests for Quick Actions Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import IdeatrPlugin from '../../../src/main';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { DEFAULT_SETTINGS } from '../../../src/settings';

// Mock Obsidian globals
global.Notice = Notice;

describe('Quick Actions Commands', () => {
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
            plugin.classificationService = {
                classifyIdea: vi.fn().mockResolvedValue({
                    category: 'app',
                    tags: ['test'],
                    related: []
                }),
                isAvailable: vi.fn().mockReturnValue(true)
            } as any;

            plugin.searchService = {
                findRelatedNotes: vi.fn().mockResolvedValue([
                    { path: 'Ideas/related.md', title: 'related', similarity: 0.8 }
                ])
            } as any;

            plugin.nameVariantService = {
                generateVariants: vi.fn().mockResolvedValue([]),
                isAvailable: vi.fn().mockReturnValue(true)
            } as any;

            // Act
            await (plugin as any).refreshIdea();

            // Assert
            expect(mockVault.read).toHaveBeenCalled();
            expect(plugin.classificationService.classifyIdea).toHaveBeenCalled();
            expect(plugin.searchService.findRelatedNotes).toHaveBeenCalled();
        });

        it('should handle no active file gracefully', async () => {
            // Arrange
            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(null);

            // Act
            await (plugin as any).refreshIdea();

            // Assert
            expect(mockVault.read).not.toHaveBeenCalled();
        });
    });
});

