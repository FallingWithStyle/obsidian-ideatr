import type { Plugin } from 'obsidian';
import { Notice } from 'obsidian';
import { CommandContext } from './base/CommandContext';
import { CaptureCommand } from './capture/CaptureCommand';
// ===== MVP VERSION - EXTRA IMPORTS COMMENTED OUT =====
// All extra command imports are commented out since they're not used in MVP
// To re-enable, uncomment the imports and the corresponding command registrations below
/*
// Domain checking removed - functionality hidden
// import { DomainCheckCommand } from './validation/DomainCheckCommand';
import { ExistenceSearchCommand } from './validation/ExistenceSearchCommand';
import { DuplicateCheckCommand } from './validation/DuplicateCheckCommand';
import { RelatedNotesCommand } from './validation/RelatedNotesCommand';
import { QuickValidateCommand } from './validation/QuickValidateCommand';
import { NameVariantCommand } from './transformation/NameVariantCommand';
import { ScaffoldCommand } from './transformation/ScaffoldCommand';
import { MutationCommand } from './transformation/MutationCommand';
import { ExpandCommand } from './transformation/ExpandCommand';
import { ReorganizeCommand } from './transformation/ReorganizeCommand';
import { GuidedIdeationCommand } from './transformation/GuidedIdeationCommand';
import { StatusCommand } from './lifecycle/StatusCommand';
import { ArchiveCommand } from './lifecycle/ArchiveCommand';
import { CodenameCommand } from './lifecycle/CodenameCommand';
import { DashboardCommand } from './views/DashboardCommand';
import { GraphViewCommand } from './views/GraphViewCommand';
import { OpenTutorialsCommand } from './views/OpenTutorialsCommand';
import { ClassifyCurrentNoteCommand } from './management/ClassifyCurrentNoteCommand';
import { RefreshIdeaCommand } from './management/RefreshIdeaCommand';
import { ExportCommand } from './management/ExportCommand';
import { ImportCommand } from './management/ImportCommand';
import { DigestCommand } from './management/DigestCommand';
import { ElevateToProjectCommand } from './management/ElevateToProjectCommand';
import { ReclassifyAllCommand } from './batch/ReclassifyAllCommand';
import { FindAllDuplicatesCommand } from './batch/FindAllDuplicatesCommand';
import { RefreshRelatedNotesCommand } from './batch/RefreshRelatedNotesCommand';
import { TenuousLinksCommand } from './analysis/TenuousLinksCommand';
import { ClusterAnalysisCommand } from './analysis/ClusterAnalysisCommand';
import { IdeaStatsCommand } from './analysis/IdeaStatsCommand';
*/

import { Logger } from '../utils/logger';

/**
 * Centralized command registration
 * Registers all plugin commands with Obsidian
 */
export class CommandRegistry {
    /**
     * Create a command callback that safely executes a command
     * Obsidian supports both sync and async callbacks
     */
    private static createCommandCallback(commandName: string, operation: () => Promise<void>): () => void | Promise<void> {
        // Return an async function that Obsidian can call
        // Obsidian should handle the Promise automatically
        const callback = async () => {
            Logger.info(`Callback invoked for: ${commandName}`);
            Logger.debug(`Callback stack trace:`, new Error().stack);
            try {
                Logger.debug(`About to call operation for: ${commandName}`);
                await CommandRegistry.safeExecute(commandName, operation);
                Logger.debug(`Operation completed for: ${commandName}`);
            } catch (error) {
                console.error(`[Ideatr] Callback error for ${commandName}:`, error);
                Logger.error(`Callback error for ${commandName}:`, error);
            }
        };

        // Verify the callback is a function
        if (typeof callback !== 'function') {
            console.error(`[Ideatr] ERROR: Callback for ${commandName} is not a function! Type: ${typeof callback}`);
            Logger.error(`Callback for ${commandName} is not a function! Type: ${typeof callback}`);
        }

        return callback;
    }

