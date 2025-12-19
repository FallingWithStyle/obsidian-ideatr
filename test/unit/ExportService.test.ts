/**
 * Tests for ExportService
 * Tests export formats and data integrity
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Vault, TFile } from '../../test/mocks/obsidian';
import { ExportService, IdeaExport } from '../../src/services/ExportService';

// Mock Logger
vi.mock('../../src/utils/logger', () => ({
    Logger: {
        warn: vi.fn(),
    }
}));

describe('ExportService', () => {
    let service: ExportService;
    let mockVault: Vault;
    let mockFiles: TFile[];

    beforeEach(() => {
        mockFiles = [
            {
                path: 'Ideas/2025-01-15-test-idea.md',
                name: '2025-01-15-test-idea.md',
                basename: '2025-01-15-test-idea',
            } as TFile,
            {
                path: 'Ideas/2025-01-16-another-idea.md',
                name: '2025-01-16-another-idea.md',
                basename: '2025-01-16-another-idea',
            } as TFile,
        ];

        mockVault = {
            getMarkdownFiles: vi.fn(() => mockFiles),
            read: vi.fn(),
        } as any;

        service = new ExportService(mockVault);
    });

    describe('exportIdeas', () => {
        it('should export ideas in JSON format', async () => {
            const content1 = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: [test, idea]
---
Test idea content
`;

            const content2 = `---
type: idea
status: validated
created: 2025-01-16
category: web
tags: [web, project]
---
Another idea content
`;

            (mockVault.read as any)
                .mockResolvedValueOnce(content1)
                .mockResolvedValueOnce(content2);

            const result = await service.exportIdeas('json');
            const parsed = JSON.parse(result) as IdeaExport;

            expect(parsed.version).toBe('1.0');
            expect(parsed.totalIdeas).toBe(2);
            expect(parsed.ideas.length).toBe(2);
            expect(parsed.ideas[0].title).toBe('test idea');
            expect(parsed.ideas[0].body).toBe('Test idea content');
            expect(parsed.ideas[0].status).toBe('captured');
        });

        it('should export ideas in CSV format', async () => {
            const content = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: [test]
related: []
domains: []
existence-check: []
---
Test idea content
`;

            (mockVault.read as any).mockResolvedValue(content);

            const result = await service.exportIdeas('csv');

            expect(result).toContain('title,created,category,tags,status,body,related,domains,existence-check');
            expect(result).toContain('test idea');
            expect(result).toContain('2025-01-15');
            expect(result).toContain('app');
            expect(result).toContain('captured');
        });

        it('should export ideas in Markdown format', async () => {
            const content = `---
type: idea
status: captured
created: 2025-01-15
category: app
tags: [test, idea]
---
Test idea content
`;

            (mockVault.read as any).mockResolvedValue(content);

            const result = await service.exportIdeas('markdown');

            expect(result).toContain('# Ideas Export');
            expect(result).toContain('## test idea');
            expect(result).toContain('Created: 2025-01-15');
            expect(result).toContain('Category: app');
            expect(result).toContain('Status: captured');
            expect(result).toContain('Tags: test, idea');
            expect(result).toContain('Test idea content');
        });

        it('should filter out archived ideas', async () => {
            const archivedFile = {
                path: 'Ideas/Archived/2025-01-10-old-idea.md',
                name: '2025-01-10-old-idea.md',
                basename: '2025-01-10-old-idea',
            } as TFile;

            mockFiles.push(archivedFile);
            (mockVault.read as any).mockResolvedValue('---\ntype: idea\n---\nContent');

            const result = await service.exportIdeas('json');
            const parsed = JSON.parse(result) as IdeaExport;

            expect(parsed.totalIdeas).toBe(2); // Should not include archived
        });

        it('should only include files from Ideas/ directory', async () => {
            const otherFile = {
                path: 'Other/2025-01-15-not-an-idea.md',
                name: '2025-01-15-not-an-idea.md',
                basename: '2025-01-15-not-an-idea',
            } as TFile;

            mockFiles.push(otherFile);
            (mockVault.read as any).mockResolvedValue('---\ntype: idea\n---\nContent');

            const result = await service.exportIdeas('json');
            const parsed = JSON.parse(result) as IdeaExport;

            expect(parsed.totalIdeas).toBe(2); // Should not include other directory
        });

        it('should handle read errors gracefully', async () => {
            // Only 2 files in mockFiles, so we'll have 1 success and 1 failure
            (mockVault.read as any)
                .mockResolvedValueOnce('---\ntype: idea\n---\nContent 1')
                .mockRejectedValueOnce(new Error('Read failed'));

            const result = await service.exportIdeas('json');
            const parsed = JSON.parse(result) as IdeaExport;

            // Should continue processing and export successful reads
            expect(parsed.totalIdeas).toBe(1);
        });

        it('should extract title from filename', async () => {
            const content = `---
type: idea
---
Content
`;

            (mockVault.read as any).mockResolvedValue(content);

            const result = await service.exportIdeas('json');
            const parsed = JSON.parse(result) as IdeaExport;

            expect(parsed.ideas[0].title).toBe('test idea');
            expect(parsed.ideas[0].filename).toBe('2025-01-15-test-idea.md');
        });

        it('should include exportedAt timestamp', async () => {
            (mockVault.read as any).mockResolvedValue('---\ntype: idea\n---\nContent');

            const before = new Date();
            const result = await service.exportIdeas('json');
            const after = new Date();
            const parsed = JSON.parse(result) as IdeaExport;

            const exportedAt = new Date(parsed.exportedAt);
            expect(exportedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(exportedAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should throw error for unsupported format', async () => {
            await expect(service.exportIdeas('xml' as any)).rejects.toThrow('Unsupported export format');
        });
    });

    describe('CSV export', () => {
        it('should escape commas in CSV values', async () => {
            // Title comes from filename, so we need a filename with commas
            mockFiles[0].name = '2025-01-15-idea, with, commas.md';
            mockFiles[0].basename = '2025-01-15-idea, with, commas';
            
            const content = `---
type: idea
---
Content with, commas
`;

            (mockVault.read as any).mockResolvedValue(content);

            const result = await service.exportIdeas('csv');

            // Body should be escaped if it contains commas
            expect(result).toContain('"Content with, commas"');
        });

        it('should escape quotes in CSV values', async () => {
            const content = `---
type: idea
---
Content with "quotes" in it
`;

            (mockVault.read as any).mockResolvedValue(content);

            const result = await service.exportIdeas('csv');

            // Quotes should be escaped in CSV
            expect(result).toContain('""');
        });

        it('should handle empty tags and related arrays', async () => {
            const content = `---
type: idea
tags: []
related: []
domains: []
existence-check: []
---
Content
`;

            (mockVault.read as any).mockResolvedValue(content);

            const result = await service.exportIdeas('csv');

            // Should not throw and should handle empty arrays
            expect(result).toBeDefined();
        });
    });

    describe('Markdown export', () => {
        it('should format multiple ideas with separators', async () => {
            const content = `---
type: idea
---
Content
`;

            (mockVault.read as any)
                .mockResolvedValueOnce(content)
                .mockResolvedValueOnce(content);

            const result = await service.exportIdeas('markdown');

            // Should have separators between ideas (--- on its own line)
            expect(result).toContain('\n---\n');
        });

        it('should handle ideas without tags', async () => {
            const content = `---
type: idea
tags: []
---
Content
`;

            (mockVault.read as any).mockResolvedValue(content);

            const result = await service.exportIdeas('markdown');

            expect(result).toContain('Tags: none');
        });
    });
});

