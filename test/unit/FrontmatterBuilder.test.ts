import { describe, it, expect } from 'vitest';
import {
    buildFrontmatter,
    frontmatterToYAML,
    validateFrontmatter
} from '../../src/metadata/FrontmatterBuilder';

describe('FrontmatterBuilder', () => {
    describe('buildFrontmatter', () => {
        it('should create frontmatter with correct type and status', () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };
            const frontmatter = buildFrontmatter(idea);

            expect(frontmatter.type).toBe('idea');
            expect(frontmatter.status).toBe('captured');
        });

        it('should format created date as YYYY-MM-DD', () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };
            const frontmatter = buildFrontmatter(idea);

            expect(frontmatter.created).toBe('2025-11-28');
        });

        it('should initialize category as empty string', () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };
            const frontmatter = buildFrontmatter(idea);

            expect(frontmatter.category).toBe('');
        });

        it('should initialize id as 0', () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };
            const frontmatter = buildFrontmatter(idea);

            expect(frontmatter.id).toBe(0);
        });

        it('should initialize all arrays as empty', () => {
            const idea = {
                text: 'Test idea',
                timestamp: new Date('2025-11-28T17:00:00Z')
            };
            const frontmatter = buildFrontmatter(idea);

            expect(frontmatter.tags).toEqual([]);
            expect(frontmatter.related).toEqual([]);
            expect(frontmatter.domains).toEqual([]);
            expect(frontmatter['existence-check']).toEqual([]);
        });
    });

    describe('frontmatterToYAML', () => {
        it('should generate valid YAML with delimiters', () => {
            const frontmatter = {
                type: 'idea' as const,
                status: 'captured' as const,
                created: '2025-11-28',
                id: 0,
                category: '',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };
            const yaml = frontmatterToYAML(frontmatter);

            expect(yaml.startsWith('---')).toBe(true);
            expect(yaml.endsWith('---')).toBe(true);
        });

        it('should include all required fields', () => {
            const frontmatter = {
                type: 'idea' as const,
                status: 'captured' as const,
                created: '2025-11-28',
                id: 0,
                category: '',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };
            const yaml = frontmatterToYAML(frontmatter);

            expect(yaml).toContain('type: idea');
            expect(yaml).toContain('status: captured');
            expect(yaml).toContain('created: 2025-11-28');
            expect(yaml).toContain('id: 0');
            expect(yaml).toContain('category:');
            expect(yaml).toContain('tags:');
            expect(yaml).toContain('related:');
            expect(yaml).toContain('domains:');
            expect(yaml).toContain('existence-check:');
        });

        it('should format empty arrays as []', () => {
            const frontmatter = {
                type: 'idea' as const,
                status: 'captured' as const,
                created: '2025-11-28',
                id: 0,
                category: '',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };
            const yaml = frontmatterToYAML(frontmatter);

            expect(yaml).toContain('tags: []');
            expect(yaml).toContain('related: []');
            expect(yaml).toContain('domains: []');
            expect(yaml).toContain('existence-check: []');
        });

        it('should format non-empty arrays correctly', () => {
            const frontmatter = {
                type: 'idea' as const,
                status: 'captured' as const,
                created: '2025-11-28',
                id: 0,
                category: 'saas',
                tags: ['productivity', 'tool'],
                related: [],
                domains: ['example.com'],
                'existence-check': []
            };
            const yaml = frontmatterToYAML(frontmatter);

            expect(yaml).toContain('tags: [productivity, tool]');
            expect(yaml).toContain('domains: [example.com]');
        });

        it('should handle category with value', () => {
            const frontmatter = {
                type: 'idea' as const,
                status: 'captured' as const,
                created: '2025-11-28',
                id: 0,
                category: 'game',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };
            const yaml = frontmatterToYAML(frontmatter);

            expect(yaml).toContain('category: game');
        });
    });

    describe('validateFrontmatter', () => {
        it('should validate correct YAML with delimiters', () => {
            const yaml = '---\ntype: idea\n---';
            expect(validateFrontmatter(yaml)).toBe(true);
        });

        it('should reject YAML without opening delimiter', () => {
            const yaml = 'type: idea\n---';
            expect(validateFrontmatter(yaml)).toBe(false);
        });

        it('should reject YAML without closing delimiter', () => {
            const yaml = '---\ntype: idea';
            expect(validateFrontmatter(yaml)).toBe(false);
        });

        it('should reject empty string', () => {
            expect(validateFrontmatter('')).toBe(false);
        });

        it('should reject single line', () => {
            expect(validateFrontmatter('---')).toBe(false);
        });

        it('should validate multi-line YAML', () => {
            const yaml = '---\ntype: idea\nstatus: captured\ncreated: 2025-11-28\n---';
            expect(validateFrontmatter(yaml)).toBe(true);
        });
    });
});
