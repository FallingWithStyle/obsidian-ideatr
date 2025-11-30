/**
 * Helper utilities for template management
 * Can be extended in the future for user-customizable templates
 */

import type { ScaffoldTemplate } from '../types/transformation';

/**
 * Validate template structure
 */
export function validateTemplate(template: ScaffoldTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.id || template.id.trim().length === 0) {
        errors.push('Template must have an id');
    }

    if (!template.name || template.name.trim().length === 0) {
        errors.push('Template must have a name');
    }

    if (!Array.isArray(template.categories) || template.categories.length === 0) {
        errors.push('Template must have at least one category');
    }

    if (!Array.isArray(template.sections) || template.sections.length === 0) {
        errors.push('Template must have at least one section');
    }

    template.sections.forEach((section, index) => {
        if (!section.title || section.title.trim().length === 0) {
            errors.push(`Section ${index + 1} must have a title`);
        }
        if (!section.content || section.content.trim().length === 0) {
            errors.push(`Section ${index + 1} must have content`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Extract variables from template content
 */
export function extractVariables(content: string): string[] {
    const variablePattern = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(content)) !== null) {
        if (!variables.includes(match[1])) {
            variables.push(match[1]);
        }
    }

    return variables;
}

/**
 * Check if all required variables are provided
 */
export function validateVariables(
    content: string,
    providedVariables: Record<string, string>
): { valid: boolean; missing: string[] } {
    const required = extractVariables(content);
    const missing = required.filter(v => !(v in providedVariables));

    return {
        valid: missing.length === 0,
        missing
    };
}

