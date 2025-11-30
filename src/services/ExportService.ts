/**
 * ExportService - Handles exporting ideas to various formats
 */

import type { Vault, TFile } from 'obsidian';
import type { IdeaFrontmatter } from '../types/idea';
import { FrontmatterParser } from './FrontmatterParser';

export interface IdeaExportItem {
    type: string;
    status: string;
    created: string;
    category: string;
    tags: string[];
    related: string[];
    domains: string[];
    'existence-check': string[];
    elevated?: string;
    projectPath?: string;
    title: string;
    body: string;
    filename: string;
    path: string;
}

export interface IdeaExport {
    version: string;
    exportedAt: string;
    totalIdeas: number;
    ideas: IdeaExportItem[];
}

export type ExportFormat = 'json' | 'csv' | 'markdown';

export class ExportService {
    private vault: Vault;
    private frontmatterParser: FrontmatterParser;

    constructor(vault: Vault) {
        this.vault = vault;
        this.frontmatterParser = new FrontmatterParser();
    }

    /**
     * Export all ideas to specified format
     */
    async exportIdeas(format: ExportFormat): Promise<string> {
        const allFiles = this.vault.getMarkdownFiles();
        const ideaFiles = allFiles.filter(file => 
            file.path.startsWith('Ideas/') && 
            !file.path.startsWith('Ideas/Archived/')
        );

        const ideas: IdeaExportItem[] = [];

        for (const file of ideaFiles) {
            try {
                const content = await this.vault.read(file);
                const parsed = this.frontmatterParser.parse(content);
                
                // Extract title from filename or first line
                const title = file.basename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' ');

                ideas.push({
                    ...parsed.frontmatter,
                    title,
                    body: parsed.body,
                    filename: file.name,
                    path: file.path
                });
            } catch (error) {
                console.warn(`Failed to export ${file.path}:`, error);
            }
        }

        const exportData: IdeaExport = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            totalIdeas: ideas.length,
            ideas
        };

        switch (format) {
            case 'json':
                return this.exportJSON(exportData);
            case 'csv':
                return this.exportCSV(exportData);
            case 'markdown':
                return this.exportMarkdown(exportData);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    private exportJSON(data: IdeaExport): string {
        return JSON.stringify(data, null, 2);
    }

    private exportCSV(data: IdeaExport): string {
        const rows: string[] = [];
        
        // Header
        rows.push('title,created,category,tags,status,body,related,domains,existence-check');
        
        // Data rows
        for (const idea of data.ideas) {
            const row = [
                this.escapeCSV(idea.title),
                idea.created,
                idea.category || '',
                idea.tags.join(';'),
                idea.status,
                this.escapeCSV(idea.body.replace(/\n/g, ' ')),
                idea.related.join(';'),
                idea.domains.join(';'),
                idea['existence-check'].join(';')
            ];
            rows.push(row.join(','));
        }
        
        return rows.join('\n');
    }

    private exportMarkdown(data: IdeaExport): string {
        // For markdown bundle, we'd create a directory structure
        // For now, return a simple markdown document listing all ideas
        const lines: string[] = [];
        lines.push(`# Ideas Export`);
        lines.push(`Exported: ${data.exportedAt}`);
        lines.push(`Total Ideas: ${data.totalIdeas}`);
        lines.push('');
        
        for (const idea of data.ideas) {
            lines.push(`## ${idea.title}`);
            lines.push(`- Created: ${idea.created}`);
            lines.push(`- Category: ${idea.category || 'none'}`);
            lines.push(`- Status: ${idea.status}`);
            lines.push(`- Tags: ${idea.tags.join(', ') || 'none'}`);
            lines.push('');
            lines.push(idea.body);
            lines.push('');
            lines.push('---');
            lines.push('');
        }
        
        return lines.join('\n');
    }

    private escapeCSV(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
}

