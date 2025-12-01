import type { ILLMService } from '../types/classification';
import type { TransformationPlan, TransformationResult } from '../types/transformation';
import { extractAndRepairJSON } from '../utils/jsonRepair';
import { Logger } from '../utils/logger';

/**
 * GuidedIdeationService - Analyzes user intent and executes transformations
 */
export class GuidedIdeationService {
    private llmService: ILLMService;

    constructor(llmService: ILLMService) {
        this.llmService = llmService;
    }

    /**
     * Analyze user prompt to determine transformation intent
     */
    async analyzeIntent(
        userPrompt: string,
        noteContent: string,
        frontmatter: any
    ): Promise<TransformationPlan> {
        const prompt = this.buildIntentAnalysisPrompt(userPrompt, noteContent, frontmatter);

        try {
            if (!this.llmService.complete) {
                throw new Error('LLM service does not support completion');
            }
            const response = await this.llmService.complete(prompt, {
                temperature: 0.3, // Lower temperature for more consistent classification
                n_predict: 1000,
                stop: ['}']
            });

            const plan = this.parseIntentResponse(response);
            return plan;
        } catch (error) {
            Logger.warn('Intent analysis failed:', error);
            // Fallback to a generic plan
            return {
                intent: 'custom',
                operations: [{
                    type: 'transform',
                    target: 'body',
                    action: userPrompt
                }],
                description: `Apply transformation: ${userPrompt}`,
                requiresBodyModification: true
            };
        }
    }

