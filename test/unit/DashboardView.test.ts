import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardView } from '../../src/views/DashboardView';
import { IdeaRepository } from '../../src/services/IdeaRepository';
import { FrontmatterParser } from '../../src/services/FrontmatterParser';
import type { Vault, WorkspaceLeaf } from 'obsidian';
import type { IdeaFile } from '../../src/types/idea';
import type { IIdeaRepository } from '../../src/types/management';

// Mock WorkspaceLeaf
function createMockLeaf(): WorkspaceLeaf {
    return {
        getViewState: vi.fn(() => ({ type: 'ideatr-dashboard', state: null })),
        setViewState: vi.fn(async () => Promise.resolve())
    } as unknown as WorkspaceLeaf;
}

// Mock Vault with test data
function createMockVaultWithIdeas(): Vault {
    const ideas: IdeaFile[] = [
        {
            frontmatter: {
                type: 'idea',
                status: 'captured',
                created: '2025-11-28',
                category: 'saas',
                tags: ['productivity'],
                related: [],
                domains: [],
                'existence-check': []
            },
            body: 'SaaS idea body',
            filename: 'idea1.md'
        },
        {
            frontmatter: {
                type: 'idea',
                status: 'captured',
                created: '2025-11-27',
                category: 'game',
                tags: ['fun'],
                related: [],
                domains: [],
                'existence-check': []
            },
            body: 'Game idea body',
            filename: 'idea2.md'
        },
        {
            frontmatter: {
                type: 'idea',
                status: 'captured',
                created: '2025-11-26',
                category: '',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            },
            body: 'Uncategorized idea',
            filename: 'idea3.md'
        }
    ];

    return {
        getMarkdownFiles: vi.fn(() => []),
        read: vi.fn(async () => ''),
        getAbstractFileByPath: vi.fn(() => null),
        on: vi.fn(() => () => {})
    } as unknown as Vault;
}

describe('DashboardView (QA 4.7)', () => {
    let vault: Vault;
    let leaf: WorkspaceLeaf;
    let repository: IdeaRepository;
    let view: DashboardView;

    beforeEach(() => {
        vault = createMockVaultWithIdeas();
        leaf = createMockLeaf();
        repository = new IdeaRepository(vault, new FrontmatterParser());
        view = new DashboardView(leaf, repository, undefined, undefined, 50, false);
    });

    describe('loadIdeas', () => {
        beforeEach(() => {
            // Mock contentEl structure that views expect
            (view as any).contentEl = {
                querySelector: vi.fn(() => ({
                    empty: vi.fn(),
                    createEl: vi.fn(() => ({ textContent: '' }))
                }))
            };
        });

        it('should call repository.getAllIdeas and populate ideas array', async () => {
            const getAllIdeasSpy = vi.spyOn(repository, 'getAllIdeas').mockResolvedValue([
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
                    body: 'Test idea',
                    filename: 'test.md'
                }
            ]);
            (view as any).renderTable = vi.fn();

            await (view as any).loadIdeas();

            expect(getAllIdeasSpy).toHaveBeenCalled();
            const viewIdeas = (view as any).ideas as IdeaFile[];
            expect(viewIdeas).toHaveLength(1);
            expect(viewIdeas[0].filename).toBe('test.md');
        });

        it('should apply filters after loading ideas', async () => {
            const applyFiltersSpy = vi.spyOn(view as any, 'applyFilters').mockResolvedValue(undefined);
            vi.spyOn(repository, 'getAllIdeas').mockResolvedValue([]);
            (view as any).renderTable = vi.fn();

            await (view as any).loadIdeas();

            expect(applyFiltersSpy).toHaveBeenCalled();
        });
    });

    describe('sortBy', () => {
        beforeEach(async () => {
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
                    body: 'Zebra idea',
                    filename: 'zebra.md'
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
                    body: 'Alpha idea',
                    filename: 'alpha.md'
                }
            ];

            (view as any).filteredIdeas = testIdeas;
            (view as any).renderTable = vi.fn(); // Mock render to avoid DOM issues
        });

        it('should sort ideas by title in ascending order', () => {
            (view as any).sortBy('title');

            const sorted = (view as any).filteredIdeas as IdeaFile[];
            expect(sorted[0].filename).toBe('alpha.md');
            expect(sorted[1].filename).toBe('zebra.md');
            expect((view as any).sortColumn).toBe('title');
            expect((view as any).sortDirection).toBe('asc');
        });

        it('should toggle sort direction when clicking same column twice', () => {
            (view as any).sortBy('title');
            expect((view as any).sortDirection).toBe('asc');

            (view as any).sortBy('title');
            expect((view as any).sortDirection).toBe('desc');
        });

        it('should sort by created date', () => {
            (view as any).sortBy('created');

            const sorted = (view as any).filteredIdeas as IdeaFile[];
            expect(sorted[0].frontmatter.created).toBe('2025-11-27'); // Older first (asc)
            expect(sorted[1].frontmatter.created).toBe('2025-11-28');
        });

        it('should sort by category', () => {
            (view as any).sortBy('category');

            const sorted = (view as any).filteredIdeas as IdeaFile[];
            expect(sorted[0].frontmatter.category).toBe('game');
            expect(sorted[1].frontmatter.category).toBe('saas');
        });
    });

    describe('applyFilters', () => {
        it('should call repository.getIdeasByFilter with current filters', async () => {
            const testFilter = { categories: ['saas'] };
            (view as any).filters = testFilter;
            (view as any).renderTable = vi.fn();

            const getIdeasByFilterSpy = vi.spyOn(repository, 'getIdeasByFilter').mockResolvedValue([]);

            await (view as any).applyFilters();

            expect(getIdeasByFilterSpy).toHaveBeenCalledWith(testFilter);
        });

        it('should reset to page 1 when filters change', async () => {
            (view as any).currentPage = 3;
            (view as any).filters = { searchText: 'test' };
            (view as any).renderTable = vi.fn();
            vi.spyOn(repository, 'getIdeasByFilter').mockResolvedValue([]);

            await (view as any).applyFilters();

            expect((view as any).currentPage).toBe(1);
        });
    });
});

