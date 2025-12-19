/**
 * Tests for templateHelpers.ts
 * Tests template validation and variable extraction
 */

import { describe, it, expect } from 'vitest';
import { validateTemplate, extractVariables, validateVariables } from '../../src/utils/templateHelpers';
import type { ScaffoldTemplate } from '../../src/types/transformation';

describe('templateHelpers', () => {
    describe('validateTemplate', () => {
        it('should validate a complete template', () => {
            const template: ScaffoldTemplate = {
                id: 'test-template',
                name: 'Test Template',
                categories: ['app'],
                sections: [
                    {
                        title: 'Section 1',
                        content: 'Content 1'
                    }
                ]
            };

            const result = validateTemplate(template);

            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should reject template without id', () => {
            const template: any = {
                name: 'Test Template',
                categories: ['app'],
                sections: [{ title: 'Section 1', content: 'Content 1' }]
            };

            const result = validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Template must have an id');
        });

        it('should reject template with empty id', () => {
            const template: any = {
                id: '   ',
                name: 'Test Template',
                categories: ['app'],
                sections: [{ title: 'Section 1', content: 'Content 1' }]
            };

            const result = validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Template must have an id');
        });

        it('should reject template without name', () => {
            const template: any = {
                id: 'test-template',
                categories: ['app'],
                sections: [{ title: 'Section 1', content: 'Content 1' }]
            };

            const result = validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Template must have a name');
        });

        it('should reject template without categories', () => {
            const template: any = {
                id: 'test-template',
                name: 'Test Template',
                categories: [],
                sections: [{ title: 'Section 1', content: 'Content 1' }]
            };

            const result = validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Template must have at least one category');
        });

        it('should reject template without sections', () => {
            const template: any = {
                id: 'test-template',
                name: 'Test Template',
                categories: ['app'],
                sections: []
            };

            const result = validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Template must have at least one section');
        });

        it('should reject section without title', () => {
            const template: any = {
                id: 'test-template',
                name: 'Test Template',
                categories: ['app'],
                sections: [
                    { content: 'Content 1' }
                ]
            };

            const result = validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Section 1 must have a title');
        });

        it('should reject section without content', () => {
            const template: any = {
                id: 'test-template',
                name: 'Test Template',
                categories: ['app'],
                sections: [
                    { title: 'Section 1' }
                ]
            };

            const result = validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Section 1 must have content');
        });

        it('should report all validation errors', () => {
            const template: any = {
                id: '',
                name: '',
                categories: [],
                sections: []
            };

            const result = validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });

    describe('extractVariables', () => {
        it('should extract single variable', () => {
            const content = 'Hello {{name}}';
            const variables = extractVariables(content);

            expect(variables).toEqual(['name']);
        });

        it('should extract multiple variables', () => {
            const content = 'Hello {{name}}, you are {{age}} years old';
            const variables = extractVariables(content);

            expect(variables).toEqual(['name', 'age']);
        });

        it('should not duplicate variables', () => {
            const content = 'Hello {{name}}, {{name}} is repeated';
            const variables = extractVariables(content);

            expect(variables).toEqual(['name']);
        });

        it('should return empty array when no variables', () => {
            const content = 'Hello world';
            const variables = extractVariables(content);

            expect(variables).toEqual([]);
        });

        it('should handle variables with underscores', () => {
            const content = 'Hello {{user_name}}';
            const variables = extractVariables(content);

            expect(variables).toEqual(['user_name']);
        });

        it('should handle nested variable patterns', () => {
            const content = '{{var1}} and {{var2}} and {{var3}}';
            const variables = extractVariables(content);

            expect(variables.length).toBe(3);
        });
    });

    describe('validateVariables', () => {
        it('should validate when all variables are provided', () => {
            const content = 'Hello {{name}}, you are {{age}} years old';
            const provided = { name: 'John', age: '30' };

            const result = validateVariables(content, provided);

            expect(result.valid).toBe(true);
            expect(result.missing.length).toBe(0);
        });

        it('should report missing variables', () => {
            const content = 'Hello {{name}}, you are {{age}} years old';
            const provided = { name: 'John' };

            const result = validateVariables(content, provided);

            expect(result.valid).toBe(false);
            expect(result.missing).toContain('age');
        });

        it('should report all missing variables', () => {
            const content = 'Hello {{name}}, you are {{age}} years old from {{city}}';
            const provided = { name: 'John' };

            const result = validateVariables(content, provided);

            expect(result.valid).toBe(false);
            expect(result.missing).toContain('age');
            expect(result.missing).toContain('city');
        });

        it('should validate when no variables are in content', () => {
            const content = 'Hello world';
            const provided = {};

            const result = validateVariables(content, provided);

            expect(result.valid).toBe(true);
            expect(result.missing.length).toBe(0);
        });

        it('should allow extra variables in provided object', () => {
            const content = 'Hello {{name}}';
            const provided = { name: 'John', extra: 'value' };

            const result = validateVariables(content, provided);

            expect(result.valid).toBe(true);
        });
    });
});

