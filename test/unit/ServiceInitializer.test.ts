/**
 * Tests for ServiceInitializer
 * Tests service initialization and wiring logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App, Notice } from '../../test/mocks/obsidian';
import { ServiceInitializer } from '../../src/core/ServiceInitializer';
import { DEFAULT_SETTINGS } from '../../src/settings';
import { PluginContext } from '../../src/core/PluginContext';
import { LlamaService } from '../../src/services/LlamaService';
import { FileManager } from '../../src/storage/FileManager';
import { SearchService } from '../../src/services/SearchService';
import { ClassificationService } from '../../src/services/ClassificationService';
import { DuplicateDetector } from '../../src/services/DuplicateDetector';
import { DomainService } from '../../src/services/DomainService';
import { WebSearchService } from '../../src/services/WebSearchService';
import { NameVariantService } from '../../src/services/NameVariantService';
import { ScaffoldService } from '../../src/services/ScaffoldService';
import { FrontmatterParser } from '../../src/services/FrontmatterParser';
import { IdeaRepository } from '../../src/services/IdeaRepository';
import { EmbeddingService } from '../../src/services/EmbeddingService';
import { ClusteringService } from '../../src/services/ClusteringService';
import { GraphLayoutService } from '../../src/services/GraphLayoutService';
import { ResurfacingService } from '../../src/services/ResurfacingService';
import { ProjectElevationService } from '../../src/services/ProjectElevationService';
import { TenuousLinkServiceImpl } from '../../src/services/TenuousLinkService';
import { ExportService } from '../../src/services/ExportService';
import { ImportService } from '../../src/services/ImportService';
import { ErrorLogService } from '../../src/services/ErrorLogService';
import { FileOrganizer } from '../../src/utils/fileOrganization';
import { HybridLLM } from '../../src/services/HybridLLM';
import { ProviderFactory } from '../../src/services/providers/ProviderFactory';

// Mock Obsidian globals
global.Notice = Notice;

// Mock Logger
vi.mock('../../src/utils/logger', () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    }
}));

// Mock ProviderFactory
vi.mock('../../src/services/providers/ProviderFactory', () => ({
    ProviderFactory: {
        createProvider: vi.fn(),
    }
}));

describe('ServiceInitializer', () => {
    let mockApp: App;
    let mockPlugin: any;
    let mockSettings: typeof DEFAULT_SETTINGS;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockApp = {
            vault: {
                getMarkdownFiles: vi.fn(() => []),
                adapter: {
                    basePath: '/mock/vault/path'
                },
                configDir: '.obsidian',
            } as any,
        } as any;

        mockPlugin = {
            manifest: { id: 'ideatr' },
            loadData: vi.fn().mockResolvedValue({}),
            saveData: vi.fn().mockResolvedValue(undefined),
        };

        mockSettings = { ...DEFAULT_SETTINGS };
    });

    describe('initialize', () => {
        it('should initialize all services and return PluginContext', async () => {
            // Act
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            // Assert
            expect(result).toBeDefined();
            expect(result.context).toBeInstanceOf(PluginContext);
            expect(result.localLLMService).toBeInstanceOf(LlamaService);
        });

        it('should initialize FileManager', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.fileManager).toBeInstanceOf(FileManager);
        });

        it('should initialize FileOrganizer', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.fileOrganizer).toBeInstanceOf(FileOrganizer);
        });

        it('should initialize ErrorLogService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.errorLogService).toBeInstanceOf(ErrorLogService);
        });

        it('should initialize SearchService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.searchService).toBeInstanceOf(SearchService);
        });

        it('should initialize ClassificationService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.classificationService).toBeInstanceOf(ClassificationService);
        });

        it('should initialize DuplicateDetector', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.duplicateDetector).toBeInstanceOf(DuplicateDetector);
        });

        it('should initialize DomainService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.domainService).toBeInstanceOf(DomainService);
        });

        it('should initialize WebSearchService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.webSearchService).toBeInstanceOf(WebSearchService);
        });

        it('should initialize NameVariantService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.nameVariantService).toBeInstanceOf(NameVariantService);
        });

        it('should initialize ScaffoldService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.scaffoldService).toBeInstanceOf(ScaffoldService);
        });

        it('should initialize FrontmatterParser', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.frontmatterParser).toBeInstanceOf(FrontmatterParser);
        });

        it('should initialize IdeaRepository', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.ideaRepository).toBeInstanceOf(IdeaRepository);
        });

        it('should initialize EmbeddingService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.embeddingService).toBeInstanceOf(EmbeddingService);
        });

        it('should initialize ClusteringService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.clusteringService).toBeInstanceOf(ClusteringService);
        });

        it('should initialize GraphLayoutService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.graphLayoutService).toBeInstanceOf(GraphLayoutService);
        });

        it('should initialize ResurfacingService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.resurfacingService).toBeInstanceOf(ResurfacingService);
        });

        it('should initialize ProjectElevationService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.projectElevationService).toBeInstanceOf(ProjectElevationService);
        });

        it('should initialize TenuousLinkService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.tenuousLinkService).toBeInstanceOf(TenuousLinkServiceImpl);
        });

        it('should initialize ExportService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.exportService).toBeInstanceOf(ExportService);
        });

        it('should initialize ImportService', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.importService).toBeInstanceOf(ImportService);
        });

        it('should initialize HybridLLM service', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.llmService).toBeInstanceOf(HybridLLM);
        });

        it('should create CommandContext with all services', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.commandContext).toBeDefined();
            expect(result.context.commandContext.app).toBe(mockApp);
            expect(result.context.commandContext.plugin).toBe(mockPlugin);
            expect(result.context.commandContext.settings).toBe(mockSettings);
        });

        it('should initialize LlamaService for local LLM', async () => {
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.localLLMService).toBeInstanceOf(LlamaService);
        });

        it('should handle cloud provider initialization when configured', async () => {
            mockSettings.cloudProvider = 'openai';
            mockSettings.cloudApiKeys = {
                ...mockSettings.cloudApiKeys,
                openai: 'test-key'
            };

            const mockProvider = {
                name: 'OpenAI',
            };
            vi.mocked(ProviderFactory.createProvider).mockReturnValue(mockProvider as any);

            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(ProviderFactory.createProvider).toHaveBeenCalledWith(
                'openai',
                'test-key',
                expect.any(Object)
            );
            expect(result.context.llmService).toBeInstanceOf(HybridLLM);
        });

        it('should handle cloud provider initialization failure gracefully', async () => {
            mockSettings.cloudProvider = 'openai';
            mockSettings.cloudApiKey = 'test-key';

            vi.mocked(ProviderFactory.createProvider).mockImplementation(() => {
                throw new Error('Provider initialization failed');
            });

            // Should not throw
            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(result.context.llmService).toBeInstanceOf(HybridLLM);
        });

        it('should use local LLM only when cloud provider is none', async () => {
            mockSettings.cloudProvider = 'none';

            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(ProviderFactory.createProvider).not.toHaveBeenCalled();
            expect(result.context.llmService).toBeInstanceOf(HybridLLM);
        });

        it('should use local LLM only when cloud API key is empty', async () => {
            mockSettings.cloudProvider = 'openai';
            mockSettings.cloudApiKeys = {
                ...mockSettings.cloudApiKeys,
                openai: ''
            };

            const result = await ServiceInitializer.initialize(mockApp, mockPlugin, mockSettings);

            expect(ProviderFactory.createProvider).not.toHaveBeenCalled();
            expect(result.context.llmService).toBeInstanceOf(HybridLLM);
        });
    });
});

