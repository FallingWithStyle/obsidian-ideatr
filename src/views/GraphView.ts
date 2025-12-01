import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import type { IClusteringService, IGraphLayoutService, IProjectElevationService } from '../types/management';
import type { IIdeaRepository } from '../types/management';
import type { IdeaFile } from '../types/idea';
import { ManagementError, getManagementErrorMessage } from '../types/management';
import { renderGraphLayout } from './GraphRenderer';
import { Logger } from '../utils/logger';
import { createHelpIcon } from '../utils/HelpIcon';

/**
 * GraphView - Displays idea clusters as an interactive graph
 */
export class GraphView extends ItemView {
    private clusteringService: IClusteringService;
    private graphLayoutService: IGraphLayoutService;
    private ideaRepository: IIdeaRepository;
    private projectElevationService?: IProjectElevationService;
    private ideas: IdeaFile[] = [];
    private isLoading: boolean = false;
    private currentLayout: any = null; // Store current layout for node lookups

    constructor(
        leaf: WorkspaceLeaf,
        clusteringService: IClusteringService,
        graphLayoutService: IGraphLayoutService,
        ideaRepository: IIdeaRepository,
        projectElevationService?: IProjectElevationService
    ) {
        super(leaf);
        this.clusteringService = clusteringService;
        this.graphLayoutService = graphLayoutService;
        this.ideaRepository = ideaRepository;
        this.projectElevationService = projectElevationService;
    }

    getViewType(): string {
        return 'ideatr-graph';
    }

    getDisplayText(): string {
        return 'Ideatr Graph';
    }

    getIcon(): string {
        return 'git-branch';
    }

    async onOpen(): Promise<void> {
        const container = this.contentEl;
        container.empty();

        // Create header
        const header = container.createDiv('graph-header');
        const headerTitle = header.createDiv({ cls: 'graph-title-container' });
        headerTitle.createEl('h2', { text: 'Idea Clusters' });
        const graphHelpIcon = createHelpIcon(this.app, 'graph-view', 'Learn about Graph View');
        headerTitle.appendChild(graphHelpIcon);

        const toolbar = header.createDiv('graph-toolbar');
        const refreshBtn = toolbar.createEl('button', { text: 'Refresh' });
        refreshBtn.addEventListener('click', () => this.refresh());

        // Create graph container
        const graphContainer = container.createDiv('graph-container');
        this.renderGraph(graphContainer);

        // Load initial data
        await this.loadGraph();
    }

    async onClose(): Promise<void> {
        // Cleanup if needed
    }

    /**
     * Render graph visualization
     */
    private renderGraph(container: HTMLElement): void {
        container.empty();

        if (this.isLoading) {
            container.createEl('div', { text: 'Generating clusters...' });
            return;
        }

        if (this.ideas.length === 0) {
            container.createEl('div', { text: 'No ideas found.' });
            return;
        }

        if (this.ideas.length < 2) {
            container.createEl('div', { text: 'Need at least 2 ideas to create clusters.' });
            return;
        }
    }

