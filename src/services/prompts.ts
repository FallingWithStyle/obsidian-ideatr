/**
 * Centralized prompt templates for LLM operations
 */

import { PROMPTS_CONSTANTS } from '../utils/constants';

export interface PromptParams {
    ideaText: string;
    category?: string;
    tags?: string[];
    context?: string;
}

export interface MutationPromptParams extends PromptParams {
    count?: number; // Default: PROMPTS_CONSTANTS.DEFAULT_MUTATION_COUNT
    focus?: string; // Optional focus area
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
        const count = params.count || PROMPTS_CONSTANTS.DEFAULT_MUTATION_COUNT;
        const category = params.category || 'general';
        const tags = params.tags && params.tags.length > 0 ? params.tags.join(', ') : 'none';
        const focus = params.focus ? `\n\nFocus: ${params.focus}` : '';

        return `Generate ${count} distinct variations of this idea.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}${focus}

Requirements:
- Each variation must be meaningfully different (audience, problem, business model, tech, scope).
- Variations should be interesting and viable.
- Avoid minor tweaks.

Output JSON array of objects with:
- title: Brief name (2-5 words)
- description: Clear explanation of difference (1-2 sentences)
- differences: 2-3 specific differences

Format: JSON array ONLY. No markdown.
[
  {
    "title": "Variation Name",
    "description": "Description...",
    "differences": ["Diff 1", "Diff 2"]
  }
]`;
    },

    /**
     * Generate expansion prompt for idea development
     */
    expansion: (params: ExpansionPromptParams): string => {
        const category = params.category || 'general';
        const tags = params.tags && params.tags.length > 0 ? params.tags.join(', ') : 'none';
        const detailLevel = params.detailLevel || PROMPTS_CONSTANTS.DEFAULT_EXPANSION_DETAIL;

        return `Expand this idea into a comprehensive description.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}

Requirements:
- Preserve core concept.
- Add meaningful detail.
- Use markdown headers.
- Detail level: ${detailLevel}

Structure:
## Overview
Summary (2-4 sentences).

## Key Features / Mechanics
Main components.

## Goals / Objectives
Primary goals and success criteria.

## Potential Challenges
Technical, market, or resource challenges.

## Next Steps
Actionable initial steps.`;
    },

    /**
     * Generate reorganization prompt for idea structuring
     */
    reorganization: (params: ReorganizationPromptParams): string => {
        const category = params.category || 'general';
        const tags = params.tags && params.tags.length > 0 ? params.tags.join(', ') : 'none';
        const targetStructure = params.targetStructure && params.targetStructure.length > 0
            ? params.targetStructure.join('\n- ')
            : 'Logical sections with clear headings';
        const preserveSections = params.preserveSections && params.preserveSections.length > 0
            ? params.preserveSections.join('\n- ')
            : 'None';

        return `Reorganize this idea into a clear format.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}

Requirements:
- Preserve ALL info.
- Organize logically.
- Use markdown.

Target structure:
- ${targetStructure}

Preserve exactly:
- ${preserveSections}`;
    },

    /**
     * Generate cluster analysis prompt for understanding cluster relationships
     */
    clusterAnalysis: (params: ClusterAnalysisPromptParams): string => {
        const ideaSummaries = params.clusterIdeas.map((idea, i) =>
            `${i + 1}. ${idea.title}\n   Category: ${idea.category || 'none'}\n   Tags: ${idea.tags?.join(', ') || 'none'}\n   Text: ${idea.text.substring(0, 200)}...`
        ).join('\n\n');

        const otherClusterInfo = params.otherClusterIdeas
            ? `\n\nOther Cluster:\n${params.otherClusterIdeas.map((idea, i) =>
                `${i + 1}. ${idea.title} (${idea.category || 'none'})`
            ).join('\n')}`
            : '';

        const similarityInfo = params.similarity !== undefined
            ? `\nSimilarity: ${(params.similarity * 100).toFixed(1)}%`
            : '';

        return `Analyze this cluster of ideas.

Cluster Ideas:
${ideaSummaries}${otherClusterInfo}${similarityInfo}

Analyze:
1. Common Themes
2. Common Patterns
3. Relationship Explanation (Why do they belong together?)
4. Potential Synergies${params.otherClusterIdeas ? '\n5. Relationship to Other Cluster' : ''}

Output JSON ONLY:
{
  "commonThemes": ["Theme 1", "Theme 2"],
  "commonPatterns": ["Pattern 1", "Pattern 2"],
  "relationshipExplanation": "Explanation...",
  "synergies": ["Synergy 1", "Synergy 2"],${params.otherClusterIdeas ? '\n  "relationshipToOtherCluster": "Relation...",' : ''}
  "relevance": 0.0-1.0
}`;
    }
};

