import { describe, it, expect } from 'vitest';
import { parseTagsInput, parseDateRange, paginate } from '../../src/views/dashboardUtils';

describe('dashboardUtils', () => {
    describe('parseTagsInput', () => {
        it('should split comma-separated tags into trimmed array (QA 4.1)', () => {
            const input = ' saas,  productivity , , tools ';
            const result = parseTagsInput(input);

            expect(result).toEqual(['saas', 'productivity', 'tools']);
        });

        it('should return empty array for empty input', () => {
            expect(parseTagsInput('')).toEqual([]);
        });
    });

    describe('parseDateRange', () => {
        it('should return dateRange when both dates are valid (QA 4.1)', () => {
            const range = parseDateRange('2025-11-01', '2025-11-30');

            expect(range).toBeDefined();
            expect(range!.start).toBeInstanceOf(Date);
            expect(range!.end).toBeInstanceOf(Date);
            expect(range!.start.toISOString().startsWith('2025-11-01')).toBe(true);
            expect(range!.end.toISOString().startsWith('2025-11-30')).toBe(true);
        });

        it('should return undefined when either date is missing or invalid', () => {
            expect(parseDateRange(undefined, '2025-11-30')).toBeUndefined();
            expect(parseDateRange('2025-11-01', undefined)).toBeUndefined();
            expect(parseDateRange('not-a-date', '2025-11-30')).toBeUndefined();
        });
    });

    describe('paginate', () => {
        it('should return correct items for a given page and perPage (QA 4.1 pagination)', () => {
            const items = Array.from({ length: 10 }, (_, i) => i + 1);

            const { pageItems, totalPages } = paginate(items, 2, 3);

            expect(totalPages).toBe(4);
            expect(pageItems).toEqual([4, 5, 6]);
        });

        it('should clamp page within valid bounds', () => {
            const items = [1, 2, 3];

            const { pageItems: tooLow } = paginate(items, 0, 2);
            const { pageItems: tooHigh } = paginate(items, 10, 2);

            expect(tooLow).toEqual([1, 2]);
            expect(tooHigh).toEqual([3]);
        });

        it('should fall back to all items when perPage is non-positive', () => {
            const items = [1, 2, 3];
            const { pageItems, totalPages } = paginate(items, 1, 0);

            expect(totalPages).toBe(1);
            expect(pageItems).toEqual(items);
        });
    });
});


