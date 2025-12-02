import type { Plugin } from 'obsidian';
import { CommandContext } from './base/CommandContext';
import { CaptureCommand } from './capture/CaptureCommand';
import { DomainCheckCommand } from './validation/DomainCheckCommand';
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
     */
    private static createCommandCallback(commandName: string, operation: () => Promise<void>): () => Promise<void> {
        return async () => {
            // Use console.log here to ensure it always shows, even if Logger isn't working
            console.log(`[Ideatr] Callback invoked for: ${commandName}`);
            try {
                await CommandRegistry.safeExecute(commandName, operation);
            } catch (error) {
                console.error(`[Ideatr] Callback error for ${commandName}:`, error);
                Logger.error(`Callback error for ${commandName}:`, error);
            }
        };
    }

    /**
     * Safely execute a command with error handling
     */
    private static async safeExecute(commandName: string, operation: () => Promise<void>): Promise<void> {
        // Use console.log here to ensure it always shows, even if Logger isn't working
        console.log(`[Ideatr] Starting command: ${commandName}`);
        Logger.info(`Starting command: ${commandName}`);
        try {
            await operation();
            console.log(`[Ideatr] Finished command: ${commandName}`);
            Logger.info(`Finished command: ${commandName}`);
        } catch (error) {
            console.error(`[Ideatr] Command '${commandName}' failed:`, error);
            Logger.error(`Command '${commandName}' failed:`, error);
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
        // Capture commands
        plugin.addCommand({
            id: 'capture-idea',
            name: 'Capture Idea',
            callback: CommandRegistry.createCommandCallback('Capture Idea', () => new CaptureCommand(context).execute())
        });

        // Validation commands
        plugin.addCommand({
            id: 'check-domains',
            name: 'Check Domains',
            callback: CommandRegistry.createCommandCallback('Check Domains', () => new DomainCheckCommand(context).execute())
        });

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
        plugin.addCommand({
            id: 'generate-name-variants',
            name: 'Generate Name Variants',
            callback: CommandRegistry.createCommandCallback('Generate Name Variants', () => new NameVariantCommand(context).execute())
        });

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

        plugin.addCommand({
            id: 'expand-idea',
            name: 'Expand Idea',
            callback: CommandRegistry.createCommandCallback('Expand Idea', () => new ExpandCommand(context).execute())
        });

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
    }
}

