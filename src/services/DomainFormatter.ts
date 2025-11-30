import type { DomainCheckResult } from '../types/domain';

/**
 * Format domain check results for frontmatter storage
 * 
 * Converts DomainCheckResult[] to string[] format:
 * - "domain.com (available)" for available domains
 * - "domain.com (taken)" for taken domains
 * - "domain.com (error: <message>)" for errors
 */
export function formatDomainResultsForFrontmatter(
    results: DomainCheckResult[]
): string[] {
    return results.map(result => {
        if (result.error) {
            return `${result.domain} (error: ${result.error})`;
        }
        if (result.available) {
            return `${result.domain} (available)`;
        }
        return `${result.domain} (taken)`;
    });
}

