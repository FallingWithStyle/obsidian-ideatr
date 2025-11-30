import type { IdeaFilter } from '../types/management';

/**
 * Parse a comma-separated tags string into an array of trimmed, non-empty tags.
 * Used by the dashboard filter UI to support multi-tag filtering (QA 4.1).
 */
export function parseTagsInput(value: string): string[] {
    return value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
}

/**
 * Build a dateRange filter from two YYYY-MM-DD strings.
 * Returns undefined if either date is missing or invalid.
 */
export function parseDateRange(
    start: string | undefined,
    end: string | undefined
): IdeaFilter['dateRange'] | undefined {
    if (!start || !end) {
        return undefined;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return undefined;
    }

    return { start: startDate, end: endDate };
}

/**
 * Simple pagination helper for dashboard tables.
 * Returns the items for the requested page and the total number of pages.
 */
export function paginate<T>(
    items: T[],
    page: number,
    perPage: number
): { pageItems: T[]; totalPages: number } {
    const safePerPage = perPage > 0 ? perPage : items.length || 1;
    const totalPages = Math.max(1, Math.ceil(items.length / safePerPage));
    const currentPage = Math.min(Math.max(1, page), totalPages);

    const start = (currentPage - 1) * safePerPage;
    const end = start + safePerPage;

    return {
        pageItems: items.slice(start, end),
        totalPages
    };
}


