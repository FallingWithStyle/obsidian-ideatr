import { requestUrl } from 'obsidian';

export interface SyncConfig {
    serverUrl: string;
    token: string;
    encryptionKey: string; // User password for key derivation
    salt?: string; // Optional salt for PBKDF2 (if not provided, derived from encryptionKey)
}

export interface DiffBundle {
    changes: FileChange[];
    timestamp: number;
}

export interface FileChange {
    path: string;
    content: string; // Encrypted
    hash: string;
    action?: 'create' | 'update' | 'delete'; // Operation type
    timestamp?: number; // File modification timestamp
}

export interface RollbackState {
    path: string;
    originalContent: string | null; // null if file didn't exist
    originalHash: string | null;
    action: 'create' | 'update' | 'delete';
}

export interface PreparedChange {
    path: string;
    content: string; // Decrypted
    hash: string;
    action: 'create' | 'update' | 'delete';
    timestamp: number;
    rollbackState?: RollbackState; // For rollback on failure
}

export class SyncService {
    private config: SyncConfig;
    private derivedKey: CryptoKey | null = null;
    private maxRetries = 2;
    private retryDelay = 1000; // 1 second

    constructor(config: SyncConfig) {
        this.config = config;
    }

    /**
     * Derives an AES-256 key from the user password using PBKDF2.
     * Per sync protocol: PBKDF2 (User Password + Salt)
     */
    private async deriveKey(): Promise<CryptoKey> {
        if (this.derivedKey) {
            return this.derivedKey;
        }

        // Use provided salt or derive one from encryptionKey (for v1 simplicity)
        // In production, salt should be stored securely per user
        const salt = this.config.salt ?? await this.getDefaultSalt();

        // Convert password and salt to ArrayBuffer
        const passwordBuffer = new TextEncoder().encode(this.config.encryptionKey);
        const saltBuffer = new TextEncoder().encode(salt);

        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        // Derive AES-256 key using PBKDF2
        this.derivedKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 100000, // OWASP recommended minimum
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: 'AES-GCM',
                length: 256
            },
            false,
            ['encrypt', 'decrypt']
        );

        return this.derivedKey;
    }

    /**
     * Gets a default salt derived from the encryption key.
     * In production, this should be a stored, user-specific salt.
     */
    private async getDefaultSalt(): Promise<string> {
        // For v1, derive a consistent salt from the encryption key
        // In production, this should be stored securely per user
        const encoder = new TextEncoder();
        const data = encoder.encode(this.config.encryptionKey + 'ideatr-sync-salt-v1');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
    }

    /**
     * Pushes changes to the server with retry logic.
     * Retries on network errors, but not on 4xx client errors.
     */
    async push(changes: FileChange[]): Promise<boolean> {
        const payload: DiffBundle = {
            changes,
            timestamp: Date.now()
        };

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await requestUrl({
                    url: `${this.config.serverUrl}/sync/push`,
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.config.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                // Don't retry on 4xx errors (client errors)
                if (response.status >= 400 && response.status < 500) {
                    console.error('Sync push failed with client error:', response.status);
                    return false;
                }

                if (response.status === 200) {
                    return true;
                }

                // For 5xx errors, retry
                lastError = new Error(`Server error: ${response.status}`);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Retry on network errors
            }

            // Wait before retrying (exponential backoff)
            if (attempt < this.maxRetries) {
                await this.delay(this.retryDelay * Math.pow(2, attempt));
            }
        }

        console.error('Sync push failed after retries:', lastError);
        return false;
    }

    /**
     * Pulls changes from the server with retry logic.
     */
    async pull(since: number): Promise<FileChange[]> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await requestUrl({
                    url: `${this.config.serverUrl}/sync/pull?since=${since}`,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.config.token}`
                    }
                });

                if (response.status === 200) {
                    const data = response.json as { changes?: unknown[] } | null;
                    return (data && Array.isArray(data.changes)) ? data.changes as FileChange[] : [];
                }

                // Don't retry on 4xx errors
                if (response.status >= 400 && response.status < 500) {
                    console.error('Sync pull failed with client error:', response.status);
                    return [];
                }

                // For 5xx errors, retry
                lastError = new Error(`Server error: ${response.status}`);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
            }

            // Wait before retrying (exponential backoff)
            if (attempt < this.maxRetries) {
                await this.delay(this.retryDelay * Math.pow(2, attempt));
            }
        }

        console.error('Sync pull failed after retries:', lastError);
        return [];
    }

    /**
     * Computes SHA-256 hash of content for change detection.
     */
    async computeHash(content: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Detects conflicts between local and server changes.
     * Returns true if server has a newer version of the same file.
     */
    detectConflict(localChange: FileChange, serverChange: FileChange): boolean {
        // Only check conflicts for the same file
        if (localChange.path !== serverChange.path) {
            return false;
        }

        // Conflict if server timestamp is newer
        const localTimestamp = localChange.timestamp ?? 0;
        const serverTimestamp = serverChange.timestamp ?? 0;

        return serverTimestamp > localTimestamp;
    }

    /**
     * Determines the action type (create/update/delete) based on file state.
     */
    determineAction(oldHash: string | null, newContent: string | null): 'create' | 'update' | 'delete' {
        if (oldHash === null && newContent !== null) {
            return 'create';
        }
        if (oldHash !== null && newContent === null) {
            return 'delete';
        }
        return 'update';
    }

    /**
     * Prepares remote changes for application by decrypting and validating.
     * Returns changes ready to be applied to local files.
     * 
     * @param remoteChanges - Changes from server
     * @param getOriginalContent - Optional function to get original file content for rollback tracking
     */
    async prepareChangesForApplication(
        remoteChanges: FileChange[],
        getOriginalContent?: (path: string) => Promise<string | null>
    ): Promise<PreparedChange[]> {
        const prepared = await Promise.all(
            remoteChanges.map(async (change) => {
                let decryptedContent = '';
                
                // Decrypt content if present (not for delete operations)
                if (change.content && change.action !== 'delete') {
                    try {
                        decryptedContent = await this.decrypt(change.content);
                    } catch (error) {
                        console.error(`Failed to decrypt ${change.path}:`, error);
                        throw new Error(`Decryption failed for ${change.path}`);
                    }
                }

                // Track rollback state if original content provider is available
                let rollbackState: RollbackState | undefined;
                if (getOriginalContent) {
                    const originalContent = await getOriginalContent(change.path);
                    const originalHash = originalContent ? await this.computeHash(originalContent) : null;
                    
                    rollbackState = {
                        path: change.path,
                        originalContent: originalContent,
                        originalHash: originalHash,
                        action: change.action ?? 'update'
                    };
                }

                return {
                    path: change.path,
                    content: decryptedContent,
                    hash: change.hash,
                    action: change.action ?? 'update',
                    timestamp: change.timestamp ?? Date.now(),
                    rollbackState
                };
            })
        );

        return prepared;
    }

    /**
     * Creates rollback state for a file before patch application.
     * Call this before applying a patch to enable rollback on failure.
     */
    async createRollbackState(
        path: string,
        originalContent: string | null,
        action: 'create' | 'update' | 'delete'
    ): Promise<RollbackState> {
        const originalHash = originalContent ? await this.computeHash(originalContent) : null;
        
        return {
            path,
            originalContent,
            originalHash,
            action
        };
    }

    /**
     * Generates a conflict file name following the pattern:
     * {original-filename} (conflict-{timestamp}).md
     */
    generateConflictFileName(originalPath: string, timestamp?: number): string {
        const conflictTimestamp = timestamp ?? Date.now();
        const pathParts = originalPath.split('/');
        const filename = pathParts.pop() ?? 'unknown.md';
        const directory = pathParts.join('/');
        
        // Extract base filename without extension
        const nameParts = filename.split('.');
        const extension = nameParts.length > 1 ? '.' + nameParts.pop() : '';
        const baseName = nameParts.join('.');
        
        const conflictFilename = `${baseName} (conflict-${conflictTimestamp})${extension}`;
        
        return directory ? `${directory}/${conflictFilename}` : conflictFilename;
    }

    /**
     * Generates conflict file content with both local and remote versions.
     * Includes metadata about the conflict.
     */
    generateConflictFileContent(
        originalPath: string,
        localContent: string,
        remoteContent: string,
        localTimestamp: number,
        remoteTimestamp: number
    ): string {
        const localDate = new Date(localTimestamp).toISOString();
        const remoteDate = new Date(remoteTimestamp).toISOString();
        
        return `---
type: conflict
original-path: ${originalPath}
local-timestamp: ${localTimestamp}
remote-timestamp: ${remoteTimestamp}
---

# Conflict: ${originalPath}

This file was created due to a sync conflict. Both local and remote versions are preserved below.

**Conflict Details:**
- Original path: \`${originalPath}\`
- Local version timestamp: ${localDate}
- Remote version timestamp: ${remoteDate}
- Conflict detected: ${new Date().toISOString()}

---

## Local Version (timestamp: ${localTimestamp})

${localContent}

---

## Remote Version (timestamp: ${remoteTimestamp})

${remoteContent}

---

## Resolution Instructions

To resolve this conflict:
1. Review both versions above
2. Edit this file to keep the desired content
3. Delete this conflict file once resolved
4. The resolved version will sync on the next sync cycle
`;
    }

    /**
     * Validates that a file change's hash matches its content.
     * Useful for verifying integrity after patch application.
     */
    async validateFileChange(change: { path: string; content: string; hash: string }): Promise<boolean> {
        const computedHash = await this.computeHash(change.content);
        return computedHash === change.hash;
    }

    /**
     * Helper to delay execution (for retry backoff).
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Encrypts content using AES-256-GCM.
     * Format: IV (12 bytes) + encrypted content + auth tag (16 bytes)
     * Per sync protocol: AES-256-GCM with random 12-byte IV prepended to content
     */
    async encrypt(content: string): Promise<string> {
        const key = await this.deriveKey();
        
        // Generate random 12-byte IV (required for GCM)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Convert content to ArrayBuffer
        const contentBuffer = new TextEncoder().encode(content);
        
        // Encrypt using AES-256-GCM
        const encryptedBuffer = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            contentBuffer
        );
        
        // Combine IV + encrypted data (which includes auth tag)
        // GCM automatically appends the 16-byte auth tag to the encrypted data
        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);
        
        // Convert to base64 for storage/transmission
        // Use Array.from to handle large arrays that might exceed max call stack
        const binaryString = Array.from(combined, byte => String.fromCharCode(byte)).join('');
        return btoa(binaryString);
    }

    /**
     * Decrypts content encrypted with AES-256-GCM.
     * Expects format: IV (12 bytes) + encrypted content + auth tag (16 bytes)
     */
    async decrypt(encryptedContent: string): Promise<string> {
        const key = await this.deriveKey();
        
        // Decode from base64
        const binaryString = atob(encryptedContent);
        const combined = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            combined[i] = binaryString.charCodeAt(i);
        }
        
        // Extract IV (first 12 bytes)
        const iv = combined.slice(0, 12);
        
        // Extract encrypted data with auth tag (remaining bytes)
        const encryptedData = combined.slice(12);
        
        // Decrypt using AES-256-GCM
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encryptedData
        );
        
        // Convert back to string
        return new TextDecoder().decode(decryptedBuffer);
    }
}
