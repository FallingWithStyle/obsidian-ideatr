/**
 * Tests for jsonRepair.ts
 * Tests JSON repair and extraction functions
 */

import { describe, it, expect } from 'vitest';
import { repairJSON, extractAndRepairJSON } from '../../src/utils/jsonRepair';

describe('jsonRepair', () => {
    describe('repairJSON', () => {
        it('should repair missing closing brace', () => {
            const incomplete = '{"key": "value"';
            const repaired = repairJSON(incomplete);

            expect(() => JSON.parse(repaired)).not.toThrow();
            const parsed = JSON.parse(repaired);
            expect(parsed.key).toBe('value');
        });

        it('should repair missing closing bracket', () => {
            const incomplete = '["item1", "item2"';
            const repaired = repairJSON(incomplete);

            expect(() => JSON.parse(repaired)).not.toThrow();
            const parsed = JSON.parse(repaired);
            expect(Array.isArray(parsed)).toBe(true);
        });

        it('should repair nested structures', () => {
            const incomplete = '{"outer": {"inner": "value"';
            const repaired = repairJSON(incomplete);

            expect(() => JSON.parse(repaired)).not.toThrow();
        });

        it('should remove trailing commas', () => {
            const withTrailing = '{"key": "value",}';
            const repaired = repairJSON(withTrailing);

            expect(() => JSON.parse(repaired)).not.toThrow();
        });

        it('should handle already valid JSON', () => {
            const valid = '{"key": "value"}';
            const repaired = repairJSON(valid);

            expect(repaired).toBe(valid);
            expect(() => JSON.parse(repaired)).not.toThrow();
        });

        it('should handle empty object', () => {
            const empty = '{}';
            const repaired = repairJSON(empty);

            expect(repaired).toBe(empty);
            expect(() => JSON.parse(repaired)).not.toThrow();
        });

        it('should handle empty array', () => {
            const empty = '[]';
            const repaired = repairJSON(empty);

            expect(repaired).toBe(empty);
            expect(() => JSON.parse(repaired)).not.toThrow();
        });

        it('should handle incomplete string', () => {
            const incomplete = '{"key": "incomplete string';
            const repaired = repairJSON(incomplete);

            // Should close the string and object
            expect(repaired).toContain('"');
            expect(repaired).toContain('}');
        });

        it('should handle multiple missing closing braces', () => {
            const incomplete = '{"level1": {"level2": {"level3": "value"';
            const repaired = repairJSON(incomplete);

            expect(() => JSON.parse(repaired)).not.toThrow();
        });
    });

    describe('extractAndRepairJSON', () => {
        it('should extract JSON from markdown code block', () => {
            const content = '```json\n{"key": "value"}\n```';
            const extracted = extractAndRepairJSON(content);

            expect(() => JSON.parse(extracted)).not.toThrow();
            const parsed = JSON.parse(extracted);
            expect(parsed.key).toBe('value');
        });

        it('should extract JSON from code block without language tag', () => {
            const content = '```\n{"key": "value"}\n```';
            const extracted = extractAndRepairJSON(content);

            expect(() => JSON.parse(extracted)).not.toThrow();
        });

        it('should remove common LLM prefixes', () => {
            const content = 'Here is the response:\n{"key": "value"}';
            const extracted = extractAndRepairJSON(content);

            expect(() => JSON.parse(extracted)).not.toThrow();
            const parsed = JSON.parse(extracted);
            expect(parsed.key).toBe('value');
        });

        it('should extract array when isArray is true', () => {
            const content = 'Here is the array:\n[{"item": "value"}]';
            const extracted = extractAndRepairJSON(content, true);

            expect(() => JSON.parse(extracted)).not.toThrow();
            const parsed = JSON.parse(extracted);
            expect(Array.isArray(parsed)).toBe(true);
        });

        it('should extract object when isArray is false', () => {
            const content = 'Here is the object:\n{"key": "value"}';
            const extracted = extractAndRepairJSON(content, false);

            expect(() => JSON.parse(extracted)).not.toThrow();
            const parsed = JSON.parse(extracted);
            expect(typeof parsed).toBe('object');
            expect(Array.isArray(parsed)).toBe(false);
        });

        it('should add opening brace for incomplete object', () => {
            const content = '"key": "value"}';
            const extracted = extractAndRepairJSON(content, false);

            expect(extracted.startsWith('{')).toBe(true);
            expect(() => JSON.parse(extracted)).not.toThrow();
        });

        it('should add opening bracket for incomplete array', () => {
            const content = '"item1", "item2"]';
            const extracted = extractAndRepairJSON(content, true);

            expect(extracted.startsWith('[')).toBe(true);
            expect(() => JSON.parse(extracted)).not.toThrow();
        });

        it('should handle text before JSON', () => {
            const content = 'Some explanation text\n{"key": "value"}';
            const extracted = extractAndRepairJSON(content);

            expect(() => JSON.parse(extracted)).not.toThrow();
        });

        it('should repair incomplete JSON from LLM response', () => {
            const incomplete = '```json\n{"key": "value"\n```';
            const extracted = extractAndRepairJSON(incomplete);

            expect(() => JSON.parse(extracted)).not.toThrow();
        });

        it('should handle nested incomplete structures', () => {
            const incomplete = '{"outer": {"inner": "value"';
            const extracted = extractAndRepairJSON(incomplete);

            expect(() => JSON.parse(extracted)).not.toThrow();
        });
    });
});

