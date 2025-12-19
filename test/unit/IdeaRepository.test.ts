import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdeaRepository } from '../../src/services/IdeaRepository';
import { FrontmatterParser } from '../../src/services/FrontmatterParser';
import type { Vault } from 'obsidian';
import { TFile } from '../mocks/obsidian';
import type { IdeaFile } from '../../src/types/idea';
import type { IdeaFilter } from '../../src/types/management';

// Helper to create TFile instances
function createTFile(path: string): TFile {
    const file = new TFile();
    file.path = path;
    file.name = path.split('/').pop() || path;
    return file;
}

// Mock Vault API
function createMockVault(): Vault {
    const files = new Map<string, { file: TFile; content: string }>();

    const createFile = (path: string, content: string): TFile => {
        const file = createTFile(path);
        files.set(path, { file, content });
        return file;
    };

    const vault = {
        getMarkdownFiles: vi.fn(() => {
            return Array.from(files.values()).map(f => f.file);
        }),
        read: vi.fn(async (file: TFile) => {
            const entry = files.get(file.path);
            return entry ? entry.content : '';
        }),
        getAbstractFileByPath: vi.fn((path: string) => {
            const entry = files.get(path);
            return entry ? entry.file : null;
        }),
        on: vi.fn((event: string, callback: (file: TFile) => void) => {
            // Each registration returns a distinct unsubscribe function so tests
            // can verify that all listeners are cleaned up properly.
            const unsubscribe = vi.fn();
            return unsubscribe;
        })
    } as unknown as Vault;

    return vault;
}

