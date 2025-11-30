import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphView } from '../../src/views/GraphView';
import { IdeaRepository } from '../../src/services/IdeaRepository';
import { ClusteringService } from '../../src/services/ClusteringService';
import { GraphLayoutService } from '../../src/services/GraphLayoutService';
import { EmbeddingService } from '../../src/services/EmbeddingService';
import { FrontmatterParser } from '../../src/services/FrontmatterParser';
import type { Vault, WorkspaceLeaf } from 'obsidian';
import type { IdeaFile } from '../../src/types/idea';
import type { GraphLayout } from '../../src/types/management';

// Mock WorkspaceLeaf
function createMockLeaf(): WorkspaceLeaf {
    return {
        getViewState: vi.fn(() => ({ type: 'ideatr-graph', state: null })),
        setViewState: vi.fn(async () => Promise.resolve())
    } as unknown as WorkspaceLeaf;
}

// Mock Vault
function createMockVault(): Vault {
    return {
        getMarkdownFiles: vi.fn(() => []),
        read: vi.fn(async () => ''),
        getAbstractFileByPath: vi.fn(() => null),
        on: vi.fn(() => () => {})
    } as unknown as Vault;
}

describe('GraphView (QA 4.7)', () => {
    let vault: Vault;
    let leaf: WorkspaceLeaf;
    let repository: IdeaRepository;
    let clusteringService: ClusteringService;
    let graphLayoutService: GraphLayoutService;
    let view: GraphView;

    beforeEach(() => {
        vault = createMockVault();
        leaf = createMockLeaf();
        repository = new IdeaRepository(vault, new FrontmatterParser());
        clusteringService = new ClusteringService(new EmbeddingService(), 0.3);
        graphLayoutService = new GraphLayoutService();
        view = new GraphView(leaf, clusteringService, graphLayoutService, repository);
    });

    describe('loadGraph', () => {
        beforeEach(() => {
            // Mock contentEl structure that views expect
            (view as any).contentEl = {
                querySelector: vi.fn(() => ({
                    empty: vi.fn(),
                    createEl: vi.fn(() => ({ textContent: '' }))
                }))
            };
        });

        it('should call repository.getAllIdeas', async () => {
            const getAllIdeasSpy = vi.spyOn(repository, 'getAllIdeas').mockResolvedValue([]);
            (view as any).renderGraph = vi.fn();

            await (view as any).loadGraph();

            expect(getAllIdeasSpy).toHaveBeenCalled();
        });

        it('should call clusteringService.clusterIdeas when there are 2+ ideas', async () => {
            const testIdeas: IdeaFile[] = [
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-28',
                        category: 'saas',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'Idea 1',
                    filename: 'idea1.md'
                },
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-27',
                        category: 'game',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'Idea 2',
                    filename: 'idea2.md'
                }
            ];

            vi.spyOn(repository, 'getAllIdeas').mockResolvedValue(testIdeas);
            const clusterIdeasSpy = vi.spyOn(clusteringService, 'clusterIdeas').mockResolvedValue([
                {
                    id: 'cluster-0',
                    ideas: testIdeas,
                    label: 'Mixed'
                }
            ]);
            const layoutGraphSpy = vi.spyOn(graphLayoutService, 'layoutGraph').mockReturnValue({
                nodes: [],
                edges: [],
                width: 800,
                height: 600
            });
            (view as any).renderGraph = vi.fn();

            await (view as any).loadGraph();

            expect(clusterIdeasSpy).toHaveBeenCalledWith(testIdeas);
            expect(layoutGraphSpy).toHaveBeenCalled();
        });

        it('should not cluster when there are fewer than 2 ideas', async () => {
            const testIdeas: IdeaFile[] = [
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: '2025-11-28',
                        category: 'saas',
                        tags: [],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'Single idea',
                    filename: 'idea1.md'
                }
            ];

            vi.spyOn(repository, 'getAllIdeas').mockResolvedValue(testIdeas);
            const clusterIdeasSpy = vi.spyOn(clusteringService, 'clusterIdeas');
            (view as any).renderGraph = vi.fn();

            await (view as any).loadGraph();

            expect(clusterIdeasSpy).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully and show error message', async () => {
            const containerMock = {
                empty: vi.fn(),
                createEl: vi.fn(() => ({ textContent: '' }))
            };
            vi.spyOn(repository, 'getAllIdeas').mockRejectedValue(new Error('Test error'));
            (view as any).renderGraph = vi.fn();
            vi.mocked((view as any).contentEl.querySelector).mockReturnValue(containerMock);

            await (view as any).loadGraph();

            expect(containerMock.empty).toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        it('should call repository.refresh and reload graph', async () => {
            const refreshSpy = vi.spyOn(repository, 'refresh').mockResolvedValue(undefined);
            const loadGraphSpy = vi.spyOn(view as any, 'loadGraph').mockResolvedValue(undefined);

            await (view as any).refresh();

            expect(refreshSpy).toHaveBeenCalled();
            expect(loadGraphSpy).toHaveBeenCalled();
        });
    });
});

