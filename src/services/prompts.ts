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
        const focus = params.focus ? `\n\nFocus: ${params.focus}` : '';

        return `Generate ${count} creative variations of this idea.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}${focus}

Explore variations through:
- Different perspectives or angles
- Alternative implementations
- Different audiences
- Different business models
- Different technologies

For each variation, provide:
- title: Brief name (2-5 words)
- description: How it differs (1-2 sentences)
- differences: 2-3 key differences

IMPORTANT: 
- Respond with ONLY a valid JSON array
- Do not include any explanatory text, markdown formatting, or code blocks
- Do not include prefixes like "Example response:" or "Here is:"
- Start your response with [ and end with ]
- Ensure the JSON is complete and properly closed
- Generate all ${count} variations

Output format (JSON array):
[
  {
    "title": "Variation Name",
    "description": "How this differs from original...",
    "differences": ["Difference 1", "Difference 2"]
  }
]`;
    },

    /**
     * Generate expansion prompt for idea development
     */
    expansion: (params: ExpansionPromptParams): string => {
        const category = params.category || 'general';
        const tags = params.tags && params.tags.length > 0 ? params.tags.join(', ') : 'none';
        const detailLevel = params.detailLevel || 'detailed';

        return `Expand this idea into a structured description.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}

Requirements:
- Preserve original meaning and intent
- Add detail without changing core concept
- Use markdown formatting
- Detail level: ${detailLevel}

Structure:
## Overview
Clear summary (2-3 sentences)

## Key Features / Mechanics
Main features, mechanics, or core components

## Goals / Objectives
What this idea aims to achieve

## Potential Challenges
Potential obstacles or challenges

## Next Steps
Initial steps to explore or develop

Response:`;
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

        return `Reorganize this idea into a structured format.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}

Critical rules:
1. Preserve ALL information - do not remove content
2. Organize into logical sections
3. Remove redundancy, keep unique points
4. Maintain original meaning
5. Use markdown (headings, lists, emphasis)

Target structure:
- ${targetStructure}

Preserve exactly (if any):
- ${preserveSections}

Output: Reorganized content with markdown formatting`;
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

Identify:
1. Common themes connecting these ideas
2. Common patterns or structures
3. Why these ideas belong together
4. Potential synergies or combinations${params.otherClusterIdeas ? '\n5. Relationship to other cluster' : ''}

Output format (JSON):
{
  "commonThemes": ["Theme 1", "Theme 2"],
  "commonPatterns": ["Pattern 1", "Pattern 2"],
  "relationshipExplanation": "Why these belong together...",
  "synergies": ["Synergy 1", "Synergy 2"],${params.otherClusterIdeas ? '\n  "relationshipToOtherCluster": "Relationship...",' : ''}
  "relevance": 0.0-1.0
}

Response:`;
    }
};

