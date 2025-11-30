import type { IdeaFile, IdeaFrontmatter } from './idea';

/**
 * Filter criteria for ideas
 */
export interface IdeaFilter {
    dateRange?: {
        start: Date;
        end: Date;
    };
    categories?: string[];
    tags?: string[];
    status?: string;
    searchText?: string;
    uncategorized?: boolean; // Filter for ideas with empty category
}

/**
 * Idea repository service interface
 */
export interface IIdeaRepository {
    /**
     * Get all ideas from the vault
     * @returns Array of parsed idea files
     */
    getAllIdeas(): Promise<IdeaFile[]>;

    /**
     * Get ideas matching filter criteria
     * @param filter - Filter criteria
     * @returns Array of filtered idea files
     */
    getIdeasByFilter(filter: IdeaFilter): Promise<IdeaFile[]>;

    /**
     * Get a single idea by file path
     * @param path - File path relative to vault root
     * @returns Idea file or null if not found
     */
    getIdeaByPath(path: string): Promise<IdeaFile | null>;

    /**
     * Watch for changes to ideas and notify callback
     * @param callback - Function called when ideas change
     * @returns Unsubscribe function
     */
    watchIdeas(callback: (ideas: IdeaFile[]) => void): () => void;

    /**
     * Refresh the idea cache (force re-read all files)
     */
    refresh(): Promise<void>;
}

/**
 * Frontmatter parser service interface
 */
export interface IFrontmatterParser {
    /**
     * Parse frontmatter from file content
     * @param content - Full file content including frontmatter
     * @returns Parsed frontmatter or null if invalid
     */
    parseFrontmatter(content: string): IdeaFrontmatter | null;

    /**
     * Parse complete idea file from file and content
     * @param file - Obsidian TFile
     * @param content - File content
     * @returns Complete idea file structure
     */
    parseIdeaFile(file: { path: string; name: string }, content: string): IdeaFile;

    /**
     * Validate frontmatter structure
     * @param frontmatter - Frontmatter object to validate
     * @returns True if valid, false otherwise
     */
    validateFrontmatter(frontmatter: any): boolean;
}

/**
 * Embedding vector (array of numbers)
 */
export type Embedding = number[];

/**
 * Embedding service interface
 */
export interface IEmbeddingService {
    /**
     * Generate embedding for a single text
     * @param text - Text to embed
     * @returns Embedding vector
     */
    generateEmbedding(text: string): Promise<Embedding>;

    /**
     * Generate embeddings for multiple texts (batch)
     * @param texts - Array of texts to embed
     * @returns Array of embedding vectors
     */
    generateEmbeddings(texts: string[]): Promise<Embedding[]>;

    /**
     * Check if embedding service is available
     */
    isAvailable(): boolean;
}

/**
 * Cluster of related ideas
 */
export interface Cluster {
    id: string;
    ideas: IdeaFile[];
    centroid?: Embedding; // For k-means, optional
    label?: string; // Auto-generated or user-defined
}

/**
 * Clustering service interface
 */
export interface IClusteringService {
    /**
     * Cluster ideas based on similarity
     * @param ideas - Ideas to cluster
     * @param embeddings - Optional embeddings (if not provided, will generate)
     * @returns Array of clusters
     */
    clusterIdeas(ideas: IdeaFile[], embeddings?: Embedding[]): Promise<Cluster[]>;

    /**
     * Calculate similarity between two embeddings
     * @param embedding1 - First embedding
     * @param embedding2 - Second embedding
     * @returns Similarity score (0-1)
     */
    calculateSimilarity(embedding1: Embedding, embedding2: Embedding): number;
}

/**
 * Graph node (represents an idea)
 */
export interface GraphNode {
    id: string;
    idea: IdeaFile;
    x: number;
    y: number;
    clusterId: string;
}

/**
 * Graph edge (represents relationship between ideas)
 */
export interface GraphEdge {
    from: string; // Node ID
    to: string; // Node ID
    weight: number; // Similarity score
}

/**
 * Graph layout result
 */
export interface GraphLayout {
    nodes: GraphNode[];
    edges: GraphEdge[];
    width: number;
    height: number;
}

/**
 * Graph layout service interface
 */
export interface IGraphLayoutService {
    /**
     * Generate graph layout from clusters
     * @param clusters - Clusters to layout
     * @param width - Canvas width
     * @param height - Canvas height
     * @returns Graph layout with node positions
     */
    layoutGraph(clusters: Cluster[], width: number, height: number): GraphLayout;

