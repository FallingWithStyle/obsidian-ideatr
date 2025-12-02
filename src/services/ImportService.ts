/**
 * ImportService - Handles importing ideas from various formats
 */

import type { Vault } from 'obsidian';
import type { IdeaFrontmatter } from '../types/idea';
import { FrontmatterParser } from './FrontmatterParser';
import { buildFrontmatter } from '../metadata/FrontmatterBuilder';
import { generateFilename } from '../storage/FilenameGenerator';

export interface ImportResult {
    total: number;
    imported: number;
    failed: number;
    errors: Array<{ item: string; error: string }>;
}

export type ImportFormat = 'json' | 'csv' | 'markdown';

export class ImportService {
    private vault: Vault;
    private frontmatterParser: FrontmatterParser;

    constructor(vault: Vault) {
        this.vault = vault;
        this.frontmatterParser = new FrontmatterParser();
    }

    /**
     * Import ideas from specified format
     */
    async importIdeas(content: string, format: ImportFormat): Promise<ImportResult> {
        const result: ImportResult = {
            total: 0,
            imported: 0,
            failed: 0,
            errors: []
        };

        let items: Array<Partial<IdeaFrontmatter> & { title: string; body: string }> = [];

        try {
            switch (format) {
                case 'json':
                    items = this.parseJSON(content);
                    break;
                case 'csv':
                    items = this.parseCSV(content);
                    break;
                case 'markdown':
                    items = this.parseMarkdown(content);
                    break;
                default:
                    throw new Error(`Unsupported import format: ${format}`);
            }
        } catch (error) {
            result.errors.push({
                item: 'parse',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return result;
        }

        result.total = items.length;

        // Import each idea
        for (const item of items) {
            try {
                await this.importIdea(item);
                result.imported++;
            } catch (error) {
                result.failed++;
                result.errors.push({
                    item: item.title || 'unknown',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return result;
    }

    private async importIdea(item: Partial<IdeaFrontmatter> & { title: string; body: string }): Promise<void> {
        // Build frontmatter
        const frontmatter = buildFrontmatter({
            text: item.body,
            timestamp: item.created ? new Date(item.created) : new Date()
        });

        // Merge with imported frontmatter
        const merged: IdeaFrontmatter = {
            ...frontmatter,
            ...item,
            type: 'idea',
            status: item.status || 'captured',
            created: item.created || new Date().toISOString().split('T')[0],
            id: typeof item.id === 'number' ? item.id : 0,
            category: item.category || '',
            tags: item.tags || [],
            related: item.related || [],
            domains: item.domains || [],
            'existence-check': item['existence-check'] || []
        };

        // Generate filename using the standard format
        const createdDate = item.created ? new Date(item.created) : new Date();
        const filename = generateFilename(item.title || item.body, createdDate);

        // Build content
        const yaml = this.frontmatterParser.build(merged, item.body);
        const content = `${yaml}\n\n${item.body}`;

        // Create file
        const path = `Ideas/${filename}`;
        await this.vault.create(path, content);
    }

    private parseJSON(content: string): Array<Partial<IdeaFrontmatter> & { title: string; body: string }> {
        const data = JSON.parse(content);
        if (data.ideas && Array.isArray(data.ideas)) {
            return data.ideas;
        }
        throw new Error('Invalid JSON format: missing ideas array');
    }

    private parseCSV(content: string): Array<Partial<IdeaFrontmatter> & { title: string; body: string }> {
        const lines = content.split('\n');
        if (lines.length < 2) {
            throw new Error('Invalid CSV: no data rows');
        }

        // Skip header row
        lines[0].split(',');
        const items: Array<Partial<IdeaFrontmatter> & { title: string; body: string }> = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const item: any = {
                title: values[0] || 'Untitled',
                created: values[1] || new Date().toISOString().split('T')[0],
                category: values[2] || '',
                tags: values[3] ? values[3].split(';').filter(t => t) : [],
                status: values[4] || 'captured',
                body: values[5] || '',
                related: values[6] ? values[6].split(';').filter(r => r) : [],
                domains: values[7] ? values[7].split(';').filter(d => d) : [],
                'existence-check': values[8] ? values[8].split(';').filter(e => e) : []
            };
            items.push(item);
        }

        return items;
    }

    private parseCSVLine(line: string): string[] {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        return values;
    }

    private parseMarkdown(content: string): Array<Partial<IdeaFrontmatter> & { title: string; body: string }> {
        // Simple markdown parser - looks for ## headings as idea titles
        const items: Array<Partial<IdeaFrontmatter> & { title: string; body: string }> = [];
        const sections = content.split(/^## /m);

        for (let i = 1; i < sections.length; i++) {
            const section = sections[i];
            const lines = section.split('\n');
            const title = lines[0].trim();
            
            // Extract metadata from list items
            const metadata: any = {};
            let bodyStart = 0;
            for (let j = 1; j < lines.length; j++) {
                const line = lines[j];
                if (line.match(/^- /)) {
                    const match = line.match(/^- (\w+): (.+)$/);
                    if (match) {
                        metadata[match[1].toLowerCase()] = match[2];
                    }
                } else if (line.trim() === '') {
                    bodyStart = j + 1;
                    break;
                }
            }

            const body = lines.slice(bodyStart).join('\n').trim();

            items.push({
                title,
                body,
                created: metadata.created || new Date().toISOString().split('T')[0],
                category: metadata.category || '',
                status: metadata.status || 'captured',
                tags: metadata.tags ? metadata.tags.split(',').map((t: string) => t.trim()) : []
            });
        }

        return items;
    }
}

