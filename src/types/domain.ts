/**
 * Type definitions for domain validation services
 */

/**
 * Result from domain availability check
 */
export interface DomainCheckResult {
    domain: string;
    available: boolean;
    error?: string;
    checkedAt: string; // ISO 8601 timestamp
}

/**
 * Domain Checking Service interface
 */
export interface IProspectrService {
    /**
     * Check if a domain is available
     */
    checkDomainAvailability(domain: string): Promise<DomainCheckResult>;

    /**
     * Check multiple domains at once
     */
    checkDomainsAvailability(domains: string[]): Promise<DomainCheckResult[]>;

    /**
     * Check if domain checking service is available
     */
    isAvailable(): boolean;
}

/**
 * Domain Service interface (orchestrator)
 */
export interface IDomainService {
    /**
     * Extract domain names from idea text
     */
    extractDomains(text: string): string[];

    /**
     * Check domain availability for an idea
     * @param text - Idea text to extract domains from
     * @param projectName - Optional project name to generate domain suggestions
     */
    checkDomains(text: string, projectName?: string): Promise<DomainCheckResult[]>;
}

/**
 * Error types for domain checking
 */
export class DomainError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = 'DomainError';
    }
}

export class ProspectrUnavailableError extends DomainError {
    constructor(message: string = 'Domain checking service is not available') {
        super(message);
        this.name = 'ProspectrUnavailableError';
    }
}

