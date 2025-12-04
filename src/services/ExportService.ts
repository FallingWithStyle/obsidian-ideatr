/**
 * ExportService - Handles exporting ideas to various formats
 */

import type { Vault } from 'obsidian';
import { FrontmatterParser } from './FrontmatterParser';
import { Logger } from '../utils/logger';
import type { IIdeaRepository } from '../types/management';
import { RelatedIdConverter } from '../utils/RelatedIdConverter';

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
    private ideaRepository: IIdeaRepository;

    constructor(vault: Vault, ideaRepository: IIdeaRepository) {
        this.vault = vault;
        this.frontmatterParser = new FrontmatterParser();
        this.ideaRepository = ideaRepository;
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

        const idConverter = new RelatedIdConverter(this.ideaRepository);
        
        for (const file of ideaFiles) {
            try {
                const content = await this.vault.read(file);
                const parsed = this.frontmatterParser.parse(content);
                
                // Extract title from filename or first line
                const title = file.basename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' ');

                // Convert related IDs to paths for export
                const relatedIds = Array.isArray(parsed.frontmatter.related)
                    ? parsed.frontmatter.related.filter((id): id is number => typeof id === 'number' && id !== 0)
                    : [];
                const relatedPaths = await idConverter.idsToPaths(relatedIds);

                ideas.push({
                    ...parsed.frontmatter,
                    related: relatedPaths, // Override with paths for export
                    title,
                    body: parsed.body,
                    filename: file.name,
                    path: file.path
                });
            } catch (error) {
                Logger.warn(`Failed to export ${file.path}:`, error);
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

