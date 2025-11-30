import type { IDomainService, IProspectrService, DomainCheckResult } from '../types/domain';

/**
 * DomainService - Orchestrates domain extraction and availability checking
 * 
 * Uses ProspectrService for domain availability checks (optional integration).
 * Gracefully handles Prospectr unavailability by returning error status in results.
 */
export class DomainService implements IDomainService {
    private prospectrService: IProspectrService;

    constructor(prospectrService: IProspectrService) {
        this.prospectrService = prospectrService;
    }

    /**
     * Extract domain names from idea text
     * 
     * Simple regex-based extraction for common domain patterns
     */
    extractDomains(text: string): string[] {
        // Pattern to match domain-like strings (e.g., "example.com", "myapp.io")
        // Matches: word characters, dots, and common TLDs
        const domainPattern = /\b([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:[a-zA-Z]{2,}))\b/g;
        
        const matches = text.match(domainPattern);
        if (!matches) {
            return [];
        }

        // Also extract potential domain names from quoted strings or after "domain:" patterns
        const quotedPattern = /["']([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})["']/g;
        const quotedMatches = text.match(quotedPattern);
        if (quotedMatches) {
            quotedMatches.forEach(match => {
                const domain = match.replace(/["']/g, '');
                if (!matches.includes(domain)) {
                    matches.push(domain);
                }
            });
        }

        // Extract after "domain:" or "domains:" patterns
        const domainLabelPattern = /domain(?:s)?:\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
        const labelMatches = text.match(domainLabelPattern);
        if (labelMatches) {
            labelMatches.forEach(match => {
                const domain = match.replace(/domain(?:s)?:\s*/i, '').trim();
                if (domain && !matches.includes(domain)) {
                    matches.push(domain);
                }
            });
        }

        // Deduplicate and return
        return [...new Set(matches.map(d => d.toLowerCase().trim()))];
    }

    /**
     * Check domain availability for an idea
     * 
     * Extracts domains from text and checks availability using ProspectrService.
     * Only checks domains that are explicitly mentioned in the text.
     * 
     * @param text - Idea text to extract domains from
     * @param projectName - Optional project name (reserved for future use)
     */
    async checkDomains(text: string, _projectName?: string): Promise<DomainCheckResult[]> {
        const domains = this.extractDomains(text);
        
        if (domains.length === 0) {
            return [];
        }

        // Use ProspectrService to check availability (optional integration)
        if (!this.prospectrService.isAvailable()) {
            // Return results indicating domain checking is not available
            return domains.map(domain => ({
                domain,
                available: false,
                error: 'Domain checking service is not available',
                checkedAt: new Date().toISOString()
            }));
        }

        try {
            return await this.prospectrService.checkDomainsAvailability(domains);
        } catch (error) {
            // Handle errors gracefully
            console.warn('Domain checking failed:', error);
            return domains.map(domain => ({
                domain,
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                checkedAt: new Date().toISOString()
            }));
        }
    }
}

