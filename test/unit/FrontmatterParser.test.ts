import { describe, it, expect } from 'vitest';
import { FrontmatterParser } from '../../src/services/FrontmatterParser';
import type { IdeaFrontmatter } from '../../src/types/idea';

describe('FrontmatterParser', () => {
    let parser: FrontmatterParser;

    beforeEach(() => {
        parser = new FrontmatterParser();
    });

    describe('parseFrontmatter', () => {
        it('should parse valid frontmatter with all fields', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
id: 42
category: saas
tags: [productivity, tool]
related: [idea1.md, idea2.md]
domains: [example.com]
existence-check: [Found similar product]
---`;

            const result = parser.parseFrontmatter(content);

            expect(result).not.toBeNull();
            expect(result?.type).toBe('idea');
            expect(result?.status).toBe('captured');
            expect(result?.created).toBe('2025-11-28');
            expect(result?.id).toBe(42);
            expect(result?.category).toBe('saas');
            expect(result?.tags).toEqual(['productivity', 'tool']);
            expect(result?.related).toEqual(['idea1.md', 'idea2.md']);
            expect(result?.domains).toEqual(['example.com']);
            expect(result?.['existence-check']).toEqual(['Found similar product']);
        });

        it('should parse frontmatter with empty arrays', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
category: 
tags: []
related: []
domains: []
existence-check: []
---`;

            const result = parser.parseFrontmatter(content);

            expect(result).not.toBeNull();
            expect(result?.id).toBe(0); // Defaults to 0 if missing
            expect(result?.tags).toEqual([]);
            expect(result?.related).toEqual([]);
            expect(result?.domains).toEqual([]);
            expect(result?.['existence-check']).toEqual([]);
        });

        it('should parse frontmatter with empty category', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
category: 
tags: []
related: []
domains: []
existence-check: []
---`;

            const result = parser.parseFrontmatter(content);

            expect(result).not.toBeNull();
            expect(result?.id).toBe(0); // Defaults to 0 if missing
            expect(result?.category).toBe('');
        });

        it('should return null for content without frontmatter', () => {
            const content = 'This is just plain text without frontmatter';

            const result = parser.parseFrontmatter(content);

            expect(result).toBeNull();
        });

        it('should return null for content with incomplete frontmatter', () => {
            const content = `---
type: idea
status: captured
---`;

            // Missing required fields (created) - should return null
            const result = parser.parseFrontmatter(content);
            expect(result).toBeNull();
        });

        it('should handle frontmatter with extra whitespace', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: [productivity, tool]
related: []
domains: []
existence-check: []
---`;

            const result = parser.parseFrontmatter(content);

            expect(result).not.toBeNull();
            expect(result?.id).toBe(0); // Defaults to 0 if missing
            expect(result?.category).toBe('saas');
        });

        it('should handle array values with spaces', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: [productivity, tool, automation]
related: []
domains: []
existence-check: []
---`;

            const result = parser.parseFrontmatter(content);

            expect(result).not.toBeNull();
            expect(result?.id).toBe(0); // Defaults to 0 if missing
            expect(result?.tags).toEqual(['productivity', 'tool', 'automation']);
        });

        it('should handle single-item arrays', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: [productivity]
related: []
domains: []
existence-check: []
---`;

            const result = parser.parseFrontmatter(content);

            expect(result).not.toBeNull();
            expect(result?.id).toBe(0); // Defaults to 0 if missing
            expect(result?.tags).toEqual(['productivity']);
        });

        it('should default id to 0 when id field is missing', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: []
related: []
domains: []
existence-check: []
---`;

            const result = parser.parseFrontmatter(content);

            expect(result).not.toBeNull();
            expect(result?.id).toBe(0);
        });

        it('should parse id when explicitly provided', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
id: 123
category: saas
tags: []
related: []
domains: []
existence-check: []
---`;

            const result = parser.parseFrontmatter(content);

            expect(result).not.toBeNull();
            expect(result?.id).toBe(123);
        });
    });

    describe('parseIdeaFile', () => {
        it('should parse complete idea file with frontmatter and body', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: [productivity]
related: []
domains: []
existence-check: []
---

This is the idea body text.`;

            const file = { path: 'Ideas/test-idea.md', name: 'test-idea.md' };
            const result = parser.parseIdeaFile(file, content);

            expect(result.filename).toBe('test-idea.md');
            expect(result.frontmatter.type).toBe('idea');
            expect(result.frontmatter.id).toBe(0); // Defaults to 0 if missing
            expect(result.frontmatter.category).toBe('saas');
            expect(result.body).toBe('This is the idea body text.');
        });

        it('should handle file with no body', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: []
related: []
domains: []
existence-check: []
---`;

            const file = { path: 'Ideas/test-idea.md', name: 'test-idea.md' };
            const result = parser.parseIdeaFile(file, content);

            expect(result.body).toBe('');
        });

        it('should handle file with multiline body', () => {
            const content = `---
type: idea
status: captured
created: 2025-11-28
category: saas
tags: []
related: []
domains: []
existence-check: []
---

This is line one.
This is line two.
This is line three.`;

            const file = { path: 'Ideas/test-idea.md', name: 'test-idea.md' };
            const result = parser.parseIdeaFile(file, content);

            expect(result.body).toContain('This is line one.');
            expect(result.body).toContain('This is line two.');
            expect(result.body).toContain('This is line three.');
        });
    });

    describe('validateFrontmatter', () => {
        it('should validate correct frontmatter structure', () => {
            const frontmatter: IdeaFrontmatter = {
                type: 'idea',
                status: 'captured',
                created: '2025-11-28',
                id: 0,
                category: 'saas',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };

            const result = parser.validateFrontmatter(frontmatter);

            expect(result).toBe(true);
        });

        it('should reject frontmatter with missing type', () => {
            const frontmatter: any = {
                status: 'captured',
                created: '2025-11-28',
                category: 'saas',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };

            const result = parser.validateFrontmatter(frontmatter);

            expect(result).toBe(false);
        });

        it('should reject frontmatter with missing status', () => {
            const frontmatter: any = {
                type: 'idea',
                created: '2025-11-28',
                id: 0,
                category: 'saas',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };

            const result = parser.validateFrontmatter(frontmatter);

            expect(result).toBe(false);
        });

        it('should reject frontmatter with missing created', () => {
            const frontmatter: any = {
                type: 'idea',
                status: 'captured',
                id: 0,
                category: 'saas',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };

            const result = parser.validateFrontmatter(frontmatter);

            expect(result).toBe(false);
        });

        it('should reject frontmatter with invalid type', () => {
            const frontmatter: any = {
                type: 'invalid',
                status: 'captured',
                created: '2025-11-28',
                id: 0,
                category: 'saas',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };

            const result = parser.validateFrontmatter(frontmatter);

            expect(result).toBe(false);
        });

        it('should reject frontmatter with invalid status', () => {
            const frontmatter: any = {
                type: 'idea',
                status: 'invalid',
                created: '2025-11-28',
                id: 0,
                category: 'saas',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };

            const result = parser.validateFrontmatter(frontmatter);

            expect(result).toBe(false);
        });

        it('should accept frontmatter with empty category', () => {
            const frontmatter: IdeaFrontmatter = {
                type: 'idea',
                status: 'captured',
                created: '2025-11-28',
                id: 0,
                category: '',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };

            const result = parser.validateFrontmatter(frontmatter);

            expect(result).toBe(true);
        });

        it('should validate arrays are actually arrays', () => {
            const frontmatter: any = {
                type: 'idea',
                status: 'captured',
                created: '2025-11-28',
                id: 0,
                category: 'saas',
                tags: 'not-an-array',
                related: [],
                domains: [],
                'existence-check': []
            };

            const result = parser.validateFrontmatter(frontmatter);

            expect(result).toBe(false);
        });
    });
});

