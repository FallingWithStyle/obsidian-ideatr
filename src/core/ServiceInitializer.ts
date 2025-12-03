import * as path from 'path';
import { App, Notice } from 'obsidian';
import type IdeatrPlugin from '../main';
import type { IdeatrSettings } from '../settings';
import { FileManager } from '../storage/FileManager';
import { LlamaService } from '../services/LlamaService';
import { SearchService } from '../services/SearchService';
import { ClassificationService } from '../services/ClassificationService';
import { DuplicateDetector } from '../services/DuplicateDetector';
import { DomainService } from '../services/DomainService';
import { ProspectrService } from '../services/ProspectrService';
import { WebSearchService } from '../services/WebSearchService';
import { NameVariantService } from '../services/NameVariantService';
import { ScaffoldService } from '../services/ScaffoldService';
import { FrontmatterParser } from '../services/FrontmatterParser';
import { IdeaRepository } from '../services/IdeaRepository';
import { EmbeddingService } from '../services/EmbeddingService';
import { ClusteringService } from '../services/ClusteringService';
import { GraphLayoutService } from '../services/GraphLayoutService';
import { ResurfacingService } from '../services/ResurfacingService';
import { ProjectElevationService } from '../services/ProjectElevationService';
import { TenuousLinkServiceImpl } from '../services/TenuousLinkService';
import { ExportService } from '../services/ExportService';
import { ImportService } from '../services/ImportService';
import { HybridLLM } from '../services/HybridLLM';
import { ProviderFactory } from '../services/providers/ProviderFactory';
import { ProviderAdapter } from '../services/providers/ProviderAdapter';
import type { ILLMService } from '../types/classification';
import { ErrorLogService } from '../services/ErrorLogService';
import { FileOrganizer } from '../utils/fileOrganization';
import { Logger } from '../utils/logger';
import { PluginContext } from './PluginContext';

/**
 * Handles initialization of all plugin services
 */
export class ServiceInitializer {
    /**
     * Initialize all services and return plugin context
     */
    static async initialize(
        app: App,
        plugin: IdeatrPlugin,
        settings: IdeatrSettings
    ): Promise<{ context: PluginContext; localLLMService: LlamaService }> {
        // 1. Core Services
        const { fileManager, fileOrganizer, errorLogService } = this.initializeCoreServices(app, settings);

        // 2. LLM Services
        const { localLLMService, llmService } = await this.initializeLLMServices(app, plugin, settings);

        // 3. Search & Classification Services
        const { searchService, classificationService, duplicateDetector } = this.initializeSearchServices(app, llmService);

        // 4. Validation Services
        const { domainService, webSearchService } = this.initializeValidationServices(settings);

        // 5. Transformation Services
        const { nameVariantService, scaffoldService } = this.initializeTransformationServices(app, plugin, settings, llmService);

        // 6. Management Services
        const {
            frontmatterParser, ideaRepository, embeddingService,
            clusteringService, graphLayoutService, resurfacingService,
            projectElevationService
        } = this.initializeManagementServices(app, settings);

        // 7. Analysis & IO Services
        const { tenuousLinkService, exportService, importService } = this.initializeAnalysisServices(app, llmService, embeddingService);

        const context = new PluginContext(
            app,
            plugin,
            settings,
            fileManager,
            classificationService,
            duplicateDetector,
            domainService,
            webSearchService,
            nameVariantService,
            scaffoldService,
            frontmatterParser,
            ideaRepository,
            embeddingService,
            clusteringService,
            graphLayoutService,
            resurfacingService,
            projectElevationService,
            tenuousLinkService,
            exportService,
            importService,
            searchService,
            llmService,
            errorLogService,
            fileOrganizer
        );

        return { context, localLLMService };
    }

    private static initializeCoreServices(app: App, settings: IdeatrSettings) {
        const fileManager = new FileManager(app.vault);
        const fileOrganizer = new FileOrganizer(app.vault, settings);
        const errorLogService = new ErrorLogService({
            enabled: settings.errorLoggingEnabled,
            maxEntries: settings.errorLogMaxEntries,
            retentionDays: settings.errorLogRetentionDays
        });
        return { fileManager, fileOrganizer, errorLogService };
    }

    private static initializeSearchServices(app: App, llmService: ILLMService) {
        const searchService = new SearchService(app.vault);
        const classificationService = new ClassificationService(llmService, searchService);
        const duplicateDetector = new DuplicateDetector(searchService);
        return { searchService, classificationService, duplicateDetector };
    }

    private static initializeValidationServices(settings: IdeatrSettings) {
        const prospectrService = new ProspectrService(
            settings.prospectrUrl,
            settings.domainCheckTimeout
        );
        const domainService = new DomainService(prospectrService);
        const webSearchService = new WebSearchService(settings);
        return { domainService, webSearchService };
    }

    private static initializeTransformationServices(
        app: App,
        plugin: IdeatrPlugin,
        settings: IdeatrSettings,
        llmService: ILLMService
    ) {
        const nameVariantService = new NameVariantService(
            llmService,
            settings,
            async () => {
                const data = await plugin.loadData();
                return data?.variantCache || {};
            },
            async (cacheData: Record<string, any>) => {
                const data = await plugin.loadData();
                await plugin.saveData({
                    ...data,
                    variantCache: cacheData
                });
            }
        );
        const scaffoldService = new ScaffoldService(app.vault);
        return { nameVariantService, scaffoldService };
    }