describe('IdeaRepository', () => {
    let vault: Vault;
    let parser: FrontmatterParser;
    let repository: IdeaRepository;

    beforeEach(() => {
        vault = createMockVault();
        parser = new FrontmatterParser();
        repository = new IdeaRepository(vault, parser);
    });

    describe('getAllIdeas', () => {
        it('should return empty array when no ideas exist', async () => {
            vi.mocked(vault.getMarkdownFiles).mockReturnValue([]);

            const ideas = await repository.getAllIdeas();

            expect(ideas).toEqual([]);
        });

        it('should return all ideas from Ideas/ directory', async () => {
            const file1 = createTFile('Ideas/idea-1.md');
            const file2 = createTFile('Ideas/idea-2.md');

            vi.mocked(vault.getMarkdownFiles).mockReturnValue([file1, file2]);
            vi.mocked(vault.read)
                .mockResolvedValueOnce(`---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: []
related: []
domains: []
existence-check: []
---

Idea 1 body`)
                .mockResolvedValueOnce(`---
type: idea
status: captured
created: 2025-11-27
category: game
tags: []
related: []
domains: []
existence-check: []
---

Idea 2 body`);

            const ideas = await repository.getAllIdeas();

            expect(ideas).toHaveLength(2);
            expect(ideas[0].filename).toBe('idea-1.md');
            expect(ideas[0].frontmatter.category).toBe('saas');
            expect(ideas[1].filename).toBe('idea-2.md');
            expect(ideas[1].frontmatter.category).toBe('game');
        });

        it('should filter out files not in Ideas/ directory', async () => {
            const ideaFile = createTFile('Ideas/idea-1.md');
            const otherFile = createTFile('Other/note.md');

            vi.mocked(vault.getMarkdownFiles).mockReturnValue([ideaFile, otherFile]);
            vi.mocked(vault.read).mockResolvedValueOnce(`---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: []
related: []
domains: []
existence-check: []
---

Idea body`);

            const ideas = await repository.getAllIdeas();

            expect(ideas).toHaveLength(1);
            expect(ideas[0].filename).toBe('idea-1.md');
        });

        it('should handle files with invalid frontmatter gracefully', async () => {
            const file = createTFile('Ideas/invalid.md');

            vi.mocked(vault.getMarkdownFiles).mockReturnValue([file]);
            vi.mocked(vault.read).mockResolvedValueOnce('Invalid content without frontmatter');

            const ideas = await repository.getAllIdeas();

            // Should still return an idea with default frontmatter
            expect(ideas).toHaveLength(1);
            expect(ideas[0].frontmatter.type).toBe('idea');
        });

    });

    describe('getIdeaByPath', () => {
        it('should return idea when file exists', async () => {
            const file = createTFile('Ideas/idea-1.md');

            vi.mocked(vault.getAbstractFileByPath).mockReturnValue(file);
            vi.mocked(vault.read).mockResolvedValueOnce(`---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: []
related: []
domains: []
existence-check: []
---

Idea body`);

            const idea = await repository.getIdeaByPath('Ideas/idea-1.md');

            expect(idea).not.toBeNull();
            expect(idea?.filename).toBe('idea-1.md');
            expect(idea?.frontmatter.category).toBe('saas');
        });

        it('should return null when file does not exist', async () => {
            vi.mocked(vault.getAbstractFileByPath).mockReturnValue(null);

            const idea = await repository.getIdeaByPath('Ideas/nonexistent.md');

            expect(idea).toBeNull();
        });

        it('should return null when file is not in Ideas/ directory', async () => {
            const file = createTFile('Other/note.md');

            vi.mocked(vault.getAbstractFileByPath).mockReturnValue(file);

            const idea = await repository.getIdeaByPath('Other/note.md');

            expect(idea).toBeNull();
        });
    });

    describe('getIdeasByFilter', () => {
        beforeEach(async () => {
            // Setup test data
            const files = [
                createTFile('Ideas/idea-1.md'),
                createTFile('Ideas/idea-2.md'),
                createTFile('Ideas/idea-3.md')
            ];

            const contents = [
                `---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: [productivity, tool]
related: []
domains: []
existence-check: []
---

SaaS idea`,
                `---
type: idea
status: captured
created: 2025-11-27
category: game
tags: [fun, puzzle]
related: []
domains: []
existence-check: []
---

Game idea`,
                `---
type: idea
status: captured
created: 2025-11-26
category: 
tags: []
related: []
domains: []
existence-check: []
---

Uncategorized idea`
            ];

            vi.mocked(vault.getMarkdownFiles).mockReturnValue(files);
            vi.mocked(vault.read).mockImplementation(async (file: TFile) => {
                const index = files.findIndex(f => f.path === file.path);
                return contents[index] || '';
            });

            // Pre-populate cache
            await repository.getAllIdeas();
        });

        it('should filter by category', async () => {
            const filter: IdeaFilter = {
                categories: ['saas']
            };

            const ideas = await repository.getIdeasByFilter(filter);

            expect(ideas).toHaveLength(1);
            expect(ideas[0].frontmatter.category).toBe('saas');
        });

        it('should filter by multiple categories', async () => {
            const filter: IdeaFilter = {
                categories: ['saas', 'game']
            };

            const ideas = await repository.getIdeasByFilter(filter);

            expect(ideas).toHaveLength(2);
            expect(ideas.map(i => i.frontmatter.category).sort()).toEqual(['game', 'saas']);
        });

        it('should filter by tags', async () => {
            const filter: IdeaFilter = {
                tags: ['productivity']
            };

            const ideas = await repository.getIdeasByFilter(filter);

            expect(ideas).toHaveLength(1);
            expect(ideas[0].frontmatter.tags).toContain('productivity');
        });

        it('should filter by multiple tags', async () => {
            const filter: IdeaFilter = {
                tags: ['productivity', 'fun']
            };

            const ideas = await repository.getIdeasByFilter(filter);

            expect(ideas).toHaveLength(2);
        });

        it('should filter uncategorized ideas', async () => {
            const filter: IdeaFilter = {
                uncategorized: true
            };

            const ideas = await repository.getIdeasByFilter(filter);

            expect(ideas).toHaveLength(1);
            expect(ideas[0].frontmatter.category).toBe('');
        });

        it('should filter by search text in title', async () => {
            const filter: IdeaFilter = {
                searchText: 'SaaS'
            };

            const ideas = await repository.getIdeasByFilter(filter);

            expect(ideas).toHaveLength(1);
            expect(ideas[0].body).toContain('SaaS');
        });

        it('should filter by search text in body', async () => {
            const filter: IdeaFilter = {
                searchText: 'Game'
            };

            const ideas = await repository.getIdeasByFilter(filter);

            expect(ideas).toHaveLength(1);
            expect(ideas[0].body).toContain('Game');
        });

        it('should combine multiple filters', async () => {
            const filter: IdeaFilter = {
                categories: ['saas'],
                tags: ['productivity']
            };

            const ideas = await repository.getIdeasByFilter(filter);

            expect(ideas).toHaveLength(1);
            expect(ideas[0].frontmatter.category).toBe('saas');
            expect(ideas[0].frontmatter.tags).toContain('productivity');
        });

        it('should return all ideas when filter is empty', async () => {
            const filter: IdeaFilter = {};

            const ideas = await repository.getIdeasByFilter(filter);

            expect(ideas).toHaveLength(3);
        });

        it('should use cached ideas when available and avoid re-reading vault (QA 4.4)', async () => {
            const filter: IdeaFilter = {
                categories: ['saas']
            };

            // First call has already populated cache in beforeEach via getAllIdeas
            // Reset getMarkdownFiles mock call count so we can assert additional calls
            vi.mocked(vault.getMarkdownFiles).mockClear();

            const ideas = await repository.getIdeasByFilter(filter);

            expect(ideas).toHaveLength(1);
            expect(ideas[0].frontmatter.category).toBe('saas');
            // getIdeasByFilter should use in-memory cache and not call getMarkdownFiles again
            expect(vault.getMarkdownFiles).not.toHaveBeenCalled();
        });
    });

    describe('watchIdeas', () => {
        it('should register file watcher and return unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = repository.watchIdeas(callback);

            expect(vault.on).toHaveBeenCalled();
            expect(typeof unsubscribe).toBe('function');
        });

        it('should unsubscribe all registered listeners (modify/create/delete) (QA 4.5)', () => {
            const callback = vi.fn();
            const unsubscribe = repository.watchIdeas(callback);

            const onMock = vi.mocked(vault.on);
            // Expect three registrations: modify, create, delete
            expect(onMock).toHaveBeenCalledTimes(3);

            // Collect unsubscribe functions returned from each registration
            const unregisters = onMock.mock.results.map(result => result.value as () => void);
            unregisters.forEach(fn => expect(fn).toBeTypeOf('function'));

            unsubscribe();

            unregisters.forEach(fn => {
                expect(fn).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('refresh', () => {
        it('should clear cache and reload ideas', async () => {
            const file = createTFile('Ideas/idea-1.md');

            vi.mocked(vault.getMarkdownFiles).mockReturnValue([file]);
            vi.mocked(vault.read).mockResolvedValueOnce(`---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: []
related: []
domains: []
existence-check: []
---

Idea body`);

            await repository.getAllIdeas();
            expect(vault.getMarkdownFiles).toHaveBeenCalledTimes(1);

            await repository.refresh();
            expect(vault.getMarkdownFiles).toHaveBeenCalledTimes(2);
        });
    });
});

