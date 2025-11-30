/**
 * Centralized prompt templates for LLM operations
 */

export interface PromptParams {
    ideaText: string;
    category?: string;
    tags?: string[];
    context?: string;
}

export interface MutationPromptParams extends PromptParams {
    count?: number; // Default: 8
    focus?: string; // Optional focus area (e.g., "mobile", "B2B", "AI")
}

export interface ExpansionPromptParams extends PromptParams {
    detailLevel?: 'brief' | 'detailed' | 'comprehensive'; // Default: 'detailed'
}

export interface ReorganizationPromptParams extends PromptParams {
    preserveSections?: string[]; // Sections to preserve exactly
    targetStructure?: string[]; // Desired section order
}

export interface ClusterAnalysisPromptParams {
    clusterIdeas: Array<{ title: string; text: string; category?: string; tags?: string[] }>;
    otherClusterIdeas?: Array<{ title: string; text: string; category?: string; tags?: string[] }>;
    similarity?: number;
}

/**
 * Prompt templates for various LLM operations
 */
export const PROMPTS = {
    /**
     * Generate mutation prompt for idea variations
     */
    mutations: (params: MutationPromptParams): string => {
        const count = params.count || 8;
        const category = params.category || 'general';
        const tags = params.tags && params.tags.length > 0 ? params.tags.join(', ') : 'none';
        const focus = params.focus ? `\n\nFocus area: ${params.focus}` : '';

        return `You are an idea generation assistant. Given an idea, generate ${count} creative variations or mutations.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}

Generate ${count} variations that explore:
- Different angles or perspectives
- Alternative implementations
- Different target audiences
- Different business models
- Different technologies or approaches

For each variation, provide:
1. A brief title (2-5 words)
2. A 1-2 sentence description of how it differs from the original
3. Key differences or innovations

Return as JSON array:
[
  {
    "title": "Variation Title",
    "description": "How this variation differs...",
    "differences": ["Key difference 1", "Key difference 2"]
  },
  ...
]${focus}`;
    },

    /**
     * Generate expansion prompt for idea development
     */
    expansion: (params: ExpansionPromptParams): string => {
        const category = params.category || 'general';
        const tags = params.tags && params.tags.length > 0 ? params.tags.join(', ') : 'none';
        const detailLevel = params.detailLevel || 'detailed';

        return `You are an idea development assistant. Expand the following brief idea into a comprehensive description.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}

Expand this idea with the following structure:

## Overview
A clear, concise summary of the idea (2-3 sentences).

## Key Features / Mechanics
List the main features, mechanics, or core components.

## Goals / Objectives
What this idea aims to achieve.

## Potential Challenges
Identify potential obstacles or challenges.

## Next Steps
Suggest initial steps to explore or develop this idea.

Preserve the original meaning and intent. Add detail and structure without changing the core concept.
Detail level: ${detailLevel}`;
    },

    /**
     * Generate reorganization prompt for idea structuring
     */
    reorganization: (params: ReorganizationPromptParams): string => {
        const category = params.category || 'general';
        const tags = params.tags && params.tags.length > 0 ? params.tags.join(', ') : 'none';
        const targetStructure = params.targetStructure && params.targetStructure.length > 0
            ? params.targetStructure.join('\n- ')
            : 'Organize into logical sections with clear headings';
        const preserveSections = params.preserveSections && params.preserveSections.length > 0
            ? params.preserveSections.join('\n- ')
            : 'None specified';

        return `You are an idea organization assistant. Reorganize the following idea into a clean, well-structured format while preserving ALL information.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}

CRITICAL REQUIREMENTS:
1. Preserve ALL information - do not remove or summarize any content
2. Organize into logical sections with clear headings
3. Remove redundancy but keep all unique points
4. Maintain original meaning and nuance
5. Use markdown formatting (headings, lists, emphasis)

Target Structure:
- ${targetStructure}

Sections to preserve exactly (if any):
- ${preserveSections}

Reorganize the content into a clear, structured format. Use appropriate markdown headings and formatting.`;
    },

    /**
     * Generate cluster analysis prompt for understanding cluster relationships
     */
    clusterAnalysis: (params: ClusterAnalysisPromptParams): string => {
        const ideaSummaries = params.clusterIdeas.map((idea, i) => 
            `${i + 1}. ${idea.title}\n   Category: ${idea.category || 'none'}\n   Tags: ${idea.tags?.join(', ') || 'none'}\n   Text: ${idea.text.substring(0, 200)}...`
        ).join('\n\n');

        const otherClusterInfo = params.otherClusterIdeas 
            ? `\n\nOther Cluster Ideas:\n${params.otherClusterIdeas.map((idea, i) => 
                `${i + 1}. ${idea.title} (${idea.category || 'none'})`
            ).join('\n')}`
            : '';

        const similarityInfo = params.similarity !== undefined 
            ? `\n\nSimilarity Score: ${(params.similarity * 100).toFixed(1)}%`
            : '';

        return `Analyze the following cluster of ideas and identify:

1. Common Themes: What unifying themes or concepts connect these ideas?
2. Common Patterns: What patterns or structures do you notice?
3. Relationship Explanation: Why do these ideas belong together?
4. Potential Synergies: How could these ideas be combined or enhanced?
${params.otherClusterIdeas ? '5. Relationship to Other Cluster: How does this cluster relate to the other cluster?' : ''}

Cluster Ideas:
${ideaSummaries}${otherClusterInfo}${similarityInfo}

Return JSON:
{
  "commonThemes": ["Theme 1", "Theme 2", ...],
  "commonPatterns": ["Pattern 1", "Pattern 2", ...],
  "relationshipExplanation": "Why these ideas belong together...",
  "synergies": ["Potential synergy 1", "Potential synergy 2", ...],
  ${params.otherClusterIdeas ? '"relationshipToOtherCluster": "How this cluster relates to the other...",' : ''}
  "relevance": 0.0-1.0
}`;
    }
};

