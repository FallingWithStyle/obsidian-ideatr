/**
 * Utility functions for repairing incomplete JSON from LLM responses
 */

/**
 * Repair incomplete JSON by adding missing closing braces and brackets
 * Handles common issues like:
 * - Missing closing braces/brackets
 * - Trailing commas
 * - Incomplete JSON structures
 * - Missing commas between elements
 * - Incomplete array elements (e.g., cut off mid-array)
 * - Missing commas between object properties
 */
export function repairJSON(jsonStr: string): string {
    let repaired = jsonStr.trim();
    
    // First pass: Fix missing commas between properties/array elements
    // This is done by analyzing the structure and inserting commas where needed
    repaired = fixMissingCommas(repaired);
    
    // Remove trailing commas before closing characters (JSON doesn't allow trailing commas)
    // This regex removes commas that are followed only by whitespace and closing brackets/braces
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');
    repaired = repaired.replace(/,\s*$/, '');
    
    // Count opening and closing braces/brackets
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;
    let lastNonWhitespace = -1;
    
    // Track the state at each position to understand what needs to be closed
    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        
        if (!/\s/.test(char)) {
            lastNonWhitespace = i;
        }
        
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        
        if (char === '\\') {
            escapeNext = true;
            continue;
        }
        
        if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
        }
        
        if (inString) {
            continue;
        }
        
        if (char === '{') {
            openBraces++;
        } else if (char === '}') {
            openBraces--;
        } else if (char === '[') {
            openBrackets++;
        } else if (char === ']') {
            openBrackets--;
        }
    }
    
    // Remove any trailing whitespace before adding closing characters
    repaired = repaired.trimEnd();
    
    // Check if we're in the middle of a string (incomplete string)
    if (inString && lastNonWhitespace >= 0) {
        // Close the string
        repaired += '"';
    }
    
    // Close structures in the correct order:
    // 1. Close braces (objects) first - objects can be nested inside arrays
    //    Example: [{"key": "value" needs } then ]
    // 2. Close brackets (arrays) last - arrays are the outer structure
    // This ensures proper nesting: objects inside arrays get closed before the array
    
    // Add missing closing braces first (close objects before arrays)
    while (openBraces > 0) {
        repaired += '}';
        openBraces--;
    }
    
    // Add missing closing brackets (close arrays after objects)
    while (openBrackets > 0) {
        repaired += ']';
        openBrackets--;
    }
    
    return repaired;
}

/**
 * Fix missing commas between JSON properties and array elements
 * Handles the most common case: missing comma between closing quote and next property
 */
function fixMissingCommas(jsonStr: string): string {
    // Use a simple approach: look for patterns like "value" "nextKey" or "value" \n "nextKey"
    // where we're clearly missing a comma between object properties
    // We need to be careful to only match outside of strings
    
    let result = '';
    let i = 0;
    let inString = false;
    let escapeNext = false;
    
    while (i < jsonStr.length) {
        const char = jsonStr[i];
        
        if (escapeNext) {
            result += char;
            escapeNext = false;
            i++;
            continue;
        }
        
        if (char === '\\') {
            result += char;
            escapeNext = true;
            i++;
            continue;
        }
        
        if (char === '"' && !escapeNext) {
            inString = !inString;
            result += char;
            
            // If we just closed a string and the next non-whitespace char is a quote,
            // we likely need a comma
            if (!inString) {
                let j = i + 1;
                // Skip whitespace
                while (j < jsonStr.length && /\s/.test(jsonStr[j])) {
                    j++;
                }
                
                if (j < jsonStr.length) {
                    const nextChar = jsonStr[j];
                    // Check if there's a comma between here and nextChar
                    const between = jsonStr.substring(i + 1, j);
                    const hasComma = between.indexOf(',') !== -1;
                    
                    // If next char is a quote (starting new property) and no comma, add one
                    if (!hasComma && nextChar === '"') {
                        // Make sure we're not in a context where comma would be wrong
                        // Check what came before the closing quote - should be a value, not a key
                        let k = i - 1;
                        while (k >= 0 && /\s/.test(jsonStr[k])) {
                            k--;
                        }
                        // If there's a colon before, this was a key, not a value - don't add comma
                        // If there's a comma or opening brace/bracket, this was a value - add comma
                        if (k >= 0) {
                            const beforeQuote = jsonStr[k];
                            if (beforeQuote !== ':' && (beforeQuote === ',' || beforeQuote === '{' || 
                                beforeQuote === '[' || beforeQuote === '"' || beforeQuote === '}' || 
                                beforeQuote === ']')) {
                                result += ',';
                            }
                        } else {
                            // At start, assume it's a value
                            result += ',';
                        }
                    }
                }
            }
            
            i++;
            continue;
        }
        
        if (inString) {
            result += char;
            i++;
            continue;
        }
        
        // Handle missing comma after closing brace/bracket
        if ((char === '}' || char === ']') && i + 1 < jsonStr.length) {
            result += char;
            let j = i + 1;
            while (j < jsonStr.length && /\s/.test(jsonStr[j])) {
                j++;
            }
            
            if (j < jsonStr.length) {
                const nextChar = jsonStr[j];
                const between = jsonStr.substring(i + 1, j);
                const hasComma = between.indexOf(',') !== -1;
                
                // Only add comma if:
                // 1. Next char starts a new value (quote, brace, or bracket)
                // 2. No comma already exists
                // Note: We don't need to check for closing braces/brackets here because
                // the condition above already ensures nextChar is one of '"', '{', or '['
                if (!hasComma && 
                    (nextChar === '"' || nextChar === '{' || nextChar === '[')) {
                    result += ',';
                }
            }
            // If we're at the end of the string or only whitespace follows,
            // don't add a comma - we're closing the structure
            i++;
            continue;
        }
        
        result += char;
        i++;
    }
    
    return result;
}

