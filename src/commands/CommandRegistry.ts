import type { Plugin } from 'obsidian';
import { Notice } from 'obsidian';
import { CommandContext } from './base/CommandContext';
import { CaptureCommand } from './capture/CaptureCommand';
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
                const noticeEl = (loadingNotice as any).noticeEl as HTMLElement;
                if (noticeEl) {
                    // Add spinner class for CSS animation
                    const spinnerSpan = noticeEl.createSpan({ cls: 'ideatr-loading-spinner' });
                    spinnerSpan.textContent = '⏳';
                    spinnerSpan.style.marginRight = '6px';
                    spinnerSpan.style.display = 'inline-block';
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
     */
    static registerAll(plugin: Plugin, context: CommandContext): void {
        Logger.debug('Registering commands...');
        
        // Capture commands
        const captureCallback = CommandRegistry.createCommandCallback('Capture Idea', () => new CaptureCommand(context).execute());
        plugin.addCommand({
            id: 'capture-idea',
            name: 'Capture Idea',
            callback: captureCallback
        });
        Logger.debug('Registered: Capture Idea');

        // Validation commands
        // Domain checking command hidden - functionality removed
        // plugin.addCommand({
        //     id: 'check-domains',
        //     name: 'Check Domains',
        //     callback: CommandRegistry.createCommandCallback('Check Domains', () => new DomainCheckCommand(context).execute())
        // });

        plugin.addCommand({
            id: 'search-existence',
            name: 'Search Existence',
            callback: CommandRegistry.createCommandCallback('Search Existence', () => new ExistenceSearchCommand(context).execute())
        });

        plugin.addCommand({
            id: 'check-duplicates',
            name: 'Check Duplicates',
            callback: CommandRegistry.createCommandCallback('Check Duplicates', () => new DuplicateCheckCommand(context).execute())
        });

        plugin.addCommand({
            id: 'find-related-notes',
            name: 'Find Related Notes',
            callback: CommandRegistry.createCommandCallback('Find Related Notes', () => new RelatedNotesCommand(context).execute())
        });

        plugin.addCommand({
            id: 'quick-validate',
            name: 'Quick Validate',
            callback: CommandRegistry.createCommandCallback('Quick Validate', () => new QuickValidateCommand(context).execute())
        });

        // Transformation commands
        const nameVariantCallback = CommandRegistry.createCommandCallback('Generate Name Variants', () => new NameVariantCommand(context).execute());
        Logger.debug('Created nameVariantCallback, type:', typeof nameVariantCallback);
        plugin.addCommand({
            id: 'generate-name-variants',
            name: 'Generate Name Variants',
            callback: nameVariantCallback
        });
        Logger.debug('Registered: Generate Name Variants');

        plugin.addCommand({
            id: 'generate-scaffold',
            name: 'Generate Scaffold',
            callback: CommandRegistry.createCommandCallback('Generate Scaffold', () => new ScaffoldCommand(context).execute())
        });

        plugin.addCommand({
            id: 'generate-mutations',
            name: 'Generate Mutations',
            callback: CommandRegistry.createCommandCallback('Generate Mutations', () => new MutationCommand(context).execute())
        });

        const expandCallback = CommandRegistry.createCommandCallback('Expand Idea', () => new ExpandCommand(context).execute());
        Logger.debug('Created expandCallback, type:', typeof expandCallback, 'is function:', typeof expandCallback === 'function');
        plugin.addCommand({
            id: 'expand-idea',
            name: 'Expand Idea',
            callback: expandCallback
        });
        Logger.debug('Registered: Expand Idea, callback stored:', typeof expandCallback);

        plugin.addCommand({
            id: 'reorganize-idea',
            name: 'Reorganize Idea',
            callback: CommandRegistry.createCommandCallback('Reorganize Idea', () => new ReorganizeCommand(context).execute())
        });

        plugin.addCommand({
            id: 'guided-ideation',
            name: 'Transform',
            callback: CommandRegistry.createCommandCallback('Transform', () => new GuidedIdeationCommand(context).execute())
        });

        // Lifecycle commands
        plugin.addCommand({
            id: 'change-status',
            name: 'Change Status',
            callback: CommandRegistry.createCommandCallback('Change Status', () => new StatusCommand(context).execute())
        });

        plugin.addCommand({
            id: 'archive-idea',
            name: 'Archive Idea',
            callback: CommandRegistry.createCommandCallback('Archive Idea', () => new ArchiveCommand(context, true).execute())
        });

        plugin.addCommand({
            id: 'unarchive-idea',
            name: 'Unarchive Idea',
            callback: CommandRegistry.createCommandCallback('Unarchive Idea', () => new ArchiveCommand(context, false).execute())
        });

        plugin.addCommand({
            id: 'add-codename',
            name: 'Generate Codename',
            callback: CommandRegistry.createCommandCallback('Generate Codename', () => new CodenameCommand(context).execute())
        });

        // View commands
        plugin.addCommand({
            id: 'open-dashboard',
            name: 'Open Dashboard',
            callback: CommandRegistry.createCommandCallback('Open Dashboard', () => new DashboardCommand(context).execute())
        });

        plugin.addCommand({
            id: 'open-graph',
            name: 'Open Graph View',
            callback: CommandRegistry.createCommandCallback('Open Graph View', () => new GraphViewCommand(context).execute())
        });

        plugin.addCommand({
            id: 'open-tutorials',
            name: 'Open Tutorials',
            callback: CommandRegistry.createCommandCallback('Open Tutorials', () => new OpenTutorialsCommand(context).execute())
        });

        // Management commands
        plugin.addCommand({
            id: 'classify-current-note',
            name: 'Classify Current Note',
            callback: CommandRegistry.createCommandCallback('Classify Current Note', () => new ClassifyCurrentNoteCommand(context).execute())
        });

        plugin.addCommand({
            id: 'refresh-idea',
            name: 'Refresh Idea',
            callback: CommandRegistry.createCommandCallback('Refresh Idea', () => new RefreshIdeaCommand(context).execute())
        });

        plugin.addCommand({
            id: 'export-ideas',
            name: 'Export Ideas',
            callback: CommandRegistry.createCommandCallback('Export Ideas', () => new ExportCommand(context).execute())
        });

        plugin.addCommand({
            id: 'import-ideas',
            name: 'Import Ideas',
            callback: CommandRegistry.createCommandCallback('Import Ideas', () => new ImportCommand(context).execute())
        });

        plugin.addCommand({
            id: 'generate-digest',
            name: 'Generate Weekly Digest',
            callback: CommandRegistry.createCommandCallback('Generate Weekly Digest', () => new DigestCommand(context).execute())
        });

        plugin.addCommand({
            id: 'elevate-to-project',
            name: 'Elevate to Project',
            callback: CommandRegistry.createCommandCallback('Elevate to Project', () => new ElevateToProjectCommand(context).execute())
        });

        // Batch operations commands
        plugin.addCommand({
            id: 'reclassify-all-ideas',
            name: 'Reclassify All Ideas',
            callback: CommandRegistry.createCommandCallback('Reclassify All Ideas', () => new ReclassifyAllCommand(context).execute())
        });

        plugin.addCommand({
            id: 'find-all-duplicates',
            name: 'Find All Duplicates',
            callback: CommandRegistry.createCommandCallback('Find All Duplicates', () => new FindAllDuplicatesCommand(context).execute())
        });

        plugin.addCommand({
            id: 'refresh-all-related-notes',
            name: 'Refresh All Related Notes',
            callback: CommandRegistry.createCommandCallback('Refresh All Related Notes', () => new RefreshRelatedNotesCommand(context).execute())
        });

        // Analysis commands
        plugin.addCommand({
            id: 'find-tenuous-links',
            name: 'Find Tenuous Links',
            callback: CommandRegistry.createCommandCallback('Find Tenuous Links', () => new TenuousLinksCommand(context).execute())
        });

        plugin.addCommand({
            id: 'analyze-idea-cluster',
            name: 'Analyze Idea Cluster',
            callback: CommandRegistry.createCommandCallback('Analyze Idea Cluster', () => new ClusterAnalysisCommand(context).execute())
        });

        plugin.addCommand({
            id: 'show-idea-stats',
            name: 'Show Idea Statistics',
            callback: CommandRegistry.createCommandCallback('Show Idea Statistics', () => new IdeaStatsCommand(context).execute())
        });

        // DEBUG: Add a test command via CommandRegistry (only in debug mode)
        if (Logger.isDebugEnabled()) {
            const debugCallback = CommandRegistry.createCommandCallback('Ideatr Debug (Registry)', async () => {
                Logger.debug('[Ideatr DEBUG REGISTRY] Command operation executed!');
                Logger.info('DEBUG REGISTRY: Command executed successfully');
                new Notice('Ideatr Debug (Registry) command executed - check console');
            });
            Logger.debug('Debug registry callback type:', typeof debugCallback);
            plugin.addCommand({
                id: 'debug-registry',
                name: 'Debug (Registry)',
                callback: debugCallback
            });
            Logger.debug('Registered debug command via CommandRegistry');
        }
    }
}

