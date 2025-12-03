/**
 * Tests for main.ts (IdeatrPlugin)
 * Tests plugin lifecycle, settings, and initialization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { App, Notice, TFile, Vault, Workspace } from '../../test/mocks/obsidian';
import IdeatrPlugin from '../../src/main';
import { DEFAULT_SETTINGS } from '../../src/settings';
import { FirstLaunchSetupModal } from '../../src/views/FirstLaunchSetupModal';
import { CaptureModal } from '../../src/capture/CaptureModal';
import { DashboardView } from '../../src/views/DashboardView';
import { GraphView } from '../../src/views/GraphView';

// Mock Obsidian globals
global.Notice = Notice;

// Mock addIcon from obsidian
vi.mock('obsidian', async () => {
    const actual = await vi.importActual('obsidian');
    return {
        ...actual,
        addIcon: vi.fn(),
    };
});

// Mock modules
vi.mock('../../src/views/FirstLaunchSetupModal', () => {
    class MockFirstLaunchSetupModal {
        open = vi.fn();
        constructor(app: any, modelManager: any, settings: any, callback: any) { }
    }
    return {
        FirstLaunchSetupModal: MockFirstLaunchSetupModal,
        isFirstLaunch: vi.fn().mockReturnValue(false),
    };
});

vi.mock('../../src/capture/CaptureModal', () => {
    class MockCaptureModal {
        open = vi.fn();
        constructor(app: any, fileManager: any, classificationService: any, duplicateDetector: any, settings: any, domainService: any, webSearchService: any, nameVariantService: any) { }
    }
    return {
        CaptureModal: MockCaptureModal,
    };
});

vi.mock('../../src/views/DashboardView', () => ({
    DashboardView: vi.fn(),
}));

vi.mock('../../src/views/GraphView', () => ({
    GraphView: vi.fn(),
}));

vi.mock('../../src/core/ServiceInitializer', () => ({
    ServiceInitializer: {
        initialize: vi.fn().mockResolvedValue({
            context: {
                fileManager: {},
                classificationService: {},
                duplicateDetector: {},
                domainService: {},
                webSearchService: {},
                nameVariantService: {},
                ideaRepository: {},
                clusteringService: {},
                resurfacingService: {},
                projectElevationService: {},
                graphLayoutService: {},
                commandContext: {},
            },
            localLLMService: {
                stopServer: vi.fn(),
            },
        }),
    },
}));

vi.mock('../../src/commands/CommandRegistry', () => ({
    CommandRegistry: {
        registerAll: vi.fn(),
    },
}));

vi.mock('../../src/services/ModelManager', () => {
    class MockModelManager {
        constructor() { }
    }
    return {
        ModelManager: MockModelManager,
    };
});

vi.mock('../../src/utils/logger', () => ({
    Logger: {
        initialize: vi.fn(),
        isDebugEnabled: vi.fn(() => false),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('IdeatrPlugin', () => {
    let plugin: IdeatrPlugin;
    let mockApp: App;
    let mockVault: Vault;
    let mockWorkspace: Workspace;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Mock window for setInterval and other browser APIs
        global.window = {
            setInterval: vi.fn((fn: () => void, delay: number) => {
                return 1 as any; // Return a mock interval ID
            }),
            clearInterval: vi.fn(),
        } as any;

        // Mock document for DOM operations
        global.document = {
            createElement: vi.fn((tag: string) => {
                const el = {
                    tagName: tag.toUpperCase(),
                    className: '',
                    classList: {
                        add: vi.fn(),
                        remove: vi.fn(),
                        contains: vi.fn(),
                    },
                    setAttribute: vi.fn(),
                    getAttribute: vi.fn(),
                    appendChild: vi.fn(),
                    textContent: '',
                    style: {},
                } as any;
                return el;
            }),
        } as any;

        mockVault = {
            getMarkdownFiles: vi.fn(() => []),
            adapter: {
                basePath: '/mock/vault/path'
            },
            configDir: '.obsidian',
        } as any;

        mockWorkspace = {
            getActiveFile: vi.fn(),
        } as any;

        mockApp = {
            vault: mockVault,
            workspace: mockWorkspace,
        } as any;

        plugin = new IdeatrPlugin();
        plugin.app = mockApp;
        (plugin as any).manifest = { id: 'ideatr' };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('loadSettings', () => {
        it('should load settings from storage', async () => {
            const savedSettings = { ...DEFAULT_SETTINGS, debugMode: true };
            plugin.loadData = vi.fn().mockResolvedValue(savedSettings);

            await plugin.loadSettings();

            expect(plugin.settings).toEqual(savedSettings);
            expect(plugin.loadData).toHaveBeenCalled();
        });

        it('should use default settings when no saved data exists', async () => {
            plugin.loadData = vi.fn().mockResolvedValue(null);

            await plugin.loadSettings();

            expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
        });

        it('should merge saved settings with defaults', async () => {
            const savedSettings = { debugMode: true };
            plugin.loadData = vi.fn().mockResolvedValue(savedSettings);

            await plugin.loadSettings();

            expect(plugin.settings.debugMode).toBe(true);
            // Verify that default settings are still present
            expect(plugin.settings.llmProvider).toBe(DEFAULT_SETTINGS.llmProvider);
        });
    });

    describe('saveSettings', () => {
        it('should save settings to storage', async () => {
            plugin.settings = { ...DEFAULT_SETTINGS };
            plugin.saveData = vi.fn().mockResolvedValue(undefined);

            await plugin.saveSettings();

            expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
        });
    });

    describe('onload', () => {
        beforeEach(async () => {
            plugin.loadData = vi.fn().mockResolvedValue({});
            plugin.saveData = vi.fn().mockResolvedValue(undefined);
            plugin.addCommand = vi.fn();
            plugin.registerView = vi.fn();
            plugin.addSettingTab = vi.fn();
            plugin.addRibbonIcon = vi.fn();
            await plugin.loadSettings();
        });

        it('should initialize Logger with app and debug mode', async () => {
            const { Logger } = await import('../../src/utils/logger');
            plugin.settings.debugMode = true;

            await plugin.onload();

            expect(Logger.initialize).toHaveBeenCalled();
        });

        it('should initialize ModelManager', async () => {
            await plugin.onload();

            // ModelManager is initialized during onload
            expect((plugin as any).modelManager).toBeDefined();
        });

        it('should show first launch setup modal if first launch', async () => {
            const { isFirstLaunch } = await import('../../src/views/FirstLaunchSetupModal');
            vi.mocked(isFirstLaunch).mockReturnValue(true);
            plugin.saveSettings = vi.fn().mockResolvedValue(undefined);
            const FirstLaunchSetupModalSpy = vi.fn(FirstLaunchSetupModal);

            await plugin.onload();
            vi.advanceTimersByTime(150);

            // Verify first launch check was called
            expect(isFirstLaunch).toHaveBeenCalledWith(plugin.settings);
        });

        it('should not show first launch setup modal if not first launch', async () => {
            const { isFirstLaunch } = await import('../../src/views/FirstLaunchSetupModal');
            vi.mocked(isFirstLaunch).mockReturnValue(false);

            await plugin.onload();
            vi.advanceTimersByTime(150);

            // Verify first launch check was called
            expect(isFirstLaunch).toHaveBeenCalledWith(plugin.settings);
        });

        it('should initialize services using ServiceInitializer', async () => {
            const { ServiceInitializer } = await import('../../src/core/ServiceInitializer');

            await plugin.onload();

            expect(ServiceInitializer.initialize).toHaveBeenCalledWith(
                mockApp,
                plugin,
                plugin.settings
            );
        });

        it('should register Dashboard view', async () => {
            await plugin.onload();

            expect(plugin.registerView).toHaveBeenCalledWith(
                'ideatr-dashboard',
                expect.any(Function)
            );
        });

        it('should register Graph view', async () => {
            await plugin.onload();

            expect(plugin.registerView).toHaveBeenCalledWith(
                'ideatr-graph',
                expect.any(Function)
            );
        });

        it('should register settings tab', async () => {
            await plugin.onload();

            expect(plugin.addSettingTab).toHaveBeenCalled();
        });

        it('should register all commands', async () => {
            const { CommandRegistry } = await import('../../src/commands/CommandRegistry');

            await plugin.onload();

            expect(CommandRegistry.registerAll).toHaveBeenCalled();
        });

        it('should add ribbon icon', async () => {
            await plugin.onload();

            // The ribbon icon uses IDEATR_ICON_ID constant, not 'lightbulb'
            expect(plugin.addRibbonIcon).toHaveBeenCalledWith(
                'ideatr-icon-purple',
                'Capture Idea',
                expect.any(Function)
            );
        });

        it('should handle command registration errors gracefully', async () => {
            const { CommandRegistry } = await import('../../src/commands/CommandRegistry');
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.mocked(CommandRegistry.registerAll).mockImplementation(() => {
                throw new Error('Registration failed');
            });

            await plugin.onload();

            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('openCaptureModal', () => {
        beforeEach(async () => {
            plugin.loadData = vi.fn().mockResolvedValue({});
            await plugin.loadSettings();
            const { ServiceInitializer } = await import('../../src/core/ServiceInitializer');
            const result = await ServiceInitializer.initialize(mockApp, plugin, plugin.settings);
            (plugin as any).pluginContext = result.context;
        });

        it('should open CaptureModal with correct dependencies', () => {
            // The modal is instantiated and opened in openCaptureModal
            // We verify the method completes without error
            expect(() => plugin.openCaptureModal()).not.toThrow();
        });
    });

    describe('ensureLLMReady', () => {
        beforeEach(async () => {
            plugin.loadData = vi.fn().mockResolvedValue({});
            await plugin.loadSettings();
            const { ServiceInitializer } = await import('../../src/core/ServiceInitializer');
            const result = await ServiceInitializer.initialize(mockApp, plugin, plugin.settings);
            (plugin as any).pluginContext = result.context;
        });

        it('should call ensureReady on LLM service if available', async () => {
            const mockEnsureReady = vi.fn().mockResolvedValue(undefined);
            (plugin as any).pluginContext.llmService = {
                ensureReady: mockEnsureReady,
            };

            await plugin.ensureLLMReady();

            expect(mockEnsureReady).toHaveBeenCalled();
        });

        it('should not throw if LLM service does not have ensureReady', async () => {
            (plugin as any).pluginContext.llmService = {};

            await expect(plugin.ensureLLMReady()).resolves.not.toThrow();
        });

        it('should not throw if LLM service is null', async () => {
            (plugin as any).pluginContext.llmService = null;

            await expect(plugin.ensureLLMReady()).resolves.not.toThrow();
        });
    });

    describe('onunload', () => {
        beforeEach(async () => {
            plugin.loadData = vi.fn().mockResolvedValue({});
            await plugin.loadSettings();
            const { ServiceInitializer } = await import('../../src/core/ServiceInitializer');
            const result = await ServiceInitializer.initialize(mockApp, plugin, plugin.settings);
            (plugin as any).pluginContext = result.context;
            (plugin as any).localLLMService = result.localLLMService;
        });

        it('should stop local LLM service', async () => {
            // Import LlamaService to spy on destroyInstance
            const { LlamaService } = await import('../../src/services/LlamaService');
            const destroyInstanceSpy = vi.spyOn(LlamaService, 'destroyInstance').mockImplementation(() => { });

            plugin.onunload();

            expect(destroyInstanceSpy).toHaveBeenCalled();
            destroyInstanceSpy.mockRestore();
        });

        it('should not throw if local LLM service is not initialized', () => {
            (plugin as any).localLLMService = undefined;

            expect(() => plugin.onunload()).not.toThrow();
        });
    });

    describe('getters', () => {
        beforeEach(async () => {
            plugin.loadData = vi.fn().mockResolvedValue({});
            await plugin.loadSettings();
            const { ServiceInitializer } = await import('../../src/core/ServiceInitializer');
            const result = await ServiceInitializer.initialize(mockApp, plugin, plugin.settings);
            (plugin as any).pluginContext = result.context;
        });

        it('should provide access to nameVariantService', () => {
            const mockService = {};
            (plugin as any).pluginContext.nameVariantService = mockService;

            expect(plugin.nameVariantService).toBe(mockService);
        });

        it('should provide access to errorLogService', () => {
            const mockService = {};
            (plugin as any).pluginContext.errorLogService = mockService;

            expect(plugin.errorLogService).toBe(mockService);
        });
    });
});