/**
 * Extract and repair JSON from LLM response
 * Handles responses that may contain markdown code blocks or extra text
 */
export function extractAndRepairJSON(content: string, isArray: boolean = false): string {
    let jsonStr = content.trim();
    
    // First, try to extract from markdown code blocks
    // Match ```json ... ``` or ``` ... ``` blocks
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
    const codeBlockMatch = jsonStr.match(codeBlockRegex);
    if (codeBlockMatch && codeBlockMatch[1]) {
        jsonStr = codeBlockMatch[1].trim();
    }
    
    // Remove common prefixes that LLMs might add (including newlines after them)
    // Handle patterns like "Here is the requested JSON array with 8 variations:"
    jsonStr = jsonStr.replace(/^(?:Here'?s?|Here is|Response:|Output:).*?:\s*\n?\s*/i, '');
    jsonStr = jsonStr.replace(/^(?:Example:|Example format:|Example response:).*?:\s*\n?\s*/i, '');
    // Also remove generic "Here is" patterns
    jsonStr = jsonStr.replace(/^Here is.*?:\s*\n?\s*/i, '');
    
    // Try to find the first occurrence of a JSON array or object
    // Look for the opening bracket/brace
    const arrayStart = jsonStr.indexOf('[');
    const objectStart = jsonStr.indexOf('{');
    
    let startIndex = -1;
    if (isArray && arrayStart !== -1) {
        startIndex = arrayStart;
    } else if (!isArray && objectStart !== -1) {
        // For objects, prefer the opening brace
        startIndex = objectStart;
    } else if (arrayStart !== -1 && objectStart !== -1) {
        // Both found, use the one that comes first
        startIndex = Math.min(arrayStart, objectStart);
    } else if (!isArray && objectStart === -1) {
        // For objects, if no opening brace found, don't extract from array start
        // We'll add the opening brace to the whole content later
        startIndex = -1;
    } else if (arrayStart !== -1) {
        startIndex = arrayStart;
    } else if (objectStart !== -1) {
        startIndex = objectStart;
    }
    
    // If we found a start index, extract from there
    // For objects without opening braces, we keep the whole string and add '{' later
    if (startIndex !== -1 && startIndex > 0) {
        jsonStr = jsonStr.substring(startIndex);
    }
    
    // Trim again after substring operation to remove any leading whitespace
    jsonStr = jsonStr.trim();
    
    // Ensure content starts with brace or bracket
    if (isArray && !jsonStr.startsWith('[')) {
        // If we're expecting an array but got an object, wrap it
        if (jsonStr.startsWith('{')) {
            jsonStr = `[${jsonStr}]`;
        } else {
            jsonStr = `[${jsonStr}`;
        }
    } else if (!isArray && !jsonStr.startsWith('{')) {
        // If we're expecting an object but it doesn't start with '{',
        // add the opening brace. This handles cases where the LLM response
        // is missing the opening brace but has valid object properties.
        jsonStr = `{${jsonStr}`;
    }
    
    // For incomplete JSON (which is common with LLM responses),
    // we'll let repairJSON handle closing the structures
    // But first, try to find a complete structure if it exists
    
    // Find the end of the JSON structure
    // For arrays, find the matching closing bracket
    // For objects, find the matching closing brace
    if (isArray && jsonStr.startsWith('[')) {
        let bracketCount = 0;
        let inString = false;
        let escapeNext = false;
        let endIndex = -1;
        
        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];
            
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
            }
            
            if (inString) {
                continue;
            }
            
            if (char === '[') {
                bracketCount++;
            } else if (char === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                    endIndex = i + 1;
                    break;
                }
            }
        }
        
        // Only truncate if we found a complete structure
        // Otherwise, keep the incomplete JSON for repair
        if (endIndex !== -1 && bracketCount === 0) {
            jsonStr = jsonStr.substring(0, endIndex);
        }
    } else if (!isArray && jsonStr.startsWith('{')) {
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        let endIndex = -1;
        
        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];
            
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
            }
            
            if (inString) {
                continue;
            }
            
            if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIndex = i + 1;
                    break;
                }
            }
        }
        
        // Only truncate if we found a complete structure
        if (endIndex !== -1 && braceCount === 0) {
            jsonStr = jsonStr.substring(0, endIndex);
        }
    }
    
    // Repair incomplete JSON
    return repairJSON(jsonStr);
}

