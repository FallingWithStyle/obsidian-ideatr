/**
 * Type definitions for Ideatr Project Internal plugin
 */

/**
 * Frontmatter structure for idea files
 */
export interface IdeaFrontmatter {
    type: 'idea';
    status: 'captured' | 'elevated';
    created: string; // ISO 8601 date (YYYY-MM-DD)
    category: string; // Empty string for Day 0, populated by AI later
    tags: string[];  // Empty array for Day 0, populated by AI later
    related: string[]; // Empty array for Day 0, populated later
    domains: string[]; // Empty array for Day 0, populated later
    'existence-check': string[]; // Empty array for Day 0, populated later
    elevated?: string; // ISO 8601 date (YYYY-MM-DD) - elevation date
    projectPath?: string; // Path to project folder (e.g., "Projects/my-project")
}

/**
 * Input data for creating an idea
 */
export interface IdeaInput {
    text: string;
    timestamp: Date;
}

/**
 * Complete idea file structure
 */
export interface IdeaFile {
    frontmatter: IdeaFrontmatter;
    body: string;
    filename: string;
}

/**
 * Validation result for idea input
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitizedText?: string;
}
