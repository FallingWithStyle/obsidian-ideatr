import { Notice, TFile } from 'obsidian';
import { IdeaFileCommand } from '../base/IdeaFileCommand';
import { CommandContext } from '../base/CommandContext';
import { ClusterAnalysisModal, type ClusterInfo } from '../../views/ClusterAnalysisModal';
import { PROMPTS } from '../../services/prompts';
import { extractAndRepairJSON } from '../../utils/jsonRepair';
import { GRAMMARS } from '../../utils/grammars';
import { Logger } from '../../utils/logger';

/**
 * Command: analyze-idea-cluster
 * Analyze the cluster containing the current idea
 */
export class ClusterAnalysisCommand extends IdeaFileCommand {
    constructor(context: CommandContext) {
        super(context);
    }

    protected getCommandName(): string {
        return 'analyze idea cluster';
    }

    protected async executeWithFile(
        file: TFile,
        _content: { frontmatter: Record<string, unknown>; body: string; content: string; ideaText: string }
    ): Promise<void> {
        if (!this.context.clusteringService) {
            new Notice('Clustering service is not available.');
            return;
        }

        new Notice('Analyzing cluster...');

        // Get all ideas
        const allFiles = this.context.app.vault.getMarkdownFiles();
        const ideaFiles = allFiles.filter(f =>
            f.path.startsWith('Ideas/') && !f.path.startsWith('Ideas/Archived/')
        );

        if (ideaFiles.length === 0) {
            new Notice('No idea files found.');
            return;
        }

        // Parse all ideas
        const ideas = [];
        for (const ideaFile of ideaFiles) {
            try {
                const fileContent = await this.context.app.vault.read(ideaFile);
                const parsed = this.context.frontmatterParser.parseIdeaFile(
                    { path: ideaFile.path, name: ideaFile.name },
                    fileContent
                );
                ideas.push(parsed);
            } catch (error) {
                Logger.warn(`Failed to parse ${ideaFile.path}:`, error);
            }
        }

        // Cluster ideas
        const clusters = await this.context.clusteringService.clusterIdeas(ideas);

        // Find cluster containing current idea
        const currentCluster = clusters.find(c =>
            c.ideas.some(i => i.filename === file.name || `Ideas/${i.filename}` === file.path)
        );

        if (!currentCluster) {
            new Notice('Could not find cluster for this idea.');
            return;
        }

        // Calculate common tags
        const allTags = new Map<string, number>();
        currentCluster.ideas.forEach(idea => {
            const tags = idea.frontmatter?.tags || [];
            tags.forEach(tag => {
                allTags.set(tag, (allTags.get(tag) || 0) + 1);
            });
        });
        const commonTags = Array.from(allTags.entries())
            .filter(([_, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .map(([tag]) => tag)
            .slice(0, 10);

        // Calculate statistics
        const ages = currentCluster.ideas.map(idea => {
            const created = idea.frontmatter?.created
                ? new Date(idea.frontmatter.created).getTime()
                : Date.now();
            return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
        });
        const averageAge = ages.reduce((a, b) => a + b, 0) / ages.length;

        const statusDistribution: Record<string, number> = {};
        currentCluster.ideas.forEach(idea => {
            const status = idea.frontmatter?.status || 'unknown';
            statusDistribution[status] = (statusDistribution[status] || 0) + 1;
        });

        // Calculate actual similarity between clusters using embeddings
        const relatedClusters = await Promise.all(
            clusters
                .filter(c => c !== currentCluster)
                .map(async (otherCluster) => {
                    let totalSimilarity = 0;
                    let comparisons = 0;

                    for (const idea1 of currentCluster.ideas) {
                        for (const idea2 of otherCluster.ideas) {
                            const body1 = idea1.body || idea1.filename || '';
                            const body2 = idea2.body || idea2.filename || '';

                            if (body1 && body2) {
                                const similarity = this.context.searchService.calculateSimilarity(body1, body2);
                                totalSimilarity += similarity;
                                comparisons++;
                            }
                        }
                    }

                    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;

                    return {
                        label: otherCluster.label,
                        similarity: avgSimilarity,
                        cluster: otherCluster
                    };
                })
        );

        // Filter and sort by similarity
        const filteredRelated = relatedClusters
            .filter(c => c.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5)
            .map(c => ({
                label: c.label,
                similarity: c.similarity
            }));

        // Use LLM to analyze cluster themes and relationships if available
        let commonThemes: string[] = [];
        let relationshipExplanations: Map<string, string> = new Map();

        if (this.context.llmService.isAvailable() && this.context.llmService.complete) {
            try {
                const clusterIdeasForAnalysis = currentCluster.ideas.map(idea => ({
                    title: idea.filename.replace('.md', ''),
                    text: idea.body || '',
                    category: idea.frontmatter?.category || '',
                    tags: idea.frontmatter?.tags || []
                }));

                const analysisPrompt = PROMPTS.clusterAnalysis({
                    clusterIdeas: clusterIdeasForAnalysis
                });

                const analysisResponse = await this.context.llmService.complete(analysisPrompt, {
                    temperature: 0.7,
                    n_predict: 500,
                    grammar: GRAMMARS.clusterAnalysis
                });

                try {
                    const repaired = extractAndRepairJSON(analysisResponse, false);
                    const analysis = JSON.parse(repaired);
                    commonThemes = analysis.commonThemes || [];
                } catch (error) {
                    Logger.warn('Failed to parse cluster analysis JSON:', error);
                }

                // Analyze relationships to top related clusters
                for (const relatedCluster of filteredRelated.slice(0, 3)) {
                    const otherCluster = relatedClusters.find(c => c.label === relatedCluster.label)?.cluster;
                    if (otherCluster) {
                        const otherClusterIdeas = otherCluster.ideas.map(idea => ({
                            title: idea.filename.replace('.md', ''),
                            text: idea.body || '',
                            category: idea.frontmatter?.category || '',
                            tags: idea.frontmatter?.tags || []
                        }));

                        const relationshipPrompt = PROMPTS.clusterAnalysis({
                            clusterIdeas: clusterIdeasForAnalysis,
                            otherClusterIdeas: otherClusterIdeas,
                            similarity: relatedCluster.similarity
                        });

                        const relationshipResponse = await this.context.llmService.complete(relationshipPrompt, {
                            temperature: 0.7,
                            n_predict: 300,
                            grammar: GRAMMARS.clusterAnalysis
                        });

                        try {
                            const repaired = extractAndRepairJSON(relationshipResponse, false);
                            const relationshipAnalysis = JSON.parse(repaired);
                            if (relatedCluster.label) {
                                relationshipExplanations.set(
                                    relatedCluster.label,
                                    relationshipAnalysis.relationshipToOtherCluster || ''
                                );
                            }
                        } catch (error) {
                            Logger.warn('Failed to parse relationship analysis JSON:', error);
                        }
                    }
                }
            } catch (error) {
                Logger.warn('Failed to analyze cluster with LLM:', error);
            }
        }

        // Show modal with cluster analysis
        const clusterInfo: ClusterInfo = {
            label: currentCluster.label || 'Unnamed Cluster',
            ideas: currentCluster.ideas,
            commonTags,
            commonThemes: commonThemes.length > 0 ? commonThemes : undefined,
            statistics: {
                totalIdeas: currentCluster.ideas.length,
                averageAge,
                statusDistribution
            },
            relatedClusters: filteredRelated.map(c => ({
                label: c.label || 'Unnamed Cluster',
                similarity: c.similarity,
                explanation: relationshipExplanations.get(c.label || '')
            })).filter(c => c.label !== 'Unnamed Cluster' || c.similarity > 0)
        };

        new ClusterAnalysisModal(
            this.context.app,
            clusterInfo,
            async (path: string) => {
                const targetFile = this.context.app.vault.getAbstractFileByPath(path || '');
                if (targetFile) {
                    await this.context.app.workspace.openLinkText(path || '', '', true);
                }
            }
        ).open();
    }
}

