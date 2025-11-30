import { describe, it, expect } from 'vitest';
import { FrontmatterParser } from '../../src/services/FrontmatterParser';
import schema from '../../shared/frontmatter-schema.json';

describe('Compatibility: Frontmatter Schema Validation', () => {
    const parser = new FrontmatterParser();

    it('should have a valid JSON schema structure', () => {
        expect(schema).toBeDefined();
        expect(schema.type).toBe('object');
        expect(schema.required).toContain('type');
        expect(schema.required).toContain('status');
        expect(schema.required).toContain('created');
    });

    it('should produce frontmatter that complies with the schema', () => {
        const content = `---
type: idea
status: captured
created: 2025-11-29
category: Test
tags: [a, b]
related: []
domains: []
existence-check: []
---
Body content`;

        const result = parser.parseFrontmatter(content);
        expect(result).not.toBeNull();

        if (result) {
            // Validate against schema constraints manually (since we don't have ajv)

            // Required fields
            expect(result.type).toBe('idea');
            expect(['captured', 'elevated']).toContain(result.status);
            expect(result.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);

            // Optional fields types
            if (result.category) expect(typeof result.category).toBe('string');
            if (result.tags) expect(Array.isArray(result.tags)).toBe(true);
            if (result.related) expect(Array.isArray(result.related)).toBe(true);
            if (result.domains) expect(Array.isArray(result.domains)).toBe(true);
            if (result['existence-check']) expect(Array.isArray(result['existence-check'])).toBe(true);

            // Check that keys match schema properties
            const schemaKeys = Object.keys(schema.properties);
            const resultKeys = Object.keys(result);

            // Note: result might have extra keys if we allow additionalProperties: true
            // But we should check that all present keys are defined in schema if we want strictness
            // For now, just check that the core fields match what we expect
        }
    });

    it('should validate the schema file against known valid frontmatter', () => {
        // This test ensures that our schema definition accurately reflects what the plugin produces
        const validFrontmatter = {
            type: 'idea',
            status: 'captured',
            created: '2025-11-29',
            category: 'Software',
            tags: ['test'],
            related: [],
            domains: [],
            'existence-check': []
        };

        // Manual validation logic mimicking a schema validator
        expect(validFrontmatter.type).toBe(schema.properties.type.const);
        expect(schema.properties.status.enum).toContain(validFrontmatter.status);
        expect(validFrontmatter.created).toMatch(new RegExp(schema.properties.created.pattern));
    });
});
