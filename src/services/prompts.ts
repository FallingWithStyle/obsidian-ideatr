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

        return `Generate ${count} creative, distinct variations of this idea.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}${focus}

CRITICAL REQUIREMENTS:
- Each variation should be meaningfully different, not just minor tweaks
- Explore diverse angles: different audiences, use cases, business models, technologies, or problem-solving approaches
- Variations should be interesting and potentially viable on their own
- Avoid variations that are too similar to each other

For each variation, provide:
- title: Brief, descriptive name (2-5 words) that captures the variation's unique angle
- description: Clear explanation of how this variation differs from the original (1-2 sentences). Be specific about what changed and why it matters.
- differences: 2-3 concrete, specific differences that make this variation distinct. Focus on meaningful changes, not trivial details.

Variation strategies to consider:
- Different target audience (e.g., B2B vs B2C, professionals vs consumers)
- Different problem focus (e.g., different pain point, different use case)
- Different business model (e.g., subscription vs one-time, freemium vs premium)
- Different technology approach (e.g., mobile-first vs web-first, AI-powered vs manual)
- Different scope (e.g., enterprise vs personal, comprehensive vs focused)
- Different angle (e.g., productivity vs entertainment, serious vs playful)

IMPORTANT: 
- Respond with ONLY a valid JSON array
- Do not include any explanatory text, markdown formatting, or code blocks
- Do not include prefixes like "Example response:" or "Here is:"
- Start your response with [ and end with ]
- Ensure the JSON is complete and properly closed
- Generate all ${count} variations
- Make each variation distinct and interesting

Output format (JSON array):
[
  {
    "title": "Variation Name",
    "description": "How this differs from original...",
    "differences": ["Difference 1", "Difference 2", "Difference 3"]
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

        return `Expand this idea into a comprehensive, structured description.

Original Idea:
${params.ideaText}

Category: ${category}
Tags: ${tags}

CRITICAL REQUIREMENTS:
- Preserve the original meaning and core concept completely
- Add meaningful detail that enhances understanding without changing the fundamental idea
- Use clear markdown formatting with proper headings
- Detail level: ${detailLevel} (brief = concise, detailed = thorough, comprehensive = extensive)

Structure your expansion as follows:

## Overview
A clear, concise summary (2-4 sentences) that captures:
- What this idea is
- The core problem it solves or value it provides
- Why it matters or what makes it interesting

## Key Features / Mechanics
Main features, mechanics, or core components. For ${detailLevel === 'comprehensive' ? 'each feature, explain how it works and why it matters' : detailLevel === 'detailed' ? 'each feature, provide a brief explanation' : 'each feature, list it concisely'}:
- What are the essential components or features?
- How do they work together?
- What makes them unique or effective?

## Goals / Objectives
What this idea aims to achieve:
- Primary goals (what problem does it solve?)
- Secondary benefits (what additional value does it provide?)
- Success criteria (how would you know it's working?)

## Potential Challenges
Realistic obstacles or challenges to consider:
- Technical challenges
- Market or adoption challenges
- Resource or implementation challenges
- Competitive or strategic challenges

## Next Steps
Concrete, actionable initial steps to explore or develop:
- Research or validation steps
- Prototyping or development steps
- Market or user research steps
- Partnership or resource acquisition steps

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

