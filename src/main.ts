import { Plugin, Notice, addIcon } from 'obsidian';
import { CaptureModal } from './capture/CaptureModal';
import { DashboardView } from './views/DashboardView';
import { GraphView } from './views/GraphView';
import { IdeatrSettings, DEFAULT_SETTINGS, IdeatrSettingTab } from './settings';
import { FirstLaunchSetupModal, isFirstLaunch } from './views/FirstLaunchSetupModal';
import { ModelManager } from './services/ModelManager';
import { Logger } from './utils/logger';
import { ServiceInitializer } from './core/ServiceInitializer';
import { CommandRegistry } from './commands/CommandRegistry';
import { LlamaService } from './services/LlamaService';
import { PluginContext } from './core/PluginContext';
import { NameVariantService } from './services/NameVariantService';
import { ErrorLogService } from './services/ErrorLogService';
import { TutorialManager } from './services/TutorialManager';
import { createModelStatusIndicator } from './utils/ModelStatusIndicator';
import { MemoryMonitor } from './utils/MemoryMonitor';
import { IDEATR_ICON_ID, IDEATR_ICON_GREEN, IDEATR_ICON_YELLOW, IDEATR_ICON_RED, createPNGIconSVG } from './utils/iconUtils';
import { PURPLE_ICON_BASE64, GREEN_ICON_BASE64, YELLOW_ICON_BASE64, RED_ICON_BASE64 } from './utils/iconData';
import * as path from 'path';

/**
 * Ideatr Plugin - Fast idea capture with intelligent classification
 */
export default class IdeatrPlugin extends Plugin {
    settings!: IdeatrSettings;
    private localLLMService!: LlamaService;
    private modelManager!: ModelManager;
    private pluginContext!: PluginContext;
    private statusBarItem!: HTMLElement;
    private statusUpdateInterval?: number;
    private memoryMonitor?: MemoryMonitor;
    private unhandledRejectionHandler?: (reason: any, promise: Promise<any>) => void;
    private uncaughtExceptionHandler?: (error: Error) => void;

    // Public properties for settings modal access
    get nameVariantService(): NameVariantService {
        return this.pluginContext.nameVariantService;
    }

    get errorLogService(): ErrorLogService {
        return this.pluginContext.errorLogService;
    }