    /**
     * Safely execute a command with error handling
     */
    private static async safeExecute(commandName: string, operation: () => Promise<void>): Promise<void> {
        Logger.info(`Starting command: ${commandName}`);

        // Show visual loading indicator with spinner
        // Create notice first - this should always work
        let loadingNotice: Notice | null = null;
        try {
            loadingNotice = new Notice(`⏳ Processing ${commandName}...`, 0); // 0 = don't auto-hide
            Logger.debug(`Created loading notice for: ${commandName}`);

            // Try to add spinner styling (optional enhancement)
            try {
                // Access noticeEl via type-safe property access
                // Notice class has a noticeEl property but it's not in the public API
                const noticeEl = (loadingNotice as Notice & { noticeEl?: HTMLElement }).noticeEl;
                if (noticeEl) {
                    // Add spinner class for CSS animation
                    const spinnerSpan = noticeEl.createSpan({ cls: 'ideatr-loading-spinner' });
                    spinnerSpan.textContent = '⏳';
                    spinnerSpan.addClass('ideatr-loading-spinner');
                }
            } catch (spinnerError) {
                // If we can't access notice element, that's okay - the emoji will still show
                Logger.debug(`Could not add spinner to notice (non-critical):`, spinnerError);
            }
        } catch (noticeError) {
            // If Notice creation fails, log it but continue
            console.error(`[Ideatr] Failed to create loading notice for ${commandName}:`, noticeError);
            Logger.error(`Failed to create loading notice for ${commandName}:`, noticeError);
        }

        try {
            Logger.debug(`Executing operation for: ${commandName}`);
            await operation();
            Logger.info(`Finished command: ${commandName}`);

            // Hide loading notice and show success
            if (loadingNotice) {
                loadingNotice.hide();
            }
            new Notice(`✓ ${commandName} completed`, 2000);
        } catch (error) {
            console.error(`[Ideatr] Command '${commandName}' failed:`, error);
            Logger.error(`Command '${commandName}' failed:`, error);

            // Hide loading notice (error notice will be shown by BaseCommand.handleError)
            if (loadingNotice) {
                loadingNotice.hide();
            }

            // We don't show a Notice here because BaseCommand.handleError might have already shown one.
            // But if the constructor failed, BaseCommand wasn't instantiated.
            // So we should check if it's a critical failure that wasn't handled.
            // For now, logging is the most important part for troubleshooting.
        }
    }