    private static initializeManagementServices(app: App, settings: IdeatrSettings) {
        const frontmatterParser = new FrontmatterParser();
        const ideaRepository = new IdeaRepository(app.vault, frontmatterParser);
        const embeddingService = new EmbeddingService();
        const clusteringService = new ClusteringService(
            embeddingService,
            settings.clusteringSimilarityThreshold || 0.3
        );
        const graphLayoutService = new GraphLayoutService();
        const resurfacingService = new ResurfacingService(
            ideaRepository,
            settings,
            app.vault
        );
        const projectElevationService = new ProjectElevationService(
            app.vault,
            frontmatterParser,
            settings
        );
        return {
            frontmatterParser, ideaRepository, embeddingService,
            clusteringService, graphLayoutService, resurfacingService,
            projectElevationService
        };
    }

    private static initializeAnalysisServices(
        app: App,
        llmService: ILLMService,
        embeddingService: EmbeddingService
    ) {
        const tenuousLinkService = new TenuousLinkServiceImpl(
            app.vault,
            embeddingService,
            llmService
        );
        const exportService = new ExportService(app.vault);
        const importService = new ImportService(app.vault);
        return { tenuousLinkService, exportService, importService };
    }

    /**
     * Initialize LLM services (local and cloud)
     */
    private static async initializeLLMServices(
        app: App,
        plugin: IdeatrPlugin,
        settings: IdeatrSettings
    ): Promise<{ localLLMService: LlamaService; llmService: ILLMService }> {
        // Initialize local LLM using singleton pattern
        const vaultBasePath = (app.vault.adapter as any).basePath || app.vault.configDir;
        const configDir = path.isAbsolute(app.vault.configDir)
            ? app.vault.configDir
            : path.join(vaultBasePath, app.vault.configDir);
        const pluginDir = path.resolve(path.join(configDir, 'plugins', plugin.manifest.id));
        Logger.debug('Plugin directory:', pluginDir);

        // Use singleton getInstance instead of new to ensure only one instance
        const localLLMService = LlamaService.getInstance(settings, pluginDir);

        // Initialize cloud LLM if configured
        let cloudLLM: ILLMService | null = null;
        if (settings.cloudProvider !== 'none' && settings.cloudProvider !== 'custom' && settings.cloudProvider !== 'custom-model') {
            // Get the API key for the current provider
            const apiKey = (settings.cloudApiKeys &&
                settings.cloudProvider in settings.cloudApiKeys)
                ? (settings.cloudApiKeys[settings.cloudProvider as keyof typeof settings.cloudApiKeys] || '').trim()
                : '';

            if (apiKey.length > 0) {
                try {
                    const provider = ProviderFactory.createProvider(
                        settings.cloudProvider,
                        apiKey,
                        {
                            openRouterModel: settings.openRouterModel,
                            customEndpointUrl: settings.customEndpointUrl
                        }
                    );
                    cloudLLM = new ProviderAdapter(provider);
                    Logger.info('Cloud AI provider initialized:', provider.name);
                } catch (error) {
                    Logger.warn('Failed to initialize cloud provider:', error);
                    new Notice('Failed to initialize cloud AI provider. Using local AI only.');
                }
            }
        } else if (settings.cloudProvider === 'custom-model') {
            // Custom model: use the specified provider with a custom model
            if (settings.customModelProvider && settings.customModel) {
                const apiKey = (settings.cloudApiKeys &&
                    settings.customModelProvider in settings.cloudApiKeys)
                    ? (settings.cloudApiKeys[settings.customModelProvider as keyof typeof settings.cloudApiKeys] || '').trim()
                    : '';

                if (apiKey.length > 0) {
                    try {
                        const provider = ProviderFactory.createProvider(
                            'custom-model',
                            apiKey,
                            {
                                customModelProvider: settings.customModelProvider,
                                customModel: settings.customModel
                            }
                        );
                        cloudLLM = new ProviderAdapter(provider);
                        Logger.info('Custom model provider initialized:', provider.name, settings.customModel);
                    } catch (error) {
                        Logger.warn('Failed to initialize custom model provider:', error);
                        new Notice('Failed to initialize custom model provider. Using local AI only.');
                    }
                }
            }
        } else if (settings.cloudProvider === 'custom') {
            // Custom endpoint doesn't need an API key
            if (settings.customEndpointUrl && settings.customEndpointUrl.trim().length > 0) {
                try {
                    const provider = ProviderFactory.createProvider(
                        'custom',
                        '',
                        {
                            customEndpointUrl: settings.customEndpointUrl
                        }
                    );
                    cloudLLM = new ProviderAdapter(provider);
                    Logger.info('Cloud AI provider initialized:', provider.name);
                } catch (error) {
                    Logger.warn('Failed to initialize custom endpoint:', error);
                    new Notice('Failed to initialize custom endpoint. Using local AI only.');
                }
            }
        }

        // Create HybridLLM to manage both local and cloud
        const llmService = new HybridLLM(
            localLLMService,
            cloudLLM,
            settings.preferCloud
        );

        // Preload model on startup if enabled
        if (settings.preloadOnStartup && llmService.isAvailable()) {
            llmService.ensureReady?.().then((ready) => {
                if (!ready) {
                    Logger.debug('LLM not ready for preload (paths not configured or model not downloaded)');
                }
            }).catch((error) => {
                Logger.warn('Failed to preload LLM on startup:', error);
            });
        }

        return { localLLMService, llmService };
    }
}

