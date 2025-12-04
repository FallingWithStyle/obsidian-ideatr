import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import type { IIdeaRepository, IClusteringService, IResurfacingService, IProjectElevationService } from '../types/management';
import type { IdeaFile } from '../types/idea';
import type { IdeaFilter } from '../types/management';
import { ManagementError, getManagementErrorMessage } from '../types/management';
import { paginate, parseTagsInput, parseDateRange } from './dashboardUtils';
import { renderGraphLayout } from './GraphRenderer';
import { Logger } from '../utils/logger';
import { createHelpIcon } from '../utils/HelpIcon';
import { showConfirmation } from '../utils/confirmation';

/**
 * DashboardView - Displays a table view of all ideas with filtering and search
 */
export class DashboardView extends ItemView {
    private ideaRepository: IIdeaRepository;
    private clusteringService?: IClusteringService;
    private resurfacingService?: IResurfacingService;
    private projectElevationService?: IProjectElevationService;
    private ideas: IdeaFile[] = [];
    private filteredIdeas: IdeaFile[] = [];
    private filters: IdeaFilter = {};
    private sortColumn: string | null = null;
    private sortDirection: 'asc' | 'desc' = 'asc';
    private isLoading: boolean = false;
    private currentPage: number = 1;
    private readonly itemsPerPage: number;
    private readonly persistFilters: boolean;

    constructor(
        leaf: WorkspaceLeaf,
        ideaRepository: IIdeaRepository,
        clusteringService?: IClusteringService,
        resurfacingService?: IResurfacingService,
        projectElevationService?: IProjectElevationService,
        itemsPerPage: number = 50,
        persistFilters: boolean = false
    ) {
        super(leaf);
        this.ideaRepository = ideaRepository;
        this.clusteringService = clusteringService;
        this.resurfacingService = resurfacingService;
        this.projectElevationService = projectElevationService;
        this.itemsPerPage = itemsPerPage;
        this.persistFilters = persistFilters;
    }

    getViewType(): string {
        return 'ideatr-dashboard';
    }

    getDisplayText(): string {
        return 'Ideatr Dashboard';
    }

    getIcon(): string {
        return 'lightbulb';
    }

    async onOpen(): Promise<void> {
        const container = this.contentEl;
        container.empty();

        // Load persisted filter state if enabled (QA 4.1)
        if (this.persistFilters) {
            this.loadFilterState();
        }

        // Create header
        const header = container.createDiv('dashboard-header');
        const headerTitle = header.createDiv({ cls: 'dashboard-title-container' });
        headerTitle.createEl('h2', { text: 'Ideatr dashboard' }); // "Ideatr" is proper noun, "dashboard" lowercase
        const dashboardHelpIcon = createHelpIcon(this.app, 'dashboard', 'Learn about the Dashboard');
        headerTitle.appendChild(dashboardHelpIcon);

        const toolbar = header.createDiv('dashboard-toolbar');
        const refreshBtn = toolbar.createEl('button', { text: 'Refresh' });
        refreshBtn.addEventListener('click', () => this.refresh());

        // Create filter panel
        const filterPanel = container.createDiv('dashboard-filters');
        const filterTitle = filterPanel.createDiv({ cls: 'dashboard-filters-title' });
        filterTitle.createEl('h3', { text: 'Filters' });
        const filterHelpIcon = createHelpIcon(this.app, 'filters', 'Learn about Dashboard Filters');
        filterTitle.appendChild(filterHelpIcon);
        this.createFilterUI(filterPanel);

        // Create side panels
        const sidePanels = container.createDiv('dashboard-side-panels');
        
        // Clusters mini-graph
        if (this.clusteringService) {
            const clustersPanel = sidePanels.createDiv('dashboard-panel clusters-panel');
            const clustersTitle = clustersPanel.createDiv({ cls: 'dashboard-panel-title' });
            clustersTitle.createEl('h3', { text: 'Clusters' });
            const clustersHelpIcon = createHelpIcon(this.app, 'clusters', 'Learn about Clusters');
            clustersTitle.appendChild(clustersHelpIcon);
            this.renderClustersMiniGraph(clustersPanel);
        }

        // Resurfacing panel
        if (this.resurfacingService) {
            const resurfacingPanel = sidePanels.createDiv('dashboard-panel resurfacing-panel');
            const resurfacingTitle = resurfacingPanel.createDiv({ cls: 'dashboard-panel-title' });
            resurfacingTitle.createEl('h3', { text: 'Old ideas' });
            const resurfacingHelpIcon = createHelpIcon(this.app, 'resurfacing', 'Learn about Resurfacing');
            resurfacingTitle.appendChild(resurfacingHelpIcon);
            this.renderResurfacingPanel(resurfacingPanel);
        }

        // Triage inbox
        const triagePanel = sidePanels.createDiv('dashboard-panel triage-panel');
        const triageTitle = triagePanel.createDiv({ cls: 'dashboard-panel-title' });
        triageTitle.createEl('h3', { text: 'Triage inbox' });
        const triageHelpIcon = createHelpIcon(this.app, 'triage-inbox', 'Learn about Triage Inbox');
        triageTitle.appendChild(triageHelpIcon);
        this.renderTriageInbox(triagePanel);

        // Create table container
        const tableContainer = container.createDiv('dashboard-table-container');
        this.renderTable(tableContainer);

        // Load initial data
        await this.loadIdeas();
    }

