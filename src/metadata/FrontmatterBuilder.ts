import type { IdeaFrontmatter, IdeaInput } from '../types/idea';
import { generateIdeaId, generateUniqueId } from '../utils/IdeaIdGenerator';

/**
 * FrontmatterBuilder - Generates YAML frontmatter for idea files
 */

/**
 * Build frontmatter object with default values
 * @param idea - Input data for the idea
 * @param existingIds - Optional array of existing IDs to avoid conflicts
 */
export function buildFrontmatter(idea: IdeaInput, existingIds?: number[]): IdeaFrontmatter {
    const id = existingIds ? generateUniqueId(existingIds) : generateIdeaId();
    
    return {
        type: 'idea',
        status: 'captured',
        created: formatDateISO(idea.timestamp),
        id,
        category: '',
        tags: [],
        related: [],
        domains: [],
        'existence-check': []
    };
}

/**
 * Convert frontmatter object to YAML string
 */
export function frontmatterToYAML(frontmatter: IdeaFrontmatter): string {
    const lines = [
        '---',
        `type: ${frontmatter.type}`,
        `status: ${frontmatter.status}`,
        `created: ${frontmatter.created}`,
        `id: ${frontmatter.id ?? 0}`,
        `category: ${frontmatter.category || ''}`,
        `tags: ${arrayToYAML(frontmatter.tags)}`,
        `related: ${arrayToYAML(frontmatter.related)}`,
        `domains: ${arrayToYAML(frontmatter.domains)}`,
        `existence-check: ${arrayToYAML(frontmatter['existence-check'])}`
    ];

    // Add optional fields if present
    if (frontmatter.elevated) {
        lines.push(`elevated: ${frontmatter.elevated}`);
    }
    if (frontmatter.projectPath) {
        lines.push(`projectPath: ${frontmatter.projectPath}`);
    }
    if (frontmatter.codename) {
        lines.push(`codename: ${frontmatter.codename}`);
    }

    lines.push('---');
    return lines.join('\n');
}

/**
 * Format date as ISO 8601 (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Convert array to YAML format
 * Empty arrays: []
 * Non-empty arrays: [item1, item2, item3]
 * Handles both string and number arrays
 */
function arrayToYAML(arr: string[] | number[]): string {
    if (arr.length === 0) {
        return '[]';
    }
    return `[${arr.join(', ')}]`;
}

/**
 * Validate YAML frontmatter string
 * Basic validation - checks for opening/closing delimiters
 */
export function validateFrontmatter(yaml: string): boolean {
    const lines = yaml.trim().split('\n');
    if (lines.length < 2) {
        return false;
    }
    return lines[0] === '---' && lines[lines.length - 1] === '---';
}
