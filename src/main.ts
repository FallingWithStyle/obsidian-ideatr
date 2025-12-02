import { Plugin, Notice } from 'obsidian';
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

    // Public properties for settings modal access
    get nameVariantService(): NameVariantService {
        return this.pluginContext.nameVariantService;
    }

    get errorLogService(): ErrorLogService {
        return this.pluginContext.errorLogService;
    }

    async onload() {
        await this.loadSettings();

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

            // Add ribbon icon
            this.addRibbonIcon('lightbulb', 'Capture Idea', () => {
                this.openCaptureModal();
            });

            Logger.debug('All commands registered successfully');
            console.log('[Ideatr] Commands registered successfully');
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
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
        this.statusBarItem.innerHTML = '';

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
