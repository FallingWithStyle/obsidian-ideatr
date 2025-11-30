/**
 * Utility functions for formatting name variants
 */

import type { NameVariant } from '../types/transformation';

/**
 * Format variants as markdown for file body
 */
export function formatVariantsForMarkdown(variants: NameVariant[], maxVariants: number = 10): string {
    if (variants.length === 0) {
        return '## Name Variants\n\n(No variants generated)';
    }

    // Deduplicate (case-insensitive)
    const unique = new Map<string, NameVariant>();
    for (const variant of variants) {
        const key = variant.text.toLowerCase();
        if (!unique.has(key)) {
            unique.set(key, variant);
        }
    }
    
    // Sort alphabetically
    const sorted = Array.from(unique.values())
        .sort((a, b) => a.text.localeCompare(b.text))
        .slice(0, maxVariants);
    
    // Format as markdown
    const lines = sorted.map(v => `- ${v.text} (${v.type})`);
    return `## Name Variants\n\n${lines.join('\n')}`;
}

/**
 * Group variants by type
 */
export function groupVariantsByType(variants: NameVariant[]): Record<string, NameVariant[]> {
    const grouped: Record<string, NameVariant[]> = {};
    
    for (const variant of variants) {
        if (!grouped[variant.type]) {
            grouped[variant.type] = [];
        }
        grouped[variant.type].push(variant);
    }
    
    return grouped;
}

