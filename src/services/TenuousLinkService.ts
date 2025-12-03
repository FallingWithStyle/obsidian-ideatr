/**
 * TenuousLinkService - Finds unexpected connections between ideas
 */

import type { EmbeddingService } from './EmbeddingService';
import type { ILLMService } from '../types/classification';
import type { Vault, TFile } from 'obsidian';
import { extractAndRepairJSON } from '../utils/jsonRepair';
import { Logger } from '../utils/logger';

export interface TenuousLink {
    idea: {
        path: string;
        title: string;
        similarity: number;
    };
    similarity: number; // 0.3-0.5 range
    explanation: string; // LLM-generated explanation
    synergy?: string; // Potential synergy or combination
    relevance: number; // 0.0-1.0, LLM-assessed relevance
}

export interface TenuousLinkService {
    findTenuousLinks(
        ideaText: string,
        ideaCategory: string,
        ideaTags: string[],
        existingRelated: string[]
    ): Promise<TenuousLink[]>;
}

/**
 * Service for finding tenuous (unexpected) links between ideas
 */
export class TenuousLinkServiceImpl implements TenuousLinkService {
    private vault: Vault;
    private embeddingService: EmbeddingService;
    private llmService: ILLMService;
    private readonly MIN_SIMILARITY = 0.3;
    private readonly MAX_SIMILARITY = 0.5;

    constructor(
        vault: Vault,
        embeddingService: EmbeddingService,
        llmService: ILLMService
    ) {
        this.vault = vault;
        this.embeddingService = embeddingService;
        this.llmService = llmService;
    }

    async findTenuousLinks(
        ideaText: string,
        ideaCategory: string,
        ideaTags: string[],
        existingRelated: string[]
    ): Promise<TenuousLink[]> {
        // Step 1: Find ideas with similarity in 0.3-0.5 range
        const allFiles = this.vault.getMarkdownFiles();
        const ideaFiles = allFiles.filter(file => 
            file.path.startsWith('Ideas/') && 
            !file.path.startsWith('Ideas/Archived/')
        );

        const candidateLinks: Array<{ file: TFile; similarity: number; content: string }> = [];

        // Compare with all other ideas
        for (const file of ideaFiles) {
            // Skip if already in related
            if (existingRelated.includes(file.path)) {
                continue;
            }

            try {
                const content = await this.vault.cachedRead(file);
                // Extract body (remove frontmatter)
                const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n\n?([\s\S]*)$/);
                const body = bodyMatch ? bodyMatch[1].trim() : content.trim();

                if (body.length === 0) {
                    continue;
                }

                // Calculate similarity using EmbeddingService
                // Note: EmbeddingService uses keyword-based similarity, not true embeddings
                const similarity = await this.calculateSimilarity(ideaText, body);

                // Check if in tenuous range (0.3-0.5)
                if (similarity >= this.MIN_SIMILARITY && similarity <= this.MAX_SIMILARITY) {
                    // Parse frontmatter to check category
                    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                    if (frontmatterMatch) {
                        const frontmatter = frontmatterMatch[1];
                        const categoryMatch = frontmatter.match(/^category:\s*(.+)$/m);
                        const category = categoryMatch ? categoryMatch[1].trim() : '';

                        // Filter out same category (obvious connections)
                        if (category === ideaCategory) {
                            continue;
                        }

                        candidateLinks.push({ file, similarity, content: body });
                    }
                }
            } catch (error) {
                Logger.warn(`Failed to process ${file.path} for tenuous links:`, error);
                // Continue with other files
            }
        }

        // Step 2: Use LLM to analyze connections
        const tenuousLinks: TenuousLink[] = [];