    /**
     * Execute transformation based on plan
     */
    async executeTransformation(
        userPrompt: string,
        transformationPlan: TransformationPlan,
        noteContent: string,
        frontmatter: any,
        _body: string,
        currentFilename?: string
    ): Promise<TransformationResult> {
        const prompt = this.buildExecutionPrompt(
            userPrompt,
            transformationPlan,
            noteContent,
            frontmatter,
            currentFilename
        );

        try {
            if (!this.llmService.complete) {
                throw new Error('LLM service does not support completion');
            }
            const response = await this.llmService.complete(prompt, {
                temperature: 0.7, // Higher temperature for more creative transformations
                n_predict: 4000,
                stop: ['}']
            });

            const result = this.parseExecutionResponse(response);
            return result;
        } catch (error) {
            Logger.error('Transformation execution failed:', error);
            throw new Error(`Failed to execute transformation: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Build intent analysis prompt
     */
    private buildIntentAnalysisPrompt(
        userPrompt: string,
        noteContent: string,
        frontmatter: any
    ): string {
        const frontmatterStr = JSON.stringify(frontmatter, null, 2);
        const contentPreview = noteContent.substring(0, 2000); // Limit content size

        return `Analyze this user request and determine what transformation to perform on an idea note.

User Request: "${userPrompt}"

Current Note Content (preview):
${contentPreview}

Frontmatter:
${frontmatterStr}

Available Operations:
- organize: Sort, group, or structure content (e.g., "sort alphabetically", "group by category")
- expand: Add content, examples, or variations (e.g., "add 3 alternatives", "include examples")
- transform: Rename, reformat, or restructure (e.g., "rename to X", "make it shorter", "convert to list")
- analyze: Extract insights or identify issues (e.g., "find problems", "list assumptions")
- restructure: Move, split, or combine sections (e.g., "move section X to top", "split into 3 parts")

Determine:
1. Primary intent (one of the operations above)
2. Specific action to take
3. What parts of the note to modify
4. Expected outcome

Respond in JSON format (no markdown, no code blocks, just JSON):
{
  "intent": "organize|expand|transform|analyze|restructure|custom",
  "action": "specific action description",
  "target": "what to modify (e.g., 'list in body', 'frontmatter fields', 'section X')",
  "expectedOutcome": "what the result should look like",
  "requiresFileRename": false,
  "requiresFrontmatterUpdate": false,
  "requiresBodyModification": true,
  "description": "human-readable description of what will happen"
}

Response: {`;
    }

    /**
     * Build execution prompt
     */
    private buildExecutionPrompt(
        userPrompt: string,
        transformationPlan: TransformationPlan,
        noteContent: string,
        frontmatter: any,
        currentFilename?: string
    ): string {
        const frontmatterStr = JSON.stringify(frontmatter, null, 2);
        const filenameInfo = currentFilename ? `\nCurrent Filename: ${currentFilename}` : '';

        // Get intent-specific instructions
        const intentInstructions = this.getIntentInstructions(transformationPlan.intent);

        // Extract operation details from the first operation if available
        const firstOp = transformationPlan.operations[0];
        const action = firstOp?.action || transformationPlan.description;
        const target = firstOp?.target || 'body';
        const expectedOutcome = transformationPlan.description;

        return `Transform this idea note according to the user's request.

User Request: "${userPrompt}"

Transformation Plan:
- Intent: ${transformationPlan.intent}
- Action: ${action}
- Target: ${target}
- Expected Outcome: ${expectedOutcome}

Current Note Content:
${noteContent}${filenameInfo}

Frontmatter:
${frontmatterStr}

Instructions:
${intentInstructions}

Critical Rules:
1. Preserve ALL important information unless explicitly asked to remove it
2. Maintain valid YAML frontmatter structure
3. Preserve markdown formatting
4. Keep the original intent and meaning of the content
5. Only make changes that align with the user's request

Generate the transformed content. If no changes are needed to a section, return it as-is.

Output format (JSON only, no markdown, no code blocks):
{
  "newFilename": "new-filename.md" (if rename needed, else null),
  "frontmatter": { ... updated frontmatter as JSON object ... },
  "body": "transformed body content as string",
  "summary": "brief description of changes made"
}

Response: {`;
    }

    /**
     * Get intent-specific instructions
     */
    private getIntentInstructions(intent: string): string {
        const instructions: Record<string, string> = {
            organize: `- Organize content logically (sort, group, structure)
- Maintain all original content
- Use clear headings and structure
- Preserve relationships between items`,

            expand: `- Add new content that enhances the idea
- Maintain consistency with existing content
- Add content in appropriate locations
- Use markdown formatting for new content`,

            transform: `- Transform content format or structure
- Preserve meaning while changing presentation
- Update references if renaming
- Maintain valid markdown`,

            analyze: `- Extract insights from the content
- Identify patterns, problems, or assumptions
- Add analysis as a new section or append to existing
- Use clear headings for analysis results`,

            restructure: `- Reorganize sections or content
- Maintain all information
- Update section order logically
- Preserve content within sections`,

            custom: `- Follow the user's specific request
- Make reasonable interpretations
- Preserve important information
- Apply changes as requested`
        };

        return instructions[intent] || instructions.custom;
    }

    /**
     * Parse intent analysis response
     */
    private parseIntentResponse(response: string): TransformationPlan {
        try {
            const repaired = extractAndRepairJSON(response, true);
            const parsed = JSON.parse(repaired);

            const intent = this.validateIntent(parsed.intent || 'custom');
            
            return {
                intent,
                operations: [{
                    type: parsed.action || 'transform',
                    target: parsed.target || 'body',
                    action: parsed.action || 'custom transformation',
                    parameters: {}
                }],
                description: parsed.description || `Apply ${intent} transformation`,
                requiresFileRename: parsed.requiresFileRename === true,
                requiresFrontmatterUpdate: parsed.requiresFrontmatterUpdate === true,
                requiresBodyModification: parsed.requiresBodyModification !== false
            };
        } catch (error) {
            Logger.warn('Failed to parse intent response:', error);
            // Return default plan
            return {
                intent: 'custom',
                operations: [{
                    type: 'transform',
                    target: 'body',
                    action: 'custom transformation'
                }],
                description: 'Apply custom transformation',
                requiresBodyModification: true
            };
        }
    }

    /**
     * Parse execution response
     */
    private parseExecutionResponse(
        response: string
    ): TransformationResult {
        try {
            const repaired = extractAndRepairJSON(response, true);
            const parsed = JSON.parse(repaired);

            return {
                newFilename: parsed.newFilename || null,
                frontmatter: parsed.frontmatter || undefined,
                body: parsed.body || undefined,
                summary: parsed.summary || 'Transformation applied'
            };
        } catch (error) {
            Logger.warn('Failed to parse execution response:', error);
            // Try to extract just the body if JSON parsing fails
            const bodyMatch = response.match(/"body"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
            if (bodyMatch) {
                return {
                    body: bodyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
                    summary: 'Transformation applied (partial parsing)'
                };
            }
            throw new Error('Failed to parse transformation result');
        }
    }

    /**
     * Validate intent type
     */
    private validateIntent(intent: string): TransformationPlan['intent'] {
        const validIntents: TransformationPlan['intent'][] = [
            'organize',
            'expand',
            'transform',
            'analyze',
            'restructure',
            'custom'
        ];
        return validIntents.includes(intent as any) ? (intent as TransformationPlan['intent']) : 'custom';
    }

    /**
     * Check if service is available
     */
    isAvailable(): boolean {
        return this.llmService.isAvailable();
    }
}


