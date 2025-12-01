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
import { StatusCommand } from './lifecycle/StatusCommand';
import { ArchiveCommand } from './lifecycle/ArchiveCommand';
import { CodenameCommand } from './lifecycle/CodenameCommand';
import { DashboardCommand } from './views/DashboardCommand';
import { GraphViewCommand } from './views/GraphViewCommand';
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

/**
 * Centralized command registration
 * Registers all plugin commands with Obsidian
 */
export class CommandRegistry {
    /**
     * Register all commands with the plugin
     */
    static registerAll(plugin: Plugin, context: CommandContext): void {
        // Capture commands
        plugin.addCommand({
            id: 'capture-idea',
            name: 'Capture Idea',
            callback: () => new CaptureCommand(context).execute()
        });

        // Validation commands
        plugin.addCommand({
            id: 'check-domains',
            name: 'Check Domains',
            callback: () => new DomainCheckCommand(context).execute()
        });

        plugin.addCommand({
            id: 'search-existence',
            name: 'Search Existence',
            callback: () => new ExistenceSearchCommand(context).execute()
        });

        plugin.addCommand({
            id: 'check-duplicates',
            name: 'Check Duplicates',
            callback: () => new DuplicateCheckCommand(context).execute()
        });

        plugin.addCommand({
            id: 'find-related-notes',
            name: 'Find Related Notes',
            callback: () => new RelatedNotesCommand(context).execute()
        });

        plugin.addCommand({
            id: 'quick-validate',
            name: 'Quick Validate',
            callback: () => new QuickValidateCommand(context).execute()
        });

        // Transformation commands
        plugin.addCommand({
            id: 'generate-name-variants',
            name: 'Generate Name Variants',
            callback: () => new NameVariantCommand(context).execute()
        });

        plugin.addCommand({
            id: 'generate-scaffold',
            name: 'Generate Scaffold',
            callback: () => new ScaffoldCommand(context).execute()
        });

        plugin.addCommand({
            id: 'generate-mutations',
            name: 'Generate Mutations',
            callback: () => new MutationCommand(context).execute()
        });

        plugin.addCommand({
            id: 'expand-idea',
            name: 'Expand Idea',
            callback: () => new ExpandCommand(context).execute()
        });

        plugin.addCommand({
            id: 'reorganize-idea',
            name: 'Reorganize Idea',
            callback: () => new ReorganizeCommand(context).execute()
        });

        // Lifecycle commands
        plugin.addCommand({
            id: 'change-status',
            name: 'Change Status',
            callback: () => new StatusCommand(context).execute()
        });

        plugin.addCommand({
            id: 'archive-idea',
            name: 'Archive Idea',
            callback: () => new ArchiveCommand(context, true).execute()
        });

        plugin.addCommand({
            id: 'unarchive-idea',
            name: 'Unarchive Idea',
            callback: () => new ArchiveCommand(context, false).execute()
        });

        plugin.addCommand({
            id: 'add-codename',
            name: 'Generate Codename',
            callback: () => new CodenameCommand(context).execute()
        });

        // View commands
        plugin.addCommand({
            id: 'open-dashboard',
            name: 'Open Dashboard',
            callback: () => new DashboardCommand(context).execute()
        });

        plugin.addCommand({
            id: 'open-graph',
            name: 'Open Graph View',
            callback: () => new GraphViewCommand(context).execute()
        });

        // Management commands
        plugin.addCommand({
            id: 'classify-current-note',
            name: 'Classify Current Note',
            callback: () => new ClassifyCurrentNoteCommand(context).execute()
        });

        plugin.addCommand({
            id: 'refresh-idea',
            name: 'Refresh Idea',
            callback: () => new RefreshIdeaCommand(context).execute()
        });

        plugin.addCommand({
            id: 'export-ideas',
            name: 'Export Ideas',
            callback: () => new ExportCommand(context).execute()
        });

        plugin.addCommand({
            id: 'import-ideas',
            name: 'Import Ideas',
            callback: () => new ImportCommand(context).execute()
        });

        plugin.addCommand({
            id: 'generate-digest',
            name: 'Generate Weekly Digest',
            callback: () => new DigestCommand(context).execute()
        });

        plugin.addCommand({
            id: 'elevate-to-project',
            name: 'Elevate to Project',
            callback: () => new ElevateToProjectCommand(context).execute()
        });

        // Batch operations commands
        plugin.addCommand({
            id: 'reclassify-all-ideas',
            name: 'Reclassify All Ideas',
            callback: () => new ReclassifyAllCommand(context).execute()
        });

        plugin.addCommand({
            id: 'find-all-duplicates',
            name: 'Find All Duplicates',
            callback: () => new FindAllDuplicatesCommand(context).execute()
        });

        plugin.addCommand({
            id: 'refresh-all-related-notes',
            name: 'Refresh All Related Notes',
            callback: () => new RefreshRelatedNotesCommand(context).execute()
        });

        // Analysis commands
        plugin.addCommand({
            id: 'find-tenuous-links',
            name: 'Find Tenuous Links',
            callback: () => new TenuousLinksCommand(context).execute()
        });

        plugin.addCommand({
            id: 'analyze-idea-cluster',
            name: 'Analyze Idea Cluster',
            callback: () => new ClusterAnalysisCommand(context).execute()
        });

        plugin.addCommand({
            id: 'show-idea-stats',
            name: 'Show Idea Statistics',
            callback: () => new IdeaStatsCommand(context).execute()
        });
    }
}