    /**
     * Update layout when ideas change
     * @param layout - Current layout
     * @param changes - Changed ideas
     * @returns Updated layout
     */
    updateLayout(layout: GraphLayout, changes: IdeaFile[]): GraphLayout;
}

/**
 * Digest content structure
 */
export interface Digest {
    id: string;
    generatedAt: Date;
    ideas: IdeaFile[];
    summary: string; // Markdown formatted summary
}

/**
 * Resurfacing service interface
 */
export interface IResurfacingService {
    /**
     * Identify old ideas based on age threshold
     * @param thresholdDays - Number of days since creation (default: 7)
     * @returns Array of old ideas
     */
    identifyOldIdeas(thresholdDays?: number): Promise<IdeaFile[]>;

    /**
     * Generate digest for old ideas
     * @param ideas - Ideas to include in digest (optional, will identify if not provided)
     * @returns Generated digest
     */
    generateDigest(ideas?: IdeaFile[]): Promise<Digest>;

    /**
     * Mark idea as dismissed (exclude from future digests)
     * @param ideaPath - Path to idea file
     */
    markAsDismissed(ideaPath: string): Promise<void>;

    /**
     * Mark idea as acted upon (exclude from future digests)
     * @param ideaPath - Path to idea file
     */
    markAsActedUpon(ideaPath: string): Promise<void>;

    /**
     * Check if idea is dismissed or acted upon
     * @param ideaPath - Path to idea file
     * @returns True if dismissed or acted upon
     */
    isDismissedOrActedUpon(ideaPath: string): Promise<boolean>;
}

/**
 * Management service errors
 */
export class ManagementError extends Error {
    constructor(message: string, public code: ManagementErrorCode) {
        super(message);
        this.name = 'ManagementError';
    }
}

/**
 * Error codes
 */
export enum ManagementErrorCode {
    // Data access errors
    FILE_READ_ERROR = 'FILE_READ_ERROR',
    FRONTMATTER_PARSE_ERROR = 'FRONTMATTER_PARSE_ERROR',
    INVALID_FRONTMATTER = 'INVALID_FRONTMATTER',
    VAULT_ACCESS_ERROR = 'VAULT_ACCESS_ERROR',
    
    // Embedding errors
    EMBEDDING_GENERATION_ERROR = 'EMBEDDING_GENERATION_ERROR',
    EMBEDDING_TIMEOUT = 'EMBEDDING_TIMEOUT',
    EMBEDDING_UNAVAILABLE = 'EMBEDDING_UNAVAILABLE',
    
    // Clustering errors
    CLUSTERING_INSUFFICIENT_DATA = 'CLUSTERING_INSUFFICIENT_DATA',
    CLUSTERING_ALGORITHM_ERROR = 'CLUSTERING_ALGORITHM_ERROR',
    CLUSTERING_TOO_MANY_IDEAS = 'CLUSTERING_TOO_MANY_IDEAS',
    
    // View errors
    VIEW_RENDERING_ERROR = 'VIEW_RENDERING_ERROR',
    GRAPH_RENDERING_ERROR = 'GRAPH_RENDERING_ERROR',
    VIEW_MEMORY_ERROR = 'VIEW_MEMORY_ERROR',
    
    // Resurfacing errors
    DIGEST_GENERATION_ERROR = 'DIGEST_GENERATION_ERROR',
    DATE_PARSE_ERROR = 'DATE_PARSE_ERROR',
    
    // Elevation errors
    ELEVATION_VALIDATION_ERROR = 'ELEVATION_VALIDATION_ERROR',
    ELEVATION_FILE_MOVE_ERROR = 'ELEVATION_FILE_MOVE_ERROR',
    ELEVATION_FOLDER_CREATION_ERROR = 'ELEVATION_FOLDER_CREATION_ERROR',
    ELEVATION_FRONTMATTER_UPDATE_ERROR = 'ELEVATION_FRONTMATTER_UPDATE_ERROR',
    ELEVATION_PROJECT_NAME_COLLISION = 'ELEVATION_PROJECT_NAME_COLLISION',
}

/**
 * Project elevation result
 */
export interface ElevationResult {
    success: boolean;
    projectPath?: string;        // Path to created project folder
    error?: string;               // Error message if failed
    warnings?: string[];          // Non-fatal warnings
}