        for (const candidate of candidateLinks.slice(0, 10)) { // Limit to top 10 for LLM analysis
            try {
                const analysis = await this.analyzeConnection(
                    ideaText,
                    ideaCategory,
                    ideaTags,
                    candidate.content,
                    candidate.similarity
                );

                if (analysis.relevance > 0.5) { // Only include if LLM thinks it's relevant
                    tenuousLinks.push({
                        idea: {
                            path: candidate.file.path,
                            title: candidate.file.basename,
                            similarity: candidate.similarity
                        },
                        similarity: candidate.similarity,
                        explanation: analysis.explanation,
                        synergy: analysis.synergy,
                        relevance: analysis.relevance
                    });
                }
            } catch (error) {
                Logger.warn(`Failed to analyze connection with ${candidate.file.path}:`, error);
                // Continue with other candidates
            }
        }

        // Sort by relevance (descending)
        tenuousLinks.sort((a, b) => b.relevance - a.relevance);

        return tenuousLinks;
    }

    /**
     * Calculate similarity between two texts
     * Uses EmbeddingService's similarity calculation
     */
    private async calculateSimilarity(text1: string, text2: string): Promise<number> {
        // Use EmbeddingService to generate embeddings and calculate similarity
        const embedding1 = await this.embeddingService.generateEmbedding(text1);
        const embedding2 = await this.embeddingService.generateEmbedding(text2);
        
        // Calculate cosine similarity
        return this.cosineSimilarity(embedding1, embedding2);
    }

    /**
     * Calculate cosine similarity between two embedding vectors
     */
    private cosineSimilarity(vec1: number[], vec2: number[]): number {
        if (vec1.length !== vec2.length) {
            return 0;
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
        if (denominator === 0) {
            return 0;
        }

        return dotProduct / denominator;
    }

    /**
     * Use LLM to analyze a potential connection
     */
    private async analyzeConnection(
        ideaText: string,
        ideaCategory: string,
        ideaTags: string[],
        relatedIdeaText: string,
        similarity: number
    ): Promise<{ explanation: string; synergy?: string; relevance: number }> {
        const prompt = `Analyze the connection between these two ideas, focusing on unexpected or creative connections.

Original Idea:
${ideaText}
Category: ${ideaCategory}
Tags: ${ideaTags.join(', ')}

Related Idea:
${relatedIdeaText}
Similarity: ${similarity.toFixed(2)}

CRITICAL REQUIREMENTS:
- Look beyond surface-level similarities to find deeper, more interesting connections
- Focus on unexpected or creative connections that might not be immediately obvious
- Consider how these ideas could enhance or transform each other
- Think about novel applications or combinations

Analyze and identify:

1. Unexpected Connection
   - What is the non-obvious link between these ideas?
   - What hidden relationships exist beyond the similarity score?
   - How do they relate in ways that might not be immediately apparent?
   - What shared principles, approaches, or underlying concepts connect them?

2. Combination Potential
   - How could these ideas be meaningfully combined?
   - What would a merged or hybrid version look like?
   - How could elements from one idea enhance the other?
   - What complementary strengths do they have?

3. New Possibilities
   - What novel applications emerge from this connection?
   - What new ideas or directions does this relationship suggest?
   - How could combining these ideas solve problems neither could solve alone?
   - What unique value would a combination create?

Output format (JSON only, no markdown, no code blocks):
{
  "explanation": "Clear explanation of the unexpected connection between these ideas...",
  "synergy": "Specific description of how these ideas could be combined and what the result would be...",
  "relevance": 0.0-1.0
}

Response:`;

        if (!this.llmService.complete) {
            // Fallback if LLM doesn't support complete
            return {
                explanation: `Similarity: ${similarity.toFixed(2)}`,
                relevance: similarity
            };
        }

        try {
            const response = await this.llmService.complete(prompt, {
                temperature: 0.7,
                n_predict: 500
            });

            // Parse JSON response
            const repaired = extractAndRepairJSON(response, false);
            const analysis = JSON.parse(repaired);
            return {
                explanation: analysis.explanation || '',
                synergy: analysis.synergy,
                relevance: analysis.relevance || 0.5
            };
        } catch (error) {
            Logger.warn('Failed to parse LLM analysis:', error);
        }

        // Fallback
        return {
            explanation: `Similarity: ${similarity.toFixed(2)}`,
            relevance: similarity
        };
    }
}

