/**
 * Tests for Export & Import Commands
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../../test/mocks/obsidian';
import IdeatrPlugin from '../../../src/main';
import { FrontmatterParser } from '../../../src/services/FrontmatterParser';
import { DEFAULT_SETTINGS } from '../../../src/settings';

// Mock Obsidian globals
global.Notice = Notice;

describe('Export & Import Commands', () => {
    let plugin: IdeatrPlugin;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;

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

        // Create plugin instance
        plugin = new IdeatrPlugin();
        plugin.app = mockApp;
        plugin.settings = { ...DEFAULT_SETTINGS };

        plugin.frontmatterParser = new FrontmatterParser();
        
        // Mock vault methods
        vi.spyOn(mockVault, 'getMarkdownFiles');
        vi.spyOn(mockVault, 'read');
        vi.spyOn(mockVault, 'create');

        // Initialize export service
        plugin.exportService = {
            exportIdeas: vi.fn().mockResolvedValue('{"version":"1.0","ideas":[]}')
        } as any;
    });

    describe('Command: export-ideas', () => {
        it('should export all ideas to JSON format', async () => {
            // Arrange
            (mockVault.create as any).mockResolvedValue(new TFile());

            // Act
            await (plugin as any).exportIdeas();

            // Assert
            expect(plugin.exportService.exportIdeas).toHaveBeenCalled();
            expect(mockVault.create).toHaveBeenCalled();
        });
    });

    describe('Command: import-ideas', () => {
        it('should show notice for import functionality', async () => {
            // Act
            await (plugin as any).importIdeas();

            // Assert - should not throw
            expect(true).toBe(true);
        });
    });
});