    async onload() {
        await this.loadSettings();

        // Global error handlers for leak detection
        // Store handler references so they can be removed in onunload()
        this.unhandledRejectionHandler = (reason: any, promise: Promise<any>) => {
            console.error('Ideatr: Unhandled Rejection at:', promise, 'reason:', reason);
            Logger.error('Unhandled Rejection:', reason);
        };
        process.on('unhandledRejection', this.unhandledRejectionHandler);

        this.uncaughtExceptionHandler = (error: Error) => {
            console.error('Ideatr: Uncaught Exception:', error);
            Logger.error('Uncaught Exception:', error);
        };
        process.on('uncaughtException', this.uncaughtExceptionHandler);

        // Initialize Logger with app instance and debug mode setting
        await Logger.initialize(this.app, this.settings.debugMode);

        // Initialize ModelManager for first-launch detection
        this.modelManager = new ModelManager();

        // Check for first launch and show setup modal if needed
        if (isFirstLaunch(this.settings)) {
            // Delay slightly to ensure Obsidian UI is ready
            setTimeout(() => {
                new FirstLaunchSetupModal(
                    this.app,
                    this.modelManager,
                    this.settings,
                    async () => {
                        // Save settings after setup completion
                        await this.saveSettings();
                    }
                ).open();
            }, 100);
        }

        // Initialize all services using ServiceInitializer
        const { context, localLLMService: localLLM } = await ServiceInitializer.initialize(this.app, this, this.settings);
        this.pluginContext = context;
        this.localLLMService = localLLM;

        // Add status indicator to status bar
        this.addStatusBarIndicator();

        // Auto-copy tutorials to vault if they're available in plugin directory but not in vault
        await this.ensureTutorialsAvailable();

        // Register Dashboard View
        this.registerView(
            'ideatr-dashboard',
            (leaf) => new DashboardView(
                leaf,
                this.pluginContext.ideaRepository,
                this.pluginContext.clusteringService,
                this.pluginContext.resurfacingService,
                this.pluginContext.projectElevationService,
                this.settings.dashboardItemsPerPage,
                this.settings.dashboardPersistFilters
            )
        );

        // Register Graph View
        this.registerView(
            'ideatr-graph',
            (leaf) => new GraphView(
                leaf,
                this.pluginContext.clusteringService,
                this.pluginContext.graphLayoutService,
                this.pluginContext.ideaRepository,
                this.pluginContext.projectElevationService
            )
        );

        // Register Settings Tab
        this.addSettingTab(new IdeatrSettingTab(this.app, this));

        // Register all commands using CommandRegistry
        Logger.debug('Starting command registration...');
        try {
            if (!this.pluginContext) {
                throw new Error('PluginContext is not initialized');
            }
            if (!this.pluginContext.commandContext) {
                throw new Error('CommandContext is not initialized');
            }

            CommandRegistry.registerAll(this, this.pluginContext.commandContext);

            // DEBUG: Add a test command directly in main.ts (only in debug mode)
            if (Logger.isDebugEnabled()) {
                const debugMainCallback = async () => {
                    Logger.debug('[Ideatr DEBUG MAIN] Command callback invoked!');
                    Logger.debug('[Ideatr DEBUG MAIN] Stack trace:', new Error().stack);
                    Logger.info('DEBUG MAIN: Command executed successfully');
                    new Notice('Ideatr Debug (Main) command executed - check console');
                };
                Logger.debug('Debug main callback type:', typeof debugMainCallback);
                this.addCommand({
                    id: 'ideatr-debug-main',
                    name: 'Ideatr Debug (Main)',
                    callback: debugMainCallback
                });
                Logger.debug('Registered debug command directly in main.ts');

                // Note: Obsidian stores commands internally and they may not be immediately
                // accessible via this.commands. The command is registered, but verification
                // would require accessing Obsidian's internal command registry which is not
                // part of the public API. The command will appear in the command palette.
            }

            // Register custom Ideatr icons (purple for primary, colored for status)
            addIcon(IDEATR_ICON_ID, createPNGIconSVG(`data:image/png;base64,${PURPLE_ICON_BASE64}`));
            addIcon(IDEATR_ICON_GREEN, createPNGIconSVG(`data:image/png;base64,${GREEN_ICON_BASE64}`));
            addIcon(IDEATR_ICON_YELLOW, createPNGIconSVG(`data:image/png;base64,${YELLOW_ICON_BASE64}`));
            addIcon(IDEATR_ICON_RED, createPNGIconSVG(`data:image/png;base64,${RED_ICON_BASE64}`));
            
            // Use IDEATR_ICON_ID constant to ensure consistency across ribbon and other icons
            this.addRibbonIcon(IDEATR_ICON_ID, 'Capture Idea', () => {
                this.openCaptureModal();
            });

            // Add Force Kill command
            this.addCommand({
                id: 'force-kill-server',
                name: 'Force Kill AI Server',
                callback: () => {
                    if (this.localLLMService) {
                        this.localLLMService.stopServer();
                        new Notice('AI Server stopped (Force Kill)');
                    }
                }
            });

            // Add Memory Report command
            this.addCommand({
                id: 'show-memory-report',
                name: 'Show Memory Report',
                callback: () => {
                    if (this.memoryMonitor) {
                        const report = this.memoryMonitor.getReport();
                        Logger.debug('Memory Report:', report);
                        // Also show a simplified notice
                        const usage = this.memoryMonitor.getCurrentUsage();
                        if (usage) {
                            new Notice(`Heap: ${usage.heapUsedMB.toFixed(0)}MB | Ext: ${usage.externalMB.toFixed(0)}MB`);
                        } else {
                            new Notice('Memory report logged to console');
                        }
                    } else {
                        new Notice('Memory monitoring is not enabled (requires Debug Mode)');
                    }
                }
            });

            Logger.info('All commands registered successfully');
        } catch (error) {
            console.error('[Ideatr] Error registering commands:', error);
            console.error('[Ideatr] Error details:', error instanceof Error ? error.stack : error);
            new Notice('Failed to register Ideatr commands. Check console for details.');
        }

        // Start memory monitoring if debug mode is enabled
        if (this.settings.debugMode) {
            this.memoryMonitor = new MemoryMonitor();
            this.memoryMonitor.startMonitoring(60000); // Monitor every minute
            Logger.debug('Memory monitoring started');
        }
    }

    openCaptureModal() {
        new CaptureModal(
            this.app,
            this.pluginContext.fileManager,
            this.pluginContext.classificationService,
            this.pluginContext.duplicateDetector,
            this.settings,
            this.pluginContext.domainService,
            this.pluginContext.webSearchService,
            this.pluginContext.nameVariantService,
            this.pluginContext.llmService
        ).open();
    }

    /**
     * Ensure the LLM service is ready (abstracts away implementation details)
     * This works for both local and cloud providers
     */
    async ensureLLMReady(): Promise<void> {
        if (this.pluginContext.llmService?.ensureReady) {
            await this.pluginContext.llmService.ensureReady();
        }
    }

