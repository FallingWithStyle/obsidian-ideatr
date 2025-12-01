/**
 * Tests for ImportService
 * Tests import validation and data integrity
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Vault, TFile } from '../../test/mocks/obsidian';
import { ImportService, ImportResult } from '../../src/services/ImportService';

describe('ImportService', () => {
    let service: ImportService;
    let mockVault: Vault;

    beforeEach(() => {
        mockVault = {
            create: vi.fn().mockResolvedValue({} as TFile),
        } as any;

        service = new ImportService(mockVault);
    });

    describe('importIdeas - JSON format', () => {
        it('should import ideas from JSON format', async () => {
            const jsonContent = JSON.stringify({
                version: '1.0',
                exportedAt: new Date().toISOString(),
                totalIdeas: 1,
                ideas: [{
                    title: 'Test Idea',
                    body: 'Test content',
                    type: 'idea',
                    status: 'captured',
                    created: '2025-01-15',
                    category: 'app',
                    tags: ['test'],
                    related: [],
                    domains: [],
                    'existence-check': []
                }]
            });

            const result = await service.importIdeas(jsonContent, 'json');

            expect(result.total).toBe(1);
            expect(result.imported).toBe(1);
            expect(result.failed).toBe(0);
            expect(mockVault.create).toHaveBeenCalled();
        });

        it('should handle missing ideas array in JSON', async () => {
            const invalidJson = JSON.stringify({
                version: '1.0',
            });

            const result = await service.importIdeas(invalidJson, 'json');

            expect(result.total).toBe(0);
            expect(result.failed).toBe(0);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0].item).toBe('parse');
        });

        it('should handle invalid JSON', async () => {
            const invalidJson = '{ invalid json }';

            const result = await service.importIdeas(invalidJson, 'json');

            expect(result.total).toBe(0);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0].item).toBe('parse');
        });

        it('should import multiple ideas from JSON', async () => {
            const jsonContent = JSON.stringify({
                version: '1.0',
                exportedAt: new Date().toISOString(),
                totalIdeas: 2,
                ideas: [
                    {
                        title: 'Idea 1',
                        body: 'Content 1',
                        type: 'idea',
                        status: 'captured',
                        created: '2025-01-15',
                    },
                    {
                        title: 'Idea 2',
                        body: 'Content 2',
                        type: 'idea',
                        status: 'validated',
                        created: '2025-01-16',
                    }
                ]
            });

            const result = await service.importIdeas(jsonContent, 'json');

            expect(result.total).toBe(2);
            expect(result.imported).toBe(2);
            expect(mockVault.create).toHaveBeenCalledTimes(2);
        });
    });

    describe('importIdeas - CSV format', () => {
        it('should import ideas from CSV format', async () => {
            const csvContent = `title,created,category,tags,status,body,related,domains,existence-check
Test Idea,2025-01-15,app,test;idea,captured,Test content,,,`;

            const result = await service.importIdeas(csvContent, 'csv');

            expect(result.total).toBe(1);
            expect(result.imported).toBe(1);
            expect(mockVault.create).toHaveBeenCalled();
        });

        it('should handle empty CSV', async () => {
            const csvContent = `title,created,category,tags,status,body,related,domains,existence-check`;

            const result = await service.importIdeas(csvContent, 'csv');

            expect(result.total).toBe(0);
            expect(result.imported).toBe(0);
        });

        it('should parse CSV with quoted values', async () => {
            const csvContent = `title,created,category,tags,status,body,related,domains,existence-check
"Test, Idea",2025-01-15,app,test,captured,"Content, with, commas",,,`;

            const result = await service.importIdeas(csvContent, 'csv');

            expect(result.total).toBe(1);
            expect(result.imported).toBe(1);
        });

        it('should parse CSV with escaped quotes', async () => {
            const csvContent = `title,created,category,tags,status,body,related,domains,existence-check
Test "Idea",2025-01-15,app,test,captured,"Content with ""quotes""",,,`;

            const result = await service.importIdeas(csvContent, 'csv');

            expect(result.total).toBe(1);
            expect(result.imported).toBe(1);
        });

        it('should handle CSV with semicolon-separated arrays', async () => {
            const csvContent = `title,created,category,tags,status,body,related,domains,existence-check
Test Idea,2025-01-15,app,tag1;tag2,captured,Content,related1;related2,domain1,check1;check2`;

            const result = await service.importIdeas(csvContent, 'csv');

            expect(result.total).toBe(1);
            expect(result.imported).toBe(1);
        });

        it('should handle missing values in CSV', async () => {
            const csvContent = `title,created,category,tags,status,body,related,domains,existence-check
Test Idea,2025-01-15,,,captured,Content,,,`;

            const result = await service.importIdeas(csvContent, 'csv');

            expect(result.total).toBe(1);
            expect(result.imported).toBe(1);
        });
    });

    describe('importIdeas - Markdown format', () => {
        it('should import ideas from Markdown format', async () => {
            const markdownContent = `## Test Idea
- Created: 2025-01-15
- Category: app
- Status: captured
- Tags: test, idea

Test content
`;

            const result = await service.importIdeas(markdownContent, 'markdown');

            expect(result.total).toBe(1);
            expect(result.imported).toBe(1);
            expect(mockVault.create).toHaveBeenCalled();
        });

        it('should import multiple ideas from Markdown', async () => {
            const markdownContent = `## Idea 1
- Created: 2025-01-15
- Status: captured

Content 1

---

## Idea 2
- Created: 2025-01-16
- Status: validated

Content 2
`;

            const result = await service.importIdeas(markdownContent, 'markdown');

            expect(result.total).toBe(2);
            expect(result.imported).toBe(2);
        });

        it('should handle Markdown without metadata', async () => {
            const markdownContent = `## Test Idea

Test content
`;

            const result = await service.importIdeas(markdownContent, 'markdown');

            expect(result.total).toBe(1);
            expect(result.imported).toBe(1);
        });

        it('should parse tags from Markdown metadata', async () => {
            const markdownContent = `## Test Idea
- Tags: test, idea, project

Content
`;

            const result = await service.importIdeas(markdownContent, 'markdown');

            expect(result.total).toBe(1);
            expect(result.imported).toBe(1);
        });
    });

    describe('error handling', () => {
        it('should handle vault create errors', async () => {
            (mockVault.create as any).mockRejectedValueOnce(new Error('Create failed'));

            const jsonContent = JSON.stringify({
                version: '1.0',
                ideas: [{
                    title: 'Test Idea',
                    body: 'Content',
                }]
            });

            const result = await service.importIdeas(jsonContent, 'json');

            expect(result.total).toBe(1);
            expect(result.imported).toBe(0);
            expect(result.failed).toBe(1);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0].item).toBe('Test Idea');
        });

        it('should continue importing after individual failures', async () => {
            (mockVault.create as any)
                .mockResolvedValueOnce({} as TFile)
                .mockRejectedValueOnce(new Error('Create failed'))
                .mockResolvedValueOnce({} as TFile);

            const jsonContent = JSON.stringify({
                version: '1.0',
                ideas: [
                    { title: 'Idea 1', body: 'Content 1' },
                    { title: 'Idea 2', body: 'Content 2' },
                    { title: 'Idea 3', body: 'Content 3' },
                ]
            });

            const result = await service.importIdeas(jsonContent, 'json');

            expect(result.total).toBe(3);
            expect(result.imported).toBe(2);
            expect(result.failed).toBe(1);
            expect(result.errors.length).toBe(1);
        });

        it('should throw error for unsupported format', async () => {
            const result = await service.importIdeas('content', 'xml' as any);

            expect(result.total).toBe(0);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0].item).toBe('parse');
        });
    });

    describe('data integrity', () => {
        it('should set default values for missing fields', async () => {
            const jsonContent = JSON.stringify({
                version: '1.0',
                ideas: [{
                    title: 'Test Idea',
                    body: 'Content',
                }]
            });

            await service.importIdeas(jsonContent, 'json');

            const createCall = (mockVault.create as any).mock.calls[0];
            const content = createCall[1];
            
            expect(content).toContain('type: idea');
            expect(content).toContain('status: captured');
        });

        it('should preserve imported frontmatter values', async () => {
            const jsonContent = JSON.stringify({
                version: '1.0',
                ideas: [{
                    title: 'Test Idea',
                    body: 'Content',
                    status: 'validated',
                    category: 'app',
                    tags: ['test', 'idea'],
                    created: '2025-01-15',
                }]
            });

            await service.importIdeas(jsonContent, 'json');

            const createCall = (mockVault.create as any).mock.calls[0];
            const content = createCall[1];
            
            expect(content).toContain('status: validated');
            expect(content).toContain('category: app');
            expect(content).toContain('tags');
            expect(content).toContain('test');
            expect(content).toContain('idea');
            expect(content).toContain('created: 2025-01-15');
        });

        it('should generate filename from title', async () => {
            const jsonContent = JSON.stringify({
                version: '1.0',
                ideas: [{
                    title: 'Test Idea',
                    body: 'Content',
                    created: '2025-01-15',
                }]
            });

            await service.importIdeas(jsonContent, 'json');

            const createCall = (mockVault.create as any).mock.calls[0];
            const path = createCall[0];
            
            // Filename format: Title.md (no date prefix)
            expect(path).toMatch(/^Ideas\//);
            expect(path.toLowerCase()).toContain('test');
            expect(path.toLowerCase()).toContain('idea');
            expect(path).toMatch(/\.md$/);
        });

        it('should create file with proper format', async () => {
            const jsonContent = JSON.stringify({
                version: '1.0',
                ideas: [{
                    title: 'Test Idea',
                    body: 'Test content',
                }]
            });

            await service.importIdeas(jsonContent, 'json');

            const createCall = (mockVault.create as any).mock.calls[0];
            const content = createCall[1];
            
            // Should have frontmatter
            expect(content).toMatch(/^---\n/);
            expect(content).toContain('\n---\n\n');
            // Should have body
            expect(content).toContain('Test content');
        });
    });
});

