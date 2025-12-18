/**
 * ObsidianHttpClient - HTTP client implementation for Obsidian
 * 
 * Wraps Obsidian's requestUrl API to implement the HttpClient interface
 * from @ideatr/core.
 */

import { requestUrl } from 'obsidian';
import type { HttpClient, HttpRequestOptions, HttpResponse } from '@ideatr/core';

/**
 * HTTP client implementation using Obsidian's requestUrl
 */
export class ObsidianHttpClient implements HttpClient {
    /**
     * Make an HTTP request using Obsidian's requestUrl
     */
    async request(options: HttpRequestOptions): Promise<HttpResponse> {
        try {
            const response = await requestUrl({
                url: options.url,
                method: options.method,
                headers: options.headers,
                body: options.body
            });

            return {
                status: response.status,
                json: response.json,
                text: response.text
            };
        } catch (error) {
            // Obsidian's requestUrl throws on network errors
            // Re-throw as a more descriptive error
            throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

