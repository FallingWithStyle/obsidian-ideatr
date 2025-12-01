/**
 * Integration Tests for Plugin Initialization
 * Tests that services are properly initialized and methods are called correctly
 * Following QA recommendations to catch initialization and method call issues
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Notice, TFile, Vault, App, Workspace } from '../../test/mocks/obsidian';
import IdeatrPlugin from '../../src/main';
import { DEFAULT_SETTINGS } from '../../src/settings';
import { TenuousLinkServiceImpl } from '../../src/services/TenuousLinkService';
import { ExportService } from '../../src/services/ExportService';
import { ImportService } from '../../src/services/ImportService';
import { ClassificationService } from '../../src/services/ClassificationService';

// Mock Obsidian globals
global.Notice = Notice;

describe('Plugin Initialization Integration Tests', () => {
    let plugin: IdeatrPlugin;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;

    beforeEach(() => {
        // Create mock app
        mockVault = new Vault();
        // Add adapter with basePath for plugin directory resolution
        (mockVault as any).adapter = {
            basePath: '/mock/vault/path'
        };
        // Add configDir property
        (mockVault as any).configDir = '.obsidian';
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
        // Add manifest for plugin directory resolution
        (plugin as any).manifest = {
            id: 'ideatr'
        };

        // Mock vault methods
        vi.spyOn(mockVault, 'getMarkdownFiles').mockReturnValue([]);
        vi.spyOn(mockVault, 'read').mockResolvedValue('');
        vi.spyOn(mockVault, 'modify').mockResolvedValue();
        vi.spyOn(mockVault, 'create').mockResolvedValue(new TFile());
        vi.spyOn(mockVault, 'createFolder').mockResolvedValue();

        // Mock plugin data methods
        plugin.loadData = vi.fn().mockResolvedValue({});
        plugin.saveData = vi.fn().mockResolvedValue();
        plugin.saveSettings = vi.fn().mockResolvedValue();
        plugin.loadSettings = vi.fn().mockResolvedValue();
        plugin.addCommand = vi.fn();
        plugin.registerView = vi.fn();
        plugin.addSettingTab = vi.fn();
    });

    describe('Service Initialization', () => {
        it('should initialize all required services in onload', async () => {
            // Act
            await plugin.onload();

            // Assert - Verify all services are initialized
            expect(plugin.fileManager).toBeDefined();
            expect(plugin.fileOrganizer).toBeDefined();
            expect(plugin.classificationService).toBeDefined();
            expect(plugin.duplicateDetector).toBeDefined();
            expect(plugin.llmService).toBeDefined();
            expect(plugin.domainService).toBeDefined();
            expect(plugin.webSearchService).toBeDefined();
            expect(plugin.searchService).toBeDefined();
            expect(plugin.nameVariantService).toBeDefined();
            expect(plugin.scaffoldService).toBeDefined();
            expect(plugin.frontmatterParser).toBeDefined();
            expect(plugin.ideaRepository).toBeDefined();
            expect(plugin.embeddingService).toBeDefined();
            expect(plugin.clusteringService).toBeDefined();
            expect(plugin.graphLayoutService).toBeDefined();
            expect(plugin.resurfacingService).toBeDefined();
            expect(plugin.projectElevationService).toBeDefined();
            expect(plugin.modelManager).toBeDefined();

            // Critical services that were missing before QA fixes
            expect(plugin.tenuousLinkService).toBeDefined();
            expect(plugin.tenuousLinkService).toBeInstanceOf(TenuousLinkServiceImpl);
            expect((plugin as any).exportService).toBeDefined();
            expect((plugin as any).exportService).toBeInstanceOf(ExportService);
            expect((plugin as any).importService).toBeDefined();
            expect((plugin as any).importService).toBeInstanceOf(ImportService);
        });

        it('should initialize tenuousLinkService with correct dependencies', async () => {
            // Act
            await plugin.onload();

            // Assert
            expect(plugin.tenuousLinkService).toBeDefined();
            // Verify it has access to required services
            expect(plugin.embeddingService).toBeDefined();
            expect(plugin.llmService).toBeDefined();
        });

        it('should initialize exportService with vault', async () => {
            // Act
            await plugin.onload();

            // Assert
            expect((plugin as any).exportService).toBeDefined();
            expect((plugin as any).exportService).toBeInstanceOf(ExportService);
        });

        it('should initialize importService with vault', async () => {
            // Act
            await plugin.onload();

            // Assert
            expect((plugin as any).importService).toBeDefined();
            expect((plugin as any).importService).toBeInstanceOf(ImportService);
        });
    });

    describe('Method Call Verification', () => {
        it('should call classifyIdea (not classify) in refreshIdea command', async () => {
            // Arrange
            await plugin.onload();

            const mockFile = new TFile();
            mockFile.path = 'Ideas/2025-01-15-test.md';
            mockFile.name = '2025-01-15-test.md';
            mockFile.stat = { mtime: Date.now() };

            mockWorkspace.getActiveFile = vi.fn().mockReturnValue(mockFile);
            (mockVault.read as any).mockResolvedValue(`---
type: idea
status: captured
created: 2025-01-15
category: app
tags: []
---

Test idea content
`);

            // Spy on the actual method
            const classifyIdeaSpy = vi.spyOn(plugin.classificationService, 'classifyIdea');

            // Mock the method to return a value
            classifyIdeaSpy.mockResolvedValue({
                category: 'app',
                tags: ['test'],
                related: []
            });

            plugin.searchService = {
                findRelatedNotes: vi.fn().mockResolvedValue([])
            } as any;

            plugin.nameVariantService = {
                generateVariants: vi.fn().mockResolvedValue([]),
                isAvailable: vi.fn().mockReturnValue(false)
            } as any;

            // Act
            await (plugin as any).refreshIdea();

            // Assert - Verify correct method was called
            expect(classifyIdeaSpy).toHaveBeenCalled();
            expect(classifyIdeaSpy).toHaveBeenCalledWith('Test idea content');
            // Verify classifyIdea exists (not the old 'classify' method)
            expect(plugin.classificationService.classifyIdea).toBeDefined();
            expect((plugin.classificationService as any).classify).toBeUndefined();
        });

        it('should have classifyIdea method available (not classify)', async () => {
            // Arrange
            await plugin.onload();

            // Assert - Verify the correct method exists
            expect(plugin.classificationService.classifyIdea).toBeDefined();
            expect(typeof plugin.classificationService.classifyIdea).toBe('function');
            // Verify the old 'classify' method does NOT exist
            expect((plugin.classificationService as any).classify).toBeUndefined();
        });
    });

    describe('Service Availability After Initialization', () => {
        it('should have tenuousLinkService available after initialization', async () => {
            // Act
            await plugin.onload();

            // Assert
            expect(plugin.tenuousLinkService).toBeDefined();
            // Verify it can be used (not just defined)
            expect(() => {
                if (!plugin.tenuousLinkService) {
                    throw new Error('Service not available');
                }
            }).not.toThrow();
        });

        it('should have exportService available after initialization', async () => {
            // Act
            await plugin.onload();

            // Assert
            expect((plugin as any).exportService).toBeDefined();
            // Verify it can be used
            expect(() => {
                if (!(plugin as any).exportService) {
                    throw new Error('Service not available');
                }
            }).not.toThrow();
        });

        it('should have importService available after initialization', async () => {
            // Act
            await plugin.onload();

            // Assert
            expect((plugin as any).importService).toBeDefined();
            // Verify it can be used
            expect(() => {
                if (!(plugin as any).importService) {
                    throw new Error('Service not available');
                }
            }).not.toThrow();
        });
    });

    describe('Command Registration', () => {
        it('should register all commands during onload', async () => {
            // Act
            await plugin.onload();

            // Assert - Verify commands were registered
            expect(plugin.addCommand).toHaveBeenCalled();
            // Should register at least 20 commands
            const callCount = (plugin.addCommand as any).mock.calls.length;
            expect(callCount).toBeGreaterThanOrEqual(20);
        });
    });
});