    onunload() {
        Logger.debug('Unloading Ideatr plugin');

        // Remove global error handlers to prevent resource leaks
        if (this.unhandledRejectionHandler) {
            process.removeListener('unhandledRejection', this.unhandledRejectionHandler);
            this.unhandledRejectionHandler = undefined;
        }
        if (this.uncaughtExceptionHandler) {
            process.removeListener('uncaughtException', this.uncaughtExceptionHandler);
            this.uncaughtExceptionHandler = undefined;
        }

        // Clear status update interval
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = undefined;
        }

        // Stop memory monitoring if enabled
        if (this.memoryMonitor) {
            Logger.debug('Memory report before unload:');
            Logger.debug(this.memoryMonitor.getReport());
            this.memoryMonitor.stopMonitoring();
            this.memoryMonitor = undefined;
        }

        // Cleanup HybridLLM if it has cleanup method
        if (this.pluginContext?.llmService) {
            (this.pluginContext.llmService as any).cleanup?.();
        }

        // Stop local LLM service using singleton destroy
        LlamaService.destroyInstance();

        Logger.debug('Ideatr plugin unloaded successfully');
    }

    async loadSettings() {
        const loadedData = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
        
        // Migrate legacy cloudApiKey to cloudApiKeys map if needed
        if (loadedData && 'cloudApiKey' in loadedData && loadedData.cloudApiKey && 
            (!this.settings.cloudApiKeys || Object.values(this.settings.cloudApiKeys).every(key => !key))) {
            // If we have a legacy API key and no keys in the new structure, migrate it
            const legacyKey = loadedData.cloudApiKey as string;
            const provider = (loadedData.cloudProvider || 'none') as string;
            
            if (legacyKey && provider !== 'none' && provider !== 'custom') {
                if (!this.settings.cloudApiKeys) {
                    this.settings.cloudApiKeys = {
                        anthropic: '',
                        openai: '',
                        gemini: '',
                        groq: '',
                        openrouter: ''
                    };
                }
                // Migrate the key to the appropriate provider
                if (provider === 'anthropic' || provider === 'openai' || provider === 'gemini' || 
                    provider === 'groq' || provider === 'openrouter') {
                    this.settings.cloudApiKeys[provider as keyof typeof this.settings.cloudApiKeys] = legacyKey;
                }
                // Save the migrated settings
                await this.saveSettings();
            }
        }
        
        // Ensure cloudApiKeys exists (for new installations)
        if (!this.settings.cloudApiKeys) {
            this.settings.cloudApiKeys = {
                anthropic: '',
                openai: '',
                gemini: '',
                groq: '',
                openrouter: ''
            };
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // Update LlamaService singleton with new settings
        if (this.localLLMService) {
            this.localLLMService.updateSettings(this.settings);
        }
    }

    /**
     * Add status indicator to the status bar
     */
    private addStatusBarIndicator(): void {
        this.statusBarItem = this.addStatusBarItem();
        this.updateStatusBarIndicator();

        // Update status indicator every 5 seconds
        this.statusUpdateInterval = window.setInterval(() => {
            this.updateStatusBarIndicator();
        }, 5000);
    }

    /**
     * Update the status bar indicator with current model status
     */
    private updateStatusBarIndicator(): void {
        if (!this.statusBarItem) return;

        // Clear existing content
        this.statusBarItem.empty();

        // Create and append new status indicator
        const statusIndicator = createModelStatusIndicator(
            this.pluginContext.llmService,
            this.settings,
            this.app
        );

        // Keep tooltip for status bar - it will show on hover
        // The title attribute provides a native fallback tooltip
        this.statusBarItem.appendChild(statusIndicator);
    }

    /**
     * Ensure tutorials are available in the vault by copying from plugin directory if needed
     */
    private async ensureTutorialsAvailable(): Promise<void> {
        try {
            // Get plugin directory
            const vaultBasePath = (this.app.vault.adapter as any).basePath || this.app.vault.configDir;
            const configDir = path.isAbsolute(this.app.vault.configDir)
                ? this.app.vault.configDir
                : path.join(vaultBasePath, this.app.vault.configDir);
            const pluginDir = path.resolve(path.join(configDir, 'plugins', this.manifest.id));

            const tutorialManager = new TutorialManager(this.app, pluginDir);

            // Check if tutorials exist in vault
            const tutorialsInVault = await tutorialManager.tutorialsExistInVault();

            // If not in vault, but available in plugin directory, copy them
            if (!tutorialsInVault) {
                const bundledAvailable = await tutorialManager.bundledTutorialsAvailable();
                if (bundledAvailable) {
                    Logger.info('Tutorials not found in vault, copying from plugin directory...');
                    await tutorialManager.resetTutorials();
                } else {
                    Logger.warn('Tutorial files not found in plugin directory. They may need to be manually restored.');
                }
            }
        } catch (error) {
            Logger.warn('Error ensuring tutorials are available:', error);
            // Don't show error to user, just log it
        }
    }
}
