import type { IFrontmatterParser } from '../types/management';
import type { IdeaFile, IdeaFrontmatter } from '../types/idea';
import { frontmatterToYAML } from '../metadata/FrontmatterBuilder';

/**
 * FrontmatterParser - Parses YAML frontmatter from idea files
 * Uses regex-based parsing (v1 approach, no external dependencies)
 */
export class FrontmatterParser implements IFrontmatterParser {
    /**
     * Parse frontmatter from file content
     * @param content - Full file content including frontmatter
     * @returns Parsed frontmatter or null if invalid
     */
    parseFrontmatter(content: string): IdeaFrontmatter | null {
        // Extract frontmatter block
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);

        if (!match || !match[1]) {
            return null;
        }

        const frontmatterBlock = match[1];

        // Parse key-value pairs
        const frontmatter: Partial<IdeaFrontmatter> = {};

        // Required fields - use line-by-line parsing to handle empty values correctly
        const lines = frontmatterBlock.split('\n');
        let type: string | null = null;
        let status: string | null = null;
        let created: string | null = null;
        let category = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('type:')) {
                type = trimmed.substring(5).trim();
            } else if (trimmed.startsWith('status:')) {
                status = trimmed.substring(7).trim();
            } else if (trimmed.startsWith('created:')) {
                created = trimmed.substring(8).trim();
            } else if (trimmed.startsWith('category:')) {
                category = trimmed.substring(9).trim();
            }
        }

        if (!type || !status || !created) {
            return null;
        }

        frontmatter.type = type as 'idea';
        frontmatter.status = status as 'captured' | 'elevated';
        frontmatter.created = created;
        frontmatter.category = category;

        // Array fields
        frontmatter.tags = this.parseArrayField(frontmatterBlock, 'tags');
        frontmatter.related = this.parseArrayField(frontmatterBlock, 'related');
        frontmatter.domains = this.parseArrayField(frontmatterBlock, 'domains');
        frontmatter['existence-check'] = this.parseArrayField(frontmatterBlock, 'existence-check');

        // Parse optional fields (for elevation)
        const elevatedMatch = frontmatterBlock.match(/^elevated:\s*(.+)$/m);
        const projectPathMatch = frontmatterBlock.match(/^projectPath:\s*(.+)$/m);
        if (elevatedMatch) {
            frontmatter.elevated = elevatedMatch[1].trim();
        }
        if (projectPathMatch) {
            frontmatter.projectPath = projectPathMatch[1].trim();
        }

        // Parse optional fields (for resurfacing)
        const dismissedMatch = frontmatterBlock.match(/^dismissed:\s*(.+)$/m);
        const actedUponMatch = frontmatterBlock.match(/^actedUpon:\s*(.+)$/m);
        if (dismissedMatch) {
            (frontmatter as any).dismissed = dismissedMatch[1].trim().toLowerCase() === 'true';
        }
        if (actedUponMatch) {
            (frontmatter as any).actedUpon = actedUponMatch[1].trim().toLowerCase() === 'true';
        }

        // Validate parsed frontmatter
        if (!this.validateFrontmatter(frontmatter)) {
            return null;
        }

        return frontmatter as IdeaFrontmatter;
    }

    /**
     * Parse array field from frontmatter block
     * Handles formats: [] or [item1, item2, item3]
     */
    private parseArrayField(block: string, fieldName: string): string[] {
        const regex = new RegExp(`^${fieldName}:\\s*(.+)$`, 'm');
        const match = block.match(regex);

        if (!match) {
            return [];
        }

        const value = match[1].trim();

        // Empty array
        if (value === '[]') {
            return [];
        }

        // Array with items: [item1, item2, item3]
        const arrayMatch = value.match(/^\[(.+)\]$/);
        if (arrayMatch) {
            const items = arrayMatch[1]
                .split(',')
                .map(item => item.trim())
                .filter(item => item.length > 0);
            return items;
        }

        return [];
    }

    /**
     * Parse complete idea file from file and content
     * @param file - File object with path and name
     * @param content - File content
     * @returns Complete idea file structure
     */
    parseIdeaFile(file: { path: string; name: string }, content: string): IdeaFile {
        const frontmatter = this.parseFrontmatter(content);

        if (!frontmatter) {
            // Return default frontmatter if parsing fails
            const defaultFrontmatter: IdeaFrontmatter = {
                type: 'idea',
                status: 'captured',
                created: new Date().toISOString().split('T')[0],
                category: '',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };
            return {
                frontmatter: defaultFrontmatter,
                body: this.extractBody(content),
                filename: file.name
            };
        }

        return {
            frontmatter,
            body: this.extractBody(content),
            filename: file.name
        };
    }

    /**
     * Parse content and return frontmatter and body
     * Convenience method that combines parseFrontmatter and extractBody
     * Returns default frontmatter if parsing fails
     */
    parse(content: string): { frontmatter: IdeaFrontmatter; body: string } {
        const frontmatter = this.parseFrontmatter(content);
        const body = this.extractBody(content);
        
        // If frontmatter parsing fails, return default frontmatter
        if (!frontmatter) {
            const defaultFrontmatter: IdeaFrontmatter = {
                type: 'idea',
                status: 'captured',
                created: new Date().toISOString().split('T')[0],
                category: '',
                tags: [],
                related: [],
                domains: [],
                'existence-check': []
            };
            return { frontmatter: defaultFrontmatter, body };
        }
        
        return { frontmatter, body };
    }

    /**
     * Build complete file content from frontmatter and body
     * @param frontmatter - Frontmatter object
     * @param body - Body text
     * @returns Complete file content with frontmatter and body
     */
    build(frontmatter: IdeaFrontmatter, body: string): string {
        const yaml = frontmatterToYAML(frontmatter);
        return `${yaml}\n\n${body}`;
    }

    /**
     * Extract body text from file content (remove frontmatter)
     */
    private extractBody(content: string): string {
        const frontmatterRegex = /^---\n[\s\S]*?\n---(\n\n?|\n?)/;
        const body = content.replace(frontmatterRegex, '');
        return body.trim();
    }

    /**
     * Validate frontmatter structure
     * @param frontmatter - Frontmatter object to validate
     * @returns True if valid, false otherwise
     */
    validateFrontmatter(frontmatter: any): boolean {
        // Check required fields
        if (!frontmatter.type || frontmatter.type !== 'idea') {
            return false;
        }

        if (!frontmatter.status || (frontmatter.status !== 'captured' && frontmatter.status !== 'elevated')) {
            return false;
        }

        if (!frontmatter.created || typeof frontmatter.created !== 'string') {
            return false;
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(frontmatter.created)) {
            return false;
        }

        // Check category is string (can be empty)
        if (frontmatter.category !== undefined && typeof frontmatter.category !== 'string') {
            return false;
        }

        // Check arrays are actually arrays
        const arrayFields: (keyof IdeaFrontmatter)[] = ['tags', 'related', 'domains', 'existence-check'];
        for (const field of arrayFields) {
            if (frontmatter[field] !== undefined && !Array.isArray(frontmatter[field])) {
                return false;
            }
        }

        return true;
    }
}

