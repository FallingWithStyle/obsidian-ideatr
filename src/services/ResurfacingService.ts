import type { IResurfacingService } from '../types/management';
import type { Digest } from '../types/management';
import type { IdeaFile } from '../types/idea';
import type { IIdeaRepository } from '../types/management';
import type { IdeatrSettings } from '../settings';
import { FileManager } from '../storage/FileManager';
import type { Vault, TFile } from 'obsidian';
import { ManagementError, ManagementErrorCode } from '../types/management';

/**
 * ResurfacingService - Identifies and resurfacing old ideas
 */
export class ResurfacingService implements IResurfacingService {
    constructor(
        private ideaRepository: IIdeaRepository,
        private settings: Partial<Pick<IdeatrSettings, 'resurfacingThresholdDays'>>,
        private vault?: Vault
    ) {}

    /**
     * Identify old ideas based on age threshold
     * @param thresholdDays - Number of days since creation (default: 7)
     * @returns Array of old ideas
     */
    async identifyOldIdeas(thresholdDays?: number): Promise<IdeaFile[]> {
        const threshold = thresholdDays || this.settings.resurfacingThresholdDays || 7;
        const allIdeas = await this.ideaRepository.getAllIdeas();
        const now = new Date();
        const thresholdDate = new Date(now.getTime() - threshold * 24 * 60 * 60 * 1000);

        const oldIdeas: IdeaFile[] = [];

        for (const idea of allIdeas) {
            const createdDate = new Date(idea.frontmatter.created);

            // Detect invalid dates explicitly and log a typed error (QA 4.6)
            if (isNaN(createdDate.getTime())) {
                const managementError = new ManagementError(
                    `Failed to parse date for idea ${idea.filename}`,
                    ManagementErrorCode.DATE_PARSE_ERROR
                );
                console.warn(managementError.message, managementError);
                continue;
            }

            if (createdDate < thresholdDate) {
                // Check if dismissed or acted upon
                const isDismissed = await this.isDismissedOrActedUpon(`Ideas/${idea.filename}`);
                if (!isDismissed) {
                    oldIdeas.push(idea);
                }
            }
        }

        return oldIdeas;
    }

    /**
     * Generate digest for old ideas
     * @param ideas - Ideas to include in digest (optional, will identify if not provided)
     * @returns Generated digest
     */
    async generateDigest(ideas?: IdeaFile[]): Promise<Digest> {
        const oldIdeas = ideas || await this.identifyOldIdeas();
        
        // Sort by age (oldest first)
        oldIdeas.sort((a, b) => {
            const dateA = new Date(a.frontmatter.created).getTime();
            const dateB = new Date(b.frontmatter.created).getTime();
            return dateA - dateB;
        });

        const summary = this.generateDigestMarkdown(oldIdeas);

        return {
            id: `digest-${Date.now()}`,
            generatedAt: new Date(),
            ideas: oldIdeas,
            summary
        };
    }

    /**
     * Mark idea as dismissed (exclude from future digests)
     * @param ideaPath - Path to idea file
     */
    async markAsDismissed(ideaPath: string): Promise<void> {
        if (!this.vault) {
            console.warn('Vault not available, cannot mark as dismissed');
            return;
        }

        const file = this.vault.getAbstractFileByPath(ideaPath) as TFile | null;
        if (!file) {
            console.warn(`File not found: ${ideaPath}`);
            return;
        }

        const fileManager = new FileManager(this.vault);
        await fileManager.updateIdeaFrontmatter(file, {
            dismissed: true,
            dismissedAt: new Date().toISOString().split('T')[0]
        } as any);
    }

    /**
     * Mark idea as acted upon (exclude from future digests)
     * @param ideaPath - Path to idea file
     */
    async markAsActedUpon(ideaPath: string): Promise<void> {
        if (!this.vault) {
            console.warn('Vault not available, cannot mark as acted upon');
            return;
        }

        const file = this.vault.getAbstractFileByPath(ideaPath) as TFile | null;
        if (!file) {
            console.warn(`File not found: ${ideaPath}`);
            return;
        }

        const fileManager = new FileManager(this.vault);
        await fileManager.updateIdeaFrontmatter(file, {
            actedUpon: true,
            actedUponAt: new Date().toISOString().split('T')[0]
        } as any);
    }

    /**
     * Check if idea is dismissed or acted upon
     * @param ideaPath - Path to idea file
     * @returns True if dismissed or acted upon
     */
    async isDismissedOrActedUpon(ideaPath: string): Promise<boolean> {
        const idea = await this.ideaRepository.getIdeaByPath(ideaPath);
        if (!idea) {
            return false;
        }

        // Check frontmatter for dismissed or actedUpon flags
        const frontmatter = idea.frontmatter as any;
        return !!(frontmatter.dismissed || frontmatter.actedUpon);
    }

    /**
     * Generate markdown digest content
     */
    private generateDigestMarkdown(ideas: IdeaFile[]): string {
        if (ideas.length === 0) {
            return '# Weekly Idea Digest\n\nNo old ideas found.';
        }

        const lines: string[] = [
            '# Weekly Idea Digest',
            '',
            `Generated on: ${new Date().toLocaleDateString()}`,
            '',
            '## Old Ideas Needing Attention',
            ''
        ];

        for (const idea of ideas) {
            const age = this.calculateAge(idea.frontmatter.created);
            const preview = idea.body.substring(0, 200);
            const truncated = idea.body.length > 200;

            lines.push(`### ${idea.filename.replace('.md', '')}`);
            lines.push('');
            lines.push(`**Category**: ${idea.frontmatter.category || 'Uncategorized'}`);
            lines.push(`**Created**: ${idea.frontmatter.created}`);
            lines.push(`**Age**: ${age} days`);
            if (idea.frontmatter.tags.length > 0) {
                lines.push(`**Tags**: ${idea.frontmatter.tags.join(', ')}`);
            }
            lines.push('');
            lines.push(preview + (truncated ? '...' : ''));
            lines.push('');
            lines.push(`[Open Idea](Ideas/${idea.filename})`);
            lines.push('');
            lines.push('---');
            lines.push('');
        }

        lines.push('## Summary');
        lines.push('');
        lines.push(`- **Total Ideas**: ${ideas.length}`);
        
        // Category breakdown
        const categoryCounts: Record<string, number> = {};
        for (const idea of ideas) {
            const category = idea.frontmatter.category || 'Uncategorized';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
        
        const categoryBreakdown = Object.entries(categoryCounts)
            .map(([cat, count]) => `${cat}: ${count}`)
            .join(', ');
        lines.push(`- **By Category**: ${categoryBreakdown}`);
        lines.push('');

        return lines.join('\n');
    }

    /**
     * Calculate age of idea in days
     */
    private calculateAge(createdDate: string): number {
        try {
            const created = new Date(createdDate);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - created.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch {
            return 0;
        }
    }
}