    /**
     * Register all commands with the plugin
     * MVP VERSION - Only core capture functionality enabled
     */
    static registerAll(plugin: Plugin, context: CommandContext): void {
        Logger.debug('Registering commands (MVP mode - core capture only)...');

        // ===== CORE MVP COMMANDS =====
        // Capture commands - PRIMARY FEATURE
        const captureCallback = CommandRegistry.createCommandCallback('Capture idea', async () => await new CaptureCommand(context).execute());
        plugin.addCommand({
            id: 'capture-idea',
            name: 'Capture idea',
            callback: captureCallback
        });
        Logger.debug('Registered: Capture idea');

        // ===== EXTRA FEATURES DISABLED FOR MVP =====
        // The following features are disabled to focus on core MVP:
        // - Validation tools (domain check, web search, duplicates, related notes)
        // - Transformation tools (name variants, scaffolds, mutations, expand, reorganize, guided ideation)
        // - Lifecycle management (status, archive, codename)
        // - Views (dashboard, graph, tutorials)
        // - Management commands (classify, refresh, export, import, digest, elevate)
        // - Batch operations (reclassify all, find all duplicates, refresh all)
        // - Analysis commands (tenuous links, cluster analysis, statistics)
        //
        // To re-enable these features, uncomment the sections below:

        /*
        // Validation commands
        plugin.addCommand({
            id: 'search-existence',
            name: 'Search existence',
            callback: CommandRegistry.createCommandCallback('Search existence', async () => await new ExistenceSearchCommand(context).execute())
        });

        plugin.addCommand({
            id: 'check-duplicates',
            name: 'Check duplicates',
            callback: CommandRegistry.createCommandCallback('Check duplicates', async () => await new DuplicateCheckCommand(context).execute())
        });

        plugin.addCommand({
            id: 'find-related-notes',
            name: 'Find related notes',
            callback: CommandRegistry.createCommandCallback('Find related notes', async () => await new RelatedNotesCommand(context).execute())
        });

        plugin.addCommand({
            id: 'quick-validate',
            name: 'Quick validate',
            callback: CommandRegistry.createCommandCallback('Quick validate', async () => await new QuickValidateCommand(context).execute())
        });

        // Transformation commands
        const nameVariantCallback = CommandRegistry.createCommandCallback('Generate name variants', async () => await new NameVariantCommand(context).execute());
        plugin.addCommand({
            id: 'generate-name-variants',
            name: 'Generate name variants',
            callback: nameVariantCallback
        });

        plugin.addCommand({
            id: 'generate-scaffold',
            name: 'Generate scaffold',
            callback: CommandRegistry.createCommandCallback('Generate scaffold', async () => await new ScaffoldCommand(context).execute())
        });

        plugin.addCommand({
            id: 'generate-mutations',
            name: 'Generate mutations',
            callback: CommandRegistry.createCommandCallback('Generate mutations', async () => await new MutationCommand(context).execute())
        });

        const expandCallback = CommandRegistry.createCommandCallback('Expand idea', async () => await new ExpandCommand(context).execute());
        plugin.addCommand({
            id: 'expand-idea',
            name: 'Expand idea',
            callback: expandCallback
        });

        plugin.addCommand({
            id: 'reorganize-idea',
            name: 'Reorganize idea',
            callback: CommandRegistry.createCommandCallback('Reorganize idea', async () => await new ReorganizeCommand(context).execute())
        });

        plugin.addCommand({
            id: 'guided-ideation',
            name: 'Transform',
            callback: CommandRegistry.createCommandCallback('Transform', async () => await new GuidedIdeationCommand(context).execute())
        });

        // Lifecycle commands
        plugin.addCommand({
            id: 'change-status',
            name: 'Change status',
            callback: CommandRegistry.createCommandCallback('Change status', async () => await new StatusCommand(context).execute())
        });

        plugin.addCommand({
            id: 'archive-idea',
            name: 'Archive idea',
            callback: CommandRegistry.createCommandCallback('Archive idea', async () => await new ArchiveCommand(context, true).execute())
        });

        plugin.addCommand({
            id: 'unarchive-idea',
            name: 'Unarchive idea',
            callback: CommandRegistry.createCommandCallback('Unarchive idea', async () => await new ArchiveCommand(context, false).execute())
        });

        plugin.addCommand({
            id: 'add-codename',
            name: 'Generate codename',
            callback: CommandRegistry.createCommandCallback('Generate codename', async () => await new CodenameCommand(context).execute())
        });

        // View commands
        plugin.addCommand({
            id: 'open-dashboard',
            name: 'Open dashboard',
            callback: CommandRegistry.createCommandCallback('Open dashboard', async () => await new DashboardCommand(context).execute())
        });

        plugin.addCommand({
            id: 'open-graph',
            name: 'Open graph view',
            callback: CommandRegistry.createCommandCallback('Open graph view', async () => await new GraphViewCommand(context).execute())
        });

        plugin.addCommand({
            id: 'open-tutorials',
            name: 'Open tutorials',
            callback: CommandRegistry.createCommandCallback('Open tutorials', async () => await new OpenTutorialsCommand(context).execute())
        });

        // Management commands
        plugin.addCommand({
            id: 'classify-current-note',
            name: 'Classify current note',
            callback: CommandRegistry.createCommandCallback('Classify current note', async () => await new ClassifyCurrentNoteCommand(context).execute())
        });

        plugin.addCommand({
            id: 'refresh-idea',
            name: 'Refresh idea',
            callback: CommandRegistry.createCommandCallback('Refresh idea', async () => await new RefreshIdeaCommand(context).execute())
        });

        plugin.addCommand({
            id: 'export-ideas',
            name: 'Export ideas',
            callback: CommandRegistry.createCommandCallback('Export ideas', async () => await new ExportCommand(context).execute())
        });

        plugin.addCommand({
            id: 'import-ideas',
            name: 'Import ideas',
            callback: CommandRegistry.createCommandCallback('Import ideas', async () => await new ImportCommand(context).execute())
        });

        plugin.addCommand({
            id: 'generate-digest',
            name: 'Generate weekly digest',
            callback: CommandRegistry.createCommandCallback('Generate weekly digest', async () => await new DigestCommand(context).execute())
        });

        plugin.addCommand({
            id: 'elevate-to-project',
            name: 'Elevate to project',
            callback: CommandRegistry.createCommandCallback('Elevate to project', async () => await new ElevateToProjectCommand(context).execute())
        });

        // Batch operations commands
        plugin.addCommand({
            id: 'reclassify-all-ideas',
            name: 'Reclassify all ideas',
            callback: CommandRegistry.createCommandCallback('Reclassify all ideas', async () => await new ReclassifyAllCommand(context).execute())
        });

        plugin.addCommand({
            id: 'find-all-duplicates',
            name: 'Find all duplicates',
            callback: CommandRegistry.createCommandCallback('Find all duplicates', async () => await new FindAllDuplicatesCommand(context).execute())
        });

        plugin.addCommand({
            id: 'refresh-all-related-notes',
            name: 'Refresh all related notes',
            callback: CommandRegistry.createCommandCallback('Refresh all related notes', async () => await new RefreshRelatedNotesCommand(context).execute())
        });

        // Analysis commands
        plugin.addCommand({
            id: 'find-tenuous-links',
            name: 'Find tenuous links',
            callback: CommandRegistry.createCommandCallback('Find tenuous links', async () => await new TenuousLinksCommand(context).execute())
        });

        plugin.addCommand({
            id: 'analyze-idea-cluster',
            name: 'Analyze idea cluster',
            callback: CommandRegistry.createCommandCallback('Analyze idea cluster', async () => await new ClusterAnalysisCommand(context).execute())
        });

        plugin.addCommand({
            id: 'show-idea-stats',
            name: 'Show idea statistics',
            callback: CommandRegistry.createCommandCallback('Show idea statistics', async () => await new IdeaStatsCommand(context).execute())
        });
        */

        // DEBUG: Add a test command via CommandRegistry (only in debug mode)
        if (Logger.isDebugEnabled()) {
            // Note: This callback is async to satisfy createCommandCallback's signature (() => Promise<void>),
            // even though it doesn't contain any await expressions
            const debugCallback = CommandRegistry.createCommandCallback('Ideatr Debug (Registry)', () => {
                Logger.debug('[Ideatr DEBUG REGISTRY] Command operation executed!');
                Logger.info('DEBUG REGISTRY: Command executed successfully');
                new Notice('Ideatr debug (registry) command executed - check console');
                return Promise.resolve();
            });
            Logger.debug('Debug registry callback type:', typeof debugCallback);
            plugin.addCommand({
                id: 'debug-registry',
                name: 'Debug (registry)',
                callback: debugCallback
            });
            Logger.debug('Registered debug command via CommandRegistry');
        }

        Logger.info('Command registration complete - MVP mode (only Capture idea enabled)');
    }
}