    /**
     * Load and generate graph
     */
    private async loadGraph(): Promise<void> {
        this.isLoading = true;
        const container = this.contentEl.querySelector('.graph-container') as HTMLElement;
        this.renderGraph(container);

        try {
            this.ideas = await this.ideaRepository.getAllIdeas();
            
            if (this.ideas.length >= 2) {
                // Generate clusters
                const clusters = await this.clusteringService.clusterIdeas(this.ideas);
                // Generate layout
                const layout = this.graphLayoutService.layoutGraph(clusters, 800, 600);
                this.currentLayout = layout; // Store for context menu lookups

                // Render interactive SVG graph
                renderGraphLayout(container, layout, {
                    onNodeClick: (nodeId) => {
                        const node = layout.nodes.find(n => n.id === nodeId);
                        if (node) {
                            this.openIdea(node.idea);
                        }
                    },
                    onNodeHover: (_node) => {
                        // Tooltip is handled by GraphRenderer
                        // This callback can be used for additional hover effects if needed
                    },
                    onNodeContextMenu: (nodeId, event) => {
                        this.showNodeContextMenu(nodeId, event);
                    },
                    mini: false
                });
            } else {
                this.renderGraph(container);
            }
        } catch (error) {
            console.error('Failed to load graph:', error);
            container.empty();
            let message = 'Failed to load graph. Please try again.';
            if (error instanceof ManagementError) {
                message = getManagementErrorMessage(error.code);
                new Notice(message);
            }
            container.createEl('div', { text: message });
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Refresh graph
     */
    private async refresh(): Promise<void> {
        await this.ideaRepository.refresh();
        await this.loadGraph();
    }

    /**
     * Open idea file
     */
    private openIdea(idea: IdeaFile): void {
        const file = this.app.vault.getAbstractFileByPath(`Ideas/${idea.filename}`);
        if (file) {
            this.app.workspace.openLinkText(`Ideas/${idea.filename}`, '', false);
        }
    }

    /**
     * Show context menu for a node
     */
    private showNodeContextMenu(nodeId: string, event: MouseEvent): void {
        if (!this.currentLayout) return;

        const node = this.currentLayout.nodes.find((n: any) => n.id === nodeId);
        if (!node) return;

        // Remove any existing context menu
        const existingMenu = document.querySelector('.ideatr-graph-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu
        const menu = document.createElement('div');
        menu.classList.add('ideatr-graph-context-menu');
        menu.style.position = 'fixed';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        menu.style.zIndex = '10000';
        menu.style.backgroundColor = 'var(--background-primary)';
        menu.style.border = '1px solid var(--background-modifier-border)';
        menu.style.borderRadius = '4px';
        menu.style.padding = '4px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

        // Add "Open Idea" option
        const openBtn = menu.createEl('button', {
            text: 'Open Idea',
            cls: 'context-menu-item'
        });
        openBtn.style.display = 'block';
        openBtn.style.width = '100%';
        openBtn.style.textAlign = 'left';
        openBtn.style.padding = '6px 12px';
        openBtn.style.border = 'none';
        openBtn.style.background = 'transparent';
        openBtn.style.cursor = 'pointer';
        openBtn.addEventListener('click', () => {
            this.openIdea(node.idea);
            menu.remove();
        });

        // Add "Elevate to Project" option (if service available and idea can be elevated)
        if (this.projectElevationService && this.projectElevationService.canElevate(node.idea)) {
            const elevateBtn = menu.createEl('button', {
                text: 'Elevate to Project',
                cls: 'context-menu-item'
            });
            elevateBtn.style.display = 'block';
            elevateBtn.style.width = '100%';
            elevateBtn.style.textAlign = 'left';
            elevateBtn.style.padding = '6px 12px';
            elevateBtn.style.border = 'none';
            elevateBtn.style.background = 'transparent';
            elevateBtn.style.cursor = 'pointer';
            elevateBtn.style.borderTop = '1px solid var(--background-modifier-border)';
            elevateBtn.addEventListener('click', () => {
                this.elevateIdea(node.idea);
                menu.remove();
            });
        }

        document.body.appendChild(menu);

        // Close menu when clicking outside
        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    /**
     * Elevate idea to project
     */
    private async elevateIdea(idea: IdeaFile): Promise<void> {
        if (!this.projectElevationService) {
            new Notice('Elevation service not available.');
            return;
        }

        // Validate idea can be elevated
        if (!this.projectElevationService.canElevate(idea)) {
            new Notice('This idea cannot be elevated. It may already be elevated or have invalid frontmatter.');
            return;
        }

        // Generate project name for confirmation
        const projectName = this.projectElevationService.generateProjectName(idea);

        // Show confirmation dialog
        const confirmed = confirm(
            `Elevate idea to project?\n\n` +
            `Project name: ${projectName}\n\n` +
            `The idea file will be moved to Projects/${projectName}/README.md\n` +
            `Original file will be deleted.`
        );

        if (!confirmed) {
            return;
        }

        try {
            new Notice('Elevating idea to project...');
            const result = await this.projectElevationService.elevateIdea(idea);

            if (result.success) {
                new Notice(`Idea elevated to project: ${result.projectPath}`);
                
                // Refresh ideas and reload graph
                await this.ideaRepository.refresh();
                await this.loadGraph();
                
                // Show warnings if any
                if (result.warnings && result.warnings.length > 0) {
                    Logger.warn('Elevation warnings:', result.warnings);
                }
            } else {
                new Notice(`Failed to elevate idea: ${result.error || 'Unknown error'}`);
                if (result.warnings && result.warnings.length > 0) {
                    Logger.warn('Elevation warnings:', result.warnings);
                }
            }
        } catch (error) {
            console.error('Failed to elevate idea:', error);
            new Notice('Failed to elevate idea. Please try again.');
        }
    }
}

