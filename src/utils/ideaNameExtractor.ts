/**
 * Enhanced idea name extraction utilities
 * Supports both rule-based and LLM-based extraction
 */

/**
 * Extract idea name from idea text using rule-based approach
 */
export function extractIdeaNameRuleBased(ideaText: string): string {
    if (!ideaText || ideaText.trim().length === 0) {
        return '';
    }

    // Extract first line
    const firstLine = ideaText.split('\n')[0].trim();
    
    // Truncate to 50 characters
    let name = firstLine.substring(0, 50).trim();
    
    // Remove special characters (keep alphanumeric, spaces, hyphens)
    name = name.replace(/[^a-zA-Z0-9\s-]/g, '');
    
    // If too short, use first 50 chars of full text
    if (name.length < 3) {
        name = ideaText.substring(0, 50).trim();
        name = name.replace(/[^a-zA-Z0-9\s-]/g, '');
    }
    
    return name;
}

/**
 * Extract idea name using LLM for better accuracy
 * Falls back to rule-based extraction if LLM is unavailable or fails
 */
export async function extractIdeaNameWithLLM(
    ideaText: string,
    llmService?: { complete?: (prompt: string, options?: any) => Promise<string>; isAvailable?: () => boolean }
): Promise<string> {
    // Fallback to rule-based if no LLM service
    if (!llmService?.complete) {
        return extractIdeaNameRuleBased(ideaText);
    }

    // Check if LLM is available
    if (llmService.isAvailable && !llmService.isAvailable()) {
        return extractIdeaNameRuleBased(ideaText);
    }

    try {
        // Construct prompt for name extraction
        const prompt = `Extract the name or title from this idea. Return only the name, nothing else.

Idea: "${ideaText}"

Name:`;

        // Call LLM with conservative settings
        const response = await llmService.complete(prompt, {
            temperature: 0.3, // Lower temperature for more consistent extraction
            n_predict: 50, // Limit response length
            stop: ['\n', '.', '!', '?'] // Stop at sentence boundaries
        });

        // Clean and validate the response
        let extractedName = response.trim();
        
        // Remove quotes if present
        extractedName = extractedName.replace(/^["']|["']$/g, '');
        
        // Truncate to 50 characters
        extractedName = extractedName.substring(0, 50).trim();
        
        // Remove special characters (keep alphanumeric, spaces, hyphens)
        extractedName = extractedName.replace(/[^a-zA-Z0-9\s-]/g, '');
        
        // Validate: if result is too short or empty, fallback to rule-based
        if (extractedName.length < 3) {
            return extractIdeaNameRuleBased(ideaText);
        }
        
        return extractedName;
    } catch (error) {
        // If LLM extraction fails, fallback to rule-based
        console.warn('LLM name extraction failed, using rule-based fallback:', error);
        return extractIdeaNameRuleBased(ideaText);
    }
}

