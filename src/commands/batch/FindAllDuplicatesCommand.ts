import { Notice, TFile } from 'obsidian';
import { BaseCommand } from '../base/BaseCommand';
import { CommandContext } from '../base/CommandContext';
import { DuplicatePairsModal, type DuplicatePair, type BulkAction } from '../../views/DuplicatePairsModal';
import { Logger } from '../../utils/logger';

/**
 * Command: find-all-duplicates
 * Find all duplicate pairs across all ideas
 */
export class FindAllDuplicatesCommand extends BaseCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    async execute(): Promise<void> {
        try {
            // Get all idea files
            const allFiles = this.context.app.vault.getMarkdownFiles();
            const ideaFiles = allFiles.filter(file => 
                file.path.startsWith('Ideas/') && !file.path.startsWith('Ideas/Archived/')
            );

            if (ideaFiles.length < 2) {
                new Notice('Need at least 2 idea files to find duplicates.');
                return;
            }

            new Notice('Scanning for duplicates... This may take a while.');

            const duplicatePairs: Array<{ file1: TFile; file2: TFile; similarity: number }> = [];

            // Compare all pairs
            for (let i = 0; i < ideaFiles.length; i++) {
                for (let j = i + 1; j < ideaFiles.length; j++) {
                    const file1 = ideaFiles[i];
                    const file2 = ideaFiles[j];

                    try {
                        const content1 = await this.context.app.vault.read(file1);
                        const content2 = await this.context.app.vault.read(file2);
                        const parsed1 = this.context.frontmatterParser.parse(content1);
                        const parsed2 = this.context.frontmatterParser.parse(content2);
                        const body1 = parsed1.body;
                        const body2 = parsed2.body;

                        // Compare the two files directly
                        const similarity = this.context.searchService.calculateSimilarity(body1, body2);
                        
                        if (similarity > 0.75) {
                            duplicatePairs.push({
                                file1,
                                file2,
                                similarity
                            });
                        }
                    } catch (error) {
                        Logger.warn(`Failed to compare ${file1.name} and ${file2.name}:`, error);
                        // Continue with other pairs
                    }
                }
            }

            if (duplicatePairs.length === 0) {
                new Notice('No duplicates found.');
                return;
            }

            // Show modal with duplicate pairs
            const modal = new DuplicatePairsModal(
                this.context.app,
                duplicatePairs,
                {
                    onBulkAction: async (pairs: DuplicatePair[], action: BulkAction) => {
                        for (const pair of pairs) {
                            try {
                                if (action === 'link') {
                                    await this.linkDuplicatePair(pair);
                                } else if (action === 'archive') {
                                    await this.archiveDuplicatePair(pair);
                                } else if (action === 'merge') {
                                    await this.mergeDuplicatePair(pair);
                                }
                            } catch (error) {
                                console.error(`Failed to ${action} pair:`, error);
                            }
                        }
                        new Notice(`Applied ${action} to ${pairs.length} pair${pairs.length > 1 ? 's' : ''}.`);
                        modal.close();
                    },
                    onLink: async (pair: DuplicatePair) => {
                        await this.linkDuplicatePair(pair);
                        new Notice('Duplicates linked in frontmatter.');
                    },
                    onArchive: async (pair: DuplicatePair) => {
                        await this.archiveDuplicatePair(pair);
                        new Notice('Duplicate archived.');
                    },
                    onMerge: async (pair: DuplicatePair) => {
                        await this.mergeDuplicatePair(pair);
                        new Notice('Duplicates merged.');
                    }
                }
            );
            modal.open();
        } catch (error) {
            this.handleError(error, 'find all duplicates');
        }
    }

    private async linkDuplicatePair(pair: DuplicatePair): Promise<void> {
        const content1 = await this.context.app.vault.read(pair.file1);
        const content2 = await this.context.app.vault.read(pair.file2);
        const parsed1 = this.context.frontmatterParser.parse(content1);
        const parsed2 = this.context.frontmatterParser.parse(content2);

        const related1 = Array.isArray(parsed1.frontmatter.related) ? [...parsed1.frontmatter.related] : [];
        const related2 = Array.isArray(parsed2.frontmatter.related) ? [...parsed2.frontmatter.related] : [];

        if (!related1.includes(pair.file2.path)) {
            related1.push(pair.file2.path);
        }
        if (!related2.includes(pair.file1.path)) {
            related2.push(pair.file1.path);
        }

        const updated1 = { ...parsed1.frontmatter, related: related1 };
        const updated2 = { ...parsed2.frontmatter, related: related2 };
        const newContent1 = this.context.frontmatterParser.build(updated1, parsed1.body);
        const newContent2 = this.context.frontmatterParser.build(updated2, parsed2.body);
        await this.context.app.vault.modify(pair.file1, newContent1);
        await this.context.app.vault.modify(pair.file2, newContent2);
    }

    private async archiveDuplicatePair(pair: DuplicatePair): Promise<void> {
        await this.context.fileOrganizer.moveToArchive(pair.file2);
        const content = await this.context.app.vault.read(pair.file2);
        const parsed = this.context.frontmatterParser.parse(content);
        const updated = { ...parsed.frontmatter, status: 'archived' as const };
        const newContent = this.context.frontmatterParser.build(updated, parsed.body);
        await this.context.app.vault.modify(pair.file2, newContent);
    }

    private async mergeDuplicatePair(pair: DuplicatePair): Promise<void> {
        const content1 = await this.context.app.vault.read(pair.file1);
        const content2 = await this.context.app.vault.read(pair.file2);
        const parsed1 = this.context.frontmatterParser.parse(content1);
        const parsed2 = this.context.frontmatterParser.parse(content2);

        // Combine bodies with separator
        const mergedBody = `${parsed1.body}\n\n---\n\nMerged from: ${pair.file2.name}\n\n${parsed2.body}`;

        // Merge frontmatter
        const mergedTags = [
            ...(Array.isArray(parsed1.frontmatter.tags) ? parsed1.frontmatter.tags : []),
            ...(Array.isArray(parsed2.frontmatter.tags) ? parsed2.frontmatter.tags : [])
        ];
        const uniqueTags = Array.from(new Set(mergedTags));

        const mergedRelated = [
            ...(Array.isArray(parsed1.frontmatter.related) ? parsed1.frontmatter.related : []),
            ...(Array.isArray(parsed2.frontmatter.related) ? parsed2.frontmatter.related : []),
            pair.file2.path
        ];
        const uniqueRelated = Array.from(new Set(mergedRelated));

        // Update file1 with merged content
        const updatedFrontmatter = {
            ...parsed1.frontmatter,
            tags: uniqueTags,
            related: uniqueRelated
        };
        const updatedContent = this.context.frontmatterParser.build(updatedFrontmatter, mergedBody);
        await this.context.app.vault.modify(pair.file1, updatedContent);

        // Delete file2
        await this.context.app.vault.delete(pair.file2);
    }
}