    async onClose(): Promise<void> {
        // Cleanup if needed
    }

    /**
     * Create filter UI components
     */
    private createFilterUI(container: HTMLElement): void {
        // Search input
        const searchContainer = container.createDiv('filter-item');
        searchContainer.createEl('label', { text: 'Search:', attr: { for: 'dashboard-search' } });
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            attr: { id: 'dashboard-search' },
            placeholder: 'Search ideas...'
        });
        searchInput.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            this.filters.searchText = value || undefined;
            this.applyFilters();
        });

        // Category filter (now multi-value via comma-separated categories)
        const categoryContainer = container.createDiv('filter-item');
        categoryContainer.createEl('label', { text: 'Category:' });
        const categoryInput = categoryContainer.createEl('input', {
            type: 'text',
            placeholder: 'Filter by category (comma-separated)...'
        });
        categoryInput.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            const parts = value
                .split(',')
                .map(v => v.trim())
                .filter(v => v.length > 0);
            this.filters.categories = parts.length > 0 ? parts : undefined;
            this.applyFilters();
        });

        // Tags filter (multi-select via comma-separated tags, QA 4.1)
        const tagsContainer = container.createDiv('filter-item');
        tagsContainer.createEl('label', { text: 'Tags:' });
        const tagsInput = tagsContainer.createEl('input', {
            type: 'text',
            placeholder: 'Filter by tags (comma-separated)...'
        });
        tagsInput.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            const tags = parseTagsInput(value);
            this.filters.tags = tags.length > 0 ? tags : undefined;
            this.applyFilters();
        });

        // Status filter (single-value)
        const statusContainer = container.createDiv('filter-item');
        statusContainer.createEl('label', { text: 'Status:' });
        const statusInput = statusContainer.createEl('input', {
            type: 'text',
            placeholder: 'Filter by status...'
        });
        statusInput.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value.trim();
            this.filters.status = value || undefined;
            this.applyFilters();
        });

        // Date range filters
        const dateContainer = container.createDiv('filter-item date-range');
        dateContainer.createEl('label', { text: 'Created between:' });
        const startInput = dateContainer.createEl('input', {
            type: 'date'
        });
        const endInput = dateContainer.createEl('input', {
            type: 'date'
        });
        const onDateChange = () => {
            this.filters.dateRange = parseDateRange(startInput.value || undefined, endInput.value || undefined);
            this.applyFilters();
        };
        startInput.addEventListener('change', onDateChange);
        endInput.addEventListener('change', onDateChange);

        // Uncategorized toggle
        const uncategorizedContainer = container.createDiv('filter-item');
        const uncategorizedLabel = uncategorizedContainer.createEl('label');
        const uncategorizedCheckbox = uncategorizedLabel.createEl('input', {
            type: 'checkbox'
        });
        uncategorizedLabel.appendText(' Show only uncategorized ideas');
        uncategorizedCheckbox.addEventListener('change', (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            this.filters.uncategorized = checked || undefined;
            this.applyFilters();
        });

        // Clear filters button
        const clearBtn = container.createEl('button', { text: 'Clear Filters' });
        clearBtn.addEventListener('click', () => {
            this.filters = {};
            searchInput.value = '';
            categoryInput.value = '';
            tagsInput.value = '';
            statusInput.value = '';
            startInput.value = '';
            endInput.value = '';
            uncategorizedCheckbox.checked = false;
            this.applyFilters();
        });

        // Restore saved filter values if persistence is enabled (QA 4.1)
        if (this.persistFilters) {
            this.restoreFilterUIValues(searchInput, categoryInput, tagsInput, statusInput, startInput, endInput, uncategorizedCheckbox);
        }
    }

    /**
     * Restore filter UI input values from saved filter state (QA 4.1)
     */
    private restoreFilterUIValues(
        searchInput: HTMLInputElement,
        categoryInput: HTMLInputElement,
        tagsInput: HTMLInputElement,
        statusInput: HTMLInputElement,
        startInput: HTMLInputElement,
        endInput: HTMLInputElement,
        uncategorizedCheckbox: HTMLInputElement
    ): void {
        if (this.filters.searchText) {
            searchInput.value = this.filters.searchText;
        }
        if (this.filters.categories && this.filters.categories.length > 0) {
            categoryInput.value = this.filters.categories.join(', ');
        }
        if (this.filters.tags && this.filters.tags.length > 0) {
            tagsInput.value = this.filters.tags.join(', ');
        }
        if (this.filters.status) {
            statusInput.value = this.filters.status;
        }
        if (this.filters.dateRange) {
            startInput.value = this.filters.dateRange.start.toISOString().split('T')[0];
            endInput.value = this.filters.dateRange.end.toISOString().split('T')[0];
        }
        if (this.filters.uncategorized) {
            uncategorizedCheckbox.checked = true;
        }
    }

    /**
     * Render data table
     */
    private renderTable(container: HTMLElement): void {
        container.empty();

        if (this.isLoading) {
            container.createEl('div', { text: 'Loading ideas...' });
            return;
        }

        if (this.filteredIdeas.length === 0) {
            container.createEl('div', { text: 'No ideas found.' });
            return;
        }

        const table = container.createEl('table', { cls: 'dashboard-table' });

        // Table header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        this.createTableHeader(headerRow, 'Date', 'created');
        this.createTableHeader(headerRow, 'Category', 'category');
        this.createTableHeader(headerRow, 'Tags', 'tags');
        this.createTableHeader(headerRow, 'Status', 'status');
        this.createTableHeader(headerRow, 'Title', 'title');
        if (this.projectElevationService) {
            headerRow.createEl('th', { text: 'Actions' });
        }

        // Table body with pagination
        const tbody = table.createEl('tbody');
        const { pageItems, totalPages } = paginate(this.filteredIdeas, this.currentPage, this.itemsPerPage);
        for (const idea of pageItems) {
            const row = tbody.createEl('tr');
            row.addEventListener('click', () => this.openIdea(idea));

            // Date column
            const dateCell = row.createEl('td');
            dateCell.textContent = idea.frontmatter.created;

            // Category column
            const categoryCell = row.createEl('td');
            categoryCell.textContent = idea.frontmatter.category || 'Uncategorized';

            // Tags column
            const tagsCell = row.createEl('td');
            tagsCell.textContent = idea.frontmatter.tags.join(', ') || '';

            // Status column
            const statusCell = row.createEl('td');
            statusCell.textContent = idea.frontmatter.status;

            // Title column (preview)
            const titleCell = row.createEl('td');
            const bodyPreview = idea.body.substring(0, 50);
            titleCell.textContent = bodyPreview || idea.filename;
            if (idea.body.length > 50) {
                titleCell.textContent += '...';
            }

            // Actions column (elevation button)
            if (this.projectElevationService) {
                const actionsCell = row.createEl('td', { cls: 'actions-cell' });
                if (this.projectElevationService.canElevate(idea)) {
                    const elevateBtn = actionsCell.createEl('button', {
                        text: 'Elevate',
                        cls: 'elevate-btn'
                    });
                    elevateBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent row click
                        this.elevateIdea(idea);
                    });
                } else {
                    // Show disabled state or nothing for already elevated ideas
                    actionsCell.textContent = '-';
                }
            }
        }

        // Pagination footer
        const footer = container.createDiv('dashboard-pagination');
        footer.createSpan({ text: `Page ${this.currentPage} of ${totalPages}` });
        const that = this;
        const makePageButton = (label: string, delta: number) => {
            const btn = footer.createEl('button', { text: label });
            btn.addEventListener('click', () => {
                const nextPage = that.currentPage + delta;
                const safeNext = Math.min(Math.max(1, nextPage), totalPages);
                if (safeNext !== that.currentPage) {
                    that.currentPage = safeNext;
                    that.renderTable(container);
                }
            });
            return btn;
        };
        makePageButton('Prev', -1);
        makePageButton('Next', 1);
    }

    /**
     * Create sortable table header
     */
    private createTableHeader(row: HTMLElement, text: string, column: string): void {
        const th = row.createEl('th');
        th.textContent = text;
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => this.sortBy(column));

        // Add sort indicator
        if (this.sortColumn === column) {
            th.textContent += this.sortDirection === 'asc' ? ' ↑' : ' ↓';
        }
    }

    /**
     * Sort ideas by column
     */
    private sortBy(column: string): void {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredIdeas.sort((a, b) => {
            let aVal: any;
            let bVal: any;

            switch (column) {
                case 'created':
                    aVal = new Date(a.frontmatter.created).getTime();
                    bVal = new Date(b.frontmatter.created).getTime();
                    break;
                case 'category':
                    aVal = a.frontmatter.category || '';
                    bVal = b.frontmatter.category || '';
                    break;
                case 'status':
                    aVal = a.frontmatter.status;
                    bVal = b.frontmatter.status;
                    break;
                case 'title':
                    aVal = a.body || a.filename;
                    bVal = b.body || b.filename;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderTable(this.contentEl.querySelector('.dashboard-table-container') as HTMLElement);
    }

    /**
     * Load ideas from repository
     */
    private async loadIdeas(): Promise<void> {
        this.isLoading = true;
        this.renderTable(this.contentEl.querySelector('.dashboard-table-container') as HTMLElement);

        try {
            this.ideas = await this.ideaRepository.getAllIdeas();
            this.applyFilters();
            
            // Refresh panels
            if (this.clusteringService) {
                const clustersPanel = this.contentEl.querySelector('.clusters-panel') as HTMLElement;
                if (clustersPanel) {
                    this.renderClustersMiniGraph(clustersPanel);
                }
            }
            
            if (this.resurfacingService) {
                const resurfacingPanel = this.contentEl.querySelector('.resurfacing-panel') as HTMLElement;
                if (resurfacingPanel) {
                    this.renderResurfacingPanel(resurfacingPanel);
                }
            }
            
            const triagePanel = this.contentEl.querySelector('.triage-panel') as HTMLElement;
            if (triagePanel) {
                this.renderTriageInbox(triagePanel);
            }
        } catch (error) {
            console.error('Failed to load ideas:', error);
            const container = this.contentEl.querySelector('.dashboard-table-container') as HTMLElement;
            container.empty();
            let message = 'Failed to load ideas. Please try again.';
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
     * Apply filters to ideas
     */
    private async applyFilters(): Promise<void> {
        try {
            this.filteredIdeas = await this.ideaRepository.getIdeasByFilter(this.filters);
            this.currentPage = 1; // Reset to first page on filter change
            this.renderTable(this.contentEl.querySelector('.dashboard-table-container') as HTMLElement);
            
            // Save filter state if persistence is enabled (QA 4.1)
            if (this.persistFilters) {
                await this.saveFilterState();
            }
        } catch (error) {
            console.error('Failed to apply filters:', error);
            const container = this.contentEl.querySelector('.dashboard-table-container') as HTMLElement;
            container.empty();
            let message = 'Failed to apply dashboard filters.';
            if (error instanceof ManagementError) {
                message = getManagementErrorMessage(error.code);
                new Notice(message);
            }
            container.createEl('div', { text: message });
        }
    }

    /**
     * Load persisted filter state from leaf view state (QA 4.1)
     */
    private loadFilterState(): void {
        try {
            const viewState = this.leaf.getViewState();
            if (viewState.state && viewState.state.filters) {
                this.filters = viewState.state.filters as IdeaFilter;
            }
        } catch (error) {
            Logger.warn('Failed to load persisted filter state:', error);
            // Continue with empty filters
        }
    }

    /**
     * Save current filter state to leaf view state (QA 4.1)
     */
    private async saveFilterState(): Promise<void> {
        try {
            await this.leaf.setViewState({
                type: 'ideatr-dashboard',
                state: {
                    filters: this.filters
                }
            });
        } catch (error) {
            Logger.warn('Failed to save filter state:', error);
            // Non-fatal: continue without persistence
        }
    }

    /**
     * Refresh ideas
     */
    private async refresh(): Promise<void> {
        await this.ideaRepository.refresh();
        await this.loadIdeas();
    }

    /**
     * Open idea file
     */
    private openIdea(idea: IdeaFile): void {
        // Use Obsidian API to open file
        const file = this.app.vault.getAbstractFileByPath(`Ideas/${idea.filename}`);
        if (file) {
            this.app.workspace.openLinkText(`Ideas/${idea.filename}`, '', false);
        }
    }

    /**
     * Render clusters mini-graph
     */
    private async renderClustersMiniGraph(container: HTMLElement): Promise<void> {
        container.empty();
        container.createEl('div', { text: 'Loading clusters...', cls: 'loading' });

        try {
            if (this.ideas.length < 2) {
                container.empty();
                container.createEl('div', { text: 'Need at least 2 ideas for clustering.' });
                return;
            }

            const clusters = await this.clusteringService!.clusterIdeas(this.ideas);

            // Use GraphLayoutService via main wiring; for dashboard we only need a small preview,
            // so we call the same layout logic through the full GraphView pipeline. For now,
            // generate a local layout using a reasonable canvas size.
            const previewLayout = (this.app as any).plugins
                ? (this.app as any).plugins?.getPlugin('ideatr')?.graphLayoutService?.layoutGraph(clusters, 220, 180)
                : null;

            container.empty();
            container.createEl('div', { 
                text: `${clusters.length} clusters found`,
                cls: 'cluster-summary'
            });

            if (previewLayout) {
                const graphContainer = container.createDiv('clusters-mini-graph');
                renderGraphLayout(graphContainer, previewLayout, {
                    mini: true,
                    onNodeClick: (nodeId) => {
                        const node = previewLayout.nodes.find((n: any) => n.id === nodeId);
                        if (node) {
                            this.openIdea(node.idea);
                        }
                    },
                    onNodeHover: (_node) => {
                        // Tooltip is handled by GraphRenderer
                        // This callback can be used for additional hover effects if needed
                    }
                });
            }

            const openGraphBtn = container.createEl('button', { text: 'Open Full Graph' });
            openGraphBtn.addEventListener('click', () => {
                this.app.workspace.getLeaf(false).setViewState({
                    type: 'ideatr-graph',
                    active: true
                });
            });
        } catch (error) {
            console.error('Failed to load clusters:', error);
            container.empty();
            container.createEl('div', { text: 'Failed to load clusters.' });
        }
    }

    /**
     * Render resurfacing panel
     */
    private async renderResurfacingPanel(container: HTMLElement): Promise<void> {
        container.empty();
        container.createEl('div', { text: 'Loading old ideas...', cls: 'loading' });

        try {
            const oldIdeas = await this.resurfacingService!.identifyOldIdeas();
            
            container.empty();
            
            if (oldIdeas.length === 0) {
                container.createEl('div', { text: 'No old ideas found.' });
                return;
            }

            container.createEl('div', { 
                text: `${oldIdeas.length} old ideas need attention`,
                cls: 'resurfacing-summary'
            });

            const ideasList = container.createEl('ul', { cls: 'resurfacing-list' });
            for (const idea of oldIdeas.slice(0, 5)) { // Show first 5
                const li = ideasList.createEl('li');
                const age = this.calculateAge(idea.frontmatter.created);
                li.textContent = `${idea.filename.replace('.md', '')} (${age} days old)`;
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => this.openIdea(idea));
            }

            if (oldIdeas.length > 5) {
                ideasList.createEl('li', { text: `... and ${oldIdeas.length - 5} more` });
            }

            const generateDigestBtn = container.createEl('button', { text: 'Generate Digest' });
            generateDigestBtn.addEventListener('click', async () => {
                try {
                    const digest = await this.resurfacingService!.generateDigest();
                    const digestPath = `Ideas/.ideatr-digest-${Date.now()}.md`;
                    await this.app.vault.create(digestPath, digest.summary);
                    const file = this.app.vault.getAbstractFileByPath(digestPath);
                    if (file) {
                        await this.app.workspace.openLinkText(digestPath, '', false);
                    }
                } catch (error) {
                    console.error('Failed to generate digest:', error);
                }
            });
        } catch (error) {
            console.error('Failed to load resurfacing panel:', error);
            container.empty();
            container.createEl('div', { text: 'Failed to load old ideas.' });
        }
    }

    /**
     * Render triage inbox
     */
    private renderTriageInbox(container: HTMLElement): void {
        container.empty();

        const uncategorizedIdeas = this.filteredIdeas.filter(
            idea => !idea.frontmatter.category || idea.frontmatter.category === ''
        );

        if (uncategorizedIdeas.length === 0) {
            container.createEl('div', { text: 'All ideas are categorized!' });
            return;
        }

        container.createEl('div', { 
            text: `${uncategorizedIdeas.length} uncategorized ideas`,
            cls: 'triage-summary'
        });

        const ideasList = container.createEl('ul', { cls: 'triage-list' });
        for (const idea of uncategorizedIdeas.slice(0, 10)) { // Show first 10
            const li = ideasList.createEl('li');
            li.textContent = idea.filename.replace('.md', '');
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => this.openIdea(idea));
        }

        if (uncategorizedIdeas.length > 10) {
            ideasList.createEl('li', { text: `... and ${uncategorizedIdeas.length - 10} more` });
        }
    }

    /**
     * Calculate age in days
     */
    private calculateAge(createdDate: string): number {
        try {
            const created = new Date(createdDate);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - created.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch {
            return 0;
        }
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
        const confirmed = await showConfirmation(
            this.app,
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
                
                // Refresh ideas to update the table
                await this.ideaRepository.refresh();
                await this.loadIdeas();
                
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