/**
 * Project elevation service interface
 */
export interface IProjectElevationService {
    /**
     * Elevate an idea to a project
     * @param ideaFile - Idea file to elevate
     * @param projectName - Optional project name (if not provided, extracted from idea)
     * @returns Elevation result with project path or error
     */
    elevateIdea(ideaFile: IdeaFile, projectName?: string): Promise<ElevationResult>;

    /**
     * Validate if an idea can be elevated
     * @param ideaFile - Idea file to validate
     * @returns True if idea can be elevated, false otherwise
     */
    canElevate(ideaFile: IdeaFile): boolean;

    /**
     * Generate project name from idea
     * @param ideaFile - Idea file
     * @returns Sanitized project name
     */
    generateProjectName(ideaFile: IdeaFile): string;

    /**
     * Check if project name is available (no collision)
     * @param projectName - Project name to check
     * @returns True if available, false if collision
     */
    isProjectNameAvailable(projectName: string): Promise<boolean>;
}

/**
 * Map ManagementErrorCode values to user-facing messages that can be surfaced in
 * views or notices. This keeps UX text centralized and aligned with the
 * architecture error-handling strategy (EPIC_5_PREDEV, QA 4.6).
 */
export function getManagementErrorMessage(code: ManagementErrorCode): string {
    switch (code) {
        // Data access
        case ManagementErrorCode.FILE_READ_ERROR:
            return 'Failed to load ideas: some files could not be read. Please check your vault permissions.';
        case ManagementErrorCode.FRONTMATTER_PARSE_ERROR:
        case ManagementErrorCode.INVALID_FRONTMATTER:
            return 'Some ideas have invalid frontmatter and were skipped. Check your idea metadata and try again.';
        case ManagementErrorCode.VAULT_ACCESS_ERROR:
            return 'Could not access the vault to load ideas. Please try again or restart Obsidian.';

        // Embeddings / clustering
        case ManagementErrorCode.EMBEDDING_GENERATION_ERROR:
        case ManagementErrorCode.EMBEDDING_TIMEOUT:
        case ManagementErrorCode.EMBEDDING_UNAVAILABLE:
            return 'Clustering is temporarily unavailable due to embedding errors. You can still use the dashboard table.';
        case ManagementErrorCode.CLUSTERING_INSUFFICIENT_DATA:
            return 'Not enough ideas to generate clusters yet. Capture a few more ideas and try again.';
        case ManagementErrorCode.CLUSTERING_ALGORITHM_ERROR:
            return 'Clustering failed due to an internal error. Try narrowing your idea set or disabling clustering in settings.';
        case ManagementErrorCode.CLUSTERING_TOO_MANY_IDEAS:
            return 'Too many ideas to cluster efficiently. Please filter to fewer ideas and try again.';

        // View / graph
        case ManagementErrorCode.VIEW_RENDERING_ERROR:
        case ManagementErrorCode.GRAPH_RENDERING_ERROR:
            return 'Failed to render the management view. Try closing and reopening the view.';
        case ManagementErrorCode.VIEW_MEMORY_ERROR:
            return 'Rendering the graph used too much memory. Try filtering to fewer ideas.';

        // Resurfacing
        case ManagementErrorCode.DIGEST_GENERATION_ERROR:
            return 'Digest generation failed. Please try again or check your resurfacing settings.';
        case ManagementErrorCode.DATE_PARSE_ERROR:
            return 'Some ideas have invalid or missing created dates and were skipped. Check your idea frontmatter.';

        // Elevation
        case ManagementErrorCode.ELEVATION_VALIDATION_ERROR:
            return 'Idea cannot be elevated. Please check that the idea is valid and not already elevated.';
        case ManagementErrorCode.ELEVATION_FILE_MOVE_ERROR:
            return 'Failed to move idea file to project folder. Please check vault permissions.';
        case ManagementErrorCode.ELEVATION_FOLDER_CREATION_ERROR:
            return 'Failed to create project folder structure. Please check vault permissions.';
        case ManagementErrorCode.ELEVATION_FRONTMATTER_UPDATE_ERROR:
            return 'Failed to update idea frontmatter during elevation. The project may have been created but metadata may be incomplete.';
        case ManagementErrorCode.ELEVATION_PROJECT_NAME_COLLISION:
            return 'A project with this name already exists. Please choose a different name.';

        default:
            return 'An unexpected management error occurred. Please check the console for details.';
    }
}

