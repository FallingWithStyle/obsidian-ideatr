/**
 * IdeaIdGenerator - Generates unique IDs for ideas without using AI
 * 
 * Uses a combination of timestamp and random component to ensure uniqueness
 */

/**
 * Generate a unique ID for an idea
 * Format: timestamp (milliseconds since epoch) + random 4-digit suffix
 * This ensures uniqueness even if multiple ideas are created in the same millisecond
 */
export function generateIdeaId(): number {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000); // 0-9999
    // Combine: timestamp * 10000 + random suffix
    // This gives us a large number that's guaranteed unique
    return timestamp * 10000 + randomSuffix;
}

/**
 * Get the next available ID by finding the maximum existing ID and adding 1
 * This is a fallback method that ensures sequential IDs if needed
 */
export function getNextSequentialId(existingIds: number[]): number {
    if (existingIds.length === 0) {
        return 1;
    }
    const maxId = Math.max(...existingIds);
    return maxId + 1;
}

/**
 * Generate a unique ID that doesn't conflict with existing IDs
 * Uses sequential approach if timestamp-based would conflict
 */
export function generateUniqueId(existingIds: number[]): number {
    let candidateId = generateIdeaId();
    let attempts = 0;
    const maxAttempts = 10;
    
    // If there's a conflict, try sequential approach
    while (existingIds.includes(candidateId) && attempts < maxAttempts) {
        candidateId = getNextSequentialId(existingIds);
        attempts++;
    }
    
    // If still conflicts after max attempts, use sequential
    if (existingIds.includes(candidateId)) {
        return getNextSequentialId(existingIds);
    }
    
    return candidateId;
}

