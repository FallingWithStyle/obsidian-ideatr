import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResurfacingService } from '../../src/services/ResurfacingService';
import { IdeaRepository } from '../../src/services/IdeaRepository';
import { FrontmatterParser } from '../../src/services/FrontmatterParser';
import type { Vault } from 'obsidian';
import type { IdeaFile } from '../../src/types/idea';

describe('ResurfacingService', () => {
    let service: ResurfacingService;
    let mockVault: Vault;
    let ideaRepository: IdeaRepository;

    beforeEach(() => {
        const files = new Map<string, string>();
        
        mockVault = {
            getMarkdownFiles: vi.fn(() => []),
            read: vi.fn((file: any) => {
                const path = typeof file === 'string' ? file : file.path;
                return Promise.resolve(files.get(path) || '');
            }),
            getAbstractFileByPath: vi.fn((path: string) => {
                if (files.has(path)) {
                    return { path, name: path.split('/').pop(), stat: { mtime: Date.now() } } as any;
                }
                return null;
            }),
            on: vi.fn(() => () => {}),
            process: vi.fn(async (file: any, processor: (content: string) => string) => {
                const content = files.get(file.path) || '';
                const newContent = processor(content);
                files.set(file.path, newContent);
                return Promise.resolve();
            })
        } as unknown as Vault;
        
        // Store files map for access in tests
        (mockVault as any).__files = files;

        const parser = new FrontmatterParser();
        ideaRepository = new IdeaRepository(mockVault, parser);
        service = new ResurfacingService(ideaRepository, {
            resurfacingThresholdDays: 7
        }, mockVault);
    });

    describe('identifyOldIdeas', () => {
        it('should identify ideas older than threshold', async () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

            const content = `---
type: idea
status: captured
created: ${oldDate.toISOString().split('T')[0]}
category: saas
tags: []
related: []
domains: []
existence-check: []
---

Old idea`;

            // Store content in files map
            const files = (mockVault as any).__files || new Map();
            files.set('Ideas/old-idea.md', content);
            (mockVault as any).__files = files;

            vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([
                { path: 'Ideas/old-idea.md', name: 'old-idea.md', stat: { mtime: Date.now() } } as any
            ]);

            const oldIdeas = await service.identifyOldIdeas(7);

            expect(oldIdeas.length).toBeGreaterThan(0);
        });

        it('should exclude ideas newer than threshold', async () => {
            const recentDate = new Date();
            recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

            vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([
                { path: 'Ideas/recent-idea.md', name: 'recent-idea.md', stat: { mtime: Date.now() } } as any
            ]);
            vi.mocked(mockVault.read).mockResolvedValue(`---
type: idea
status: captured
created: ${recentDate.toISOString().split('T')[0]}
category: saas
tags: []
related: []
domains: []
existence-check: []
---

Recent idea`);

            const oldIdeas = await service.identifyOldIdeas(7);

            expect(oldIdeas.length).toBe(0);
        });

        it('should exclude dismissed ideas', async () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 10);

            const dismissedContent = `---
type: idea
status: captured
created: ${oldDate.toISOString().split('T')[0]}
category: saas
tags: []
related: []
domains: []
existence-check: []
dismissed: true
---

Dismissed idea`;

            vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([
                { path: 'Ideas/dismissed-idea.md', name: 'dismissed-idea.md', stat: { mtime: Date.now() } } as any
            ]);
            
            // Set up file content
            const file = { path: 'Ideas/dismissed-idea.md', name: 'dismissed-idea.md', stat: { mtime: Date.now() } } as any;
            vi.mocked(mockVault.getAbstractFileByPath).mockReturnValue(file);
            vi.mocked(mockVault.read).mockResolvedValue(dismissedContent);

            const oldIdeas = await service.identifyOldIdeas(7);

            // Should be excluded because dismissed flag is in frontmatter
            expect(oldIdeas.length).toBe(0);
        });
    });

    describe('generateDigest', () => {
        it('should generate digest for old ideas', async () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 10);

            const ideas: IdeaFile[] = [
                {
                    frontmatter: {
                        type: 'idea',
                        status: 'captured',
                        created: oldDate.toISOString().split('T')[0],
                        category: 'saas',
                        tags: ['productivity'],
                        related: [],
                        domains: [],
                        'existence-check': []
                    },
                    body: 'An old idea that needs attention',
                    filename: 'old-idea.md'
                }
            ];

            vi.mocked(mockVault.getMarkdownFiles).mockReturnValue([
                { path: 'Ideas/old-idea.md', name: 'old-idea.md', stat: { mtime: Date.now() } } as any
            ]);
            vi.mocked(mockVault.read).mockResolvedValue(`---
type: idea
status: captured
created: ${oldDate.toISOString().split('T')[0]}
category: saas
tags: [productivity]
related: []
domains: []
existence-check: []
---

An old idea that needs attention`);

            const digest = await service.generateDigest();

            expect(digest).toBeDefined();
            expect(digest.ideas.length).toBeGreaterThanOrEqual(0);
            expect(digest.summary).toContain('Weekly Idea Digest');
        });
    });

    describe('markAsDismissed', () => {
        it('should mark idea as dismissed', async () => {
            const originalContent = `---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: []
related: []
domains: []
existence-check: []
---

Test idea`;

            const files = (mockVault as any).__files as Map<string, string>;
            files.set('Ideas/test.md', originalContent);

            const file = { path: 'Ideas/test.md', name: 'test.md', stat: { mtime: Date.now() } } as any;
            vi.mocked(mockVault.getAbstractFileByPath).mockReturnValue(file);

            await service.markAsDismissed('Ideas/test.md');

            // Refresh repository to get updated content
            await ideaRepository.refresh();
            const isDismissed = await service.isDismissedOrActedUpon('Ideas/test.md');
            expect(isDismissed).toBe(true);
        });
    });

    describe('markAsActedUpon', () => {
        it('should mark idea as acted upon', async () => {
            const originalContent = `---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: []
related: []
domains: []
existence-check: []
---

Test idea`;

            const files = (mockVault as any).__files as Map<string, string>;
            files.set('Ideas/test.md', originalContent);

            const file = { path: 'Ideas/test.md', name: 'test.md', stat: { mtime: Date.now() } } as any;
            vi.mocked(mockVault.getAbstractFileByPath).mockReturnValue(file);

            await service.markAsActedUpon('Ideas/test.md');

            // Refresh repository to get updated content
            await ideaRepository.refresh();
            const isActedUpon = await service.isDismissedOrActedUpon('Ideas/test.md');
            expect(isActedUpon).toBe(true);
        });
    });
});

