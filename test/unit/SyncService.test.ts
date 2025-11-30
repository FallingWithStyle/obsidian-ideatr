import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService, SyncConfig } from '../../src/services/SyncService';
import * as obsidian from 'obsidian';

// Mock Obsidian's requestUrl
vi.mock('obsidian', () => ({
    requestUrl: vi.fn()
}));

describe('SyncService', () => {
    let service: SyncService;
    const config: SyncConfig = {
        serverUrl: 'http://localhost:3000',
        token: 'test-token',
        encryptionKey: 'test-key'
    };

    beforeEach(() => {
        service = new SyncService(config);
        vi.clearAllMocks();
    });

    it('should push changes successfully', async () => {
        const mockResponse = { status: 200, json: { success: true } };
        (obsidian.requestUrl as any).mockResolvedValue(mockResponse);

        const changes = [{ path: 'test.md', content: 'encrypted', hash: '123' }];
        const result = await service.push(changes);

        expect(result).toBe(true);
        expect(obsidian.requestUrl).toHaveBeenCalledWith(expect.objectContaining({
            url: 'http://localhost:3000/sync/push',
            method: 'POST',
            headers: expect.objectContaining({
                'Authorization': 'Bearer test-token'
            })
        }));
    });

    it('should pull changes successfully', async () => {
        const mockChanges = [{ path: 'remote.md', content: 'encrypted', hash: '456' }];
        const mockResponse = { status: 200, json: { changes: mockChanges } };
        (obsidian.requestUrl as any).mockResolvedValue(mockResponse);

        const result = await service.pull(0);

        expect(result).toEqual(mockChanges);
        expect(obsidian.requestUrl).toHaveBeenCalledWith(expect.objectContaining({
            url: 'http://localhost:3000/sync/pull?since=0',
            method: 'GET'
        }));
    });

    describe('encryption', () => {
        it('should encrypt content using AES-256-GCM', async () => {
            const plaintext = 'This is a test idea content';
            const encrypted = await service.encrypt(plaintext);

            // Encrypted content should be different from plaintext
            expect(encrypted).not.toBe(plaintext);
            // Encrypted content should be base64 encoded
            expect(() => atob(encrypted)).not.toThrow();
            // Encrypted content should be longer than plaintext (includes IV and auth tag)
            expect(encrypted.length).toBeGreaterThan(plaintext.length);
        });

        it('should decrypt encrypted content correctly', async () => {
            const plaintext = 'This is a test idea content';
            const encrypted = await service.encrypt(plaintext);
            const decrypted = await service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should produce different ciphertexts for same plaintext (IV uniqueness)', async () => {
            const plaintext = 'Same content';
            const encrypted1 = await service.encrypt(plaintext);
            const encrypted2 = await service.encrypt(plaintext);

            // Each encryption should produce different ciphertext due to random IV
            expect(encrypted1).not.toBe(encrypted2);
            // But both should decrypt to the same plaintext
            expect(await service.decrypt(encrypted1)).toBe(plaintext);
            expect(await service.decrypt(encrypted2)).toBe(plaintext);
        });

        it('should fail to decrypt with wrong key', async () => {
            const plaintext = 'Test content';
            const encrypted = await service.encrypt(plaintext);

            // Create a different service with different key
            const differentService = new SyncService({
                serverUrl: 'http://localhost:3000',
                token: 'test-token',
                encryptionKey: 'different-key'
            });

            // Decryption with wrong key should fail (Web Crypto throws DOMException)
            await expect(differentService.decrypt(encrypted)).rejects.toBeInstanceOf(Error);
        });

        it('should handle empty content', async () => {
            const plaintext = '';
            const encrypted = await service.encrypt(plaintext);
            const decrypted = await service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should handle large content', async () => {
            const plaintext = 'A'.repeat(10000);
            const encrypted = await service.encrypt(plaintext);
            const decrypted = await service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should fail to decrypt tampered content', async () => {
            const plaintext = 'Test content';
            const encrypted = await service.encrypt(plaintext);

            // Tamper with the encrypted content (modify a byte)
            const tampered = encrypted.slice(0, -5) + 'XXXXX';

            // Decryption should fail due to authentication failure
            await expect(service.decrypt(tampered)).rejects.toBeInstanceOf(Error);
        });

        it('should fail to decrypt with invalid base64', async () => {
            const invalidBase64 = 'not-valid-base64!!!';

            // Decryption should fail when trying to decode invalid base64
            await expect(service.decrypt(invalidBase64)).rejects.toBeInstanceOf(Error);
        });

        it('should fail to decrypt with too short content (missing IV)', async () => {
            // Content shorter than 12 bytes (IV size) should fail
            const tooShort = btoa('short');

            await expect(service.decrypt(tooShort)).rejects.toBeInstanceOf(Error);
        });

        it('should handle concurrent encryption operations', async () => {
            const plaintexts = ['Content 1', 'Content 2', 'Content 3'];
            const encryptionPromises = plaintexts.map(text => service.encrypt(text));
            const encrypted = await Promise.all(encryptionPromises);

            // All should be different due to random IVs
            expect(encrypted[0]).not.toBe(encrypted[1]);
            expect(encrypted[1]).not.toBe(encrypted[2]);

            // All should decrypt correctly
            const decryptionPromises = encrypted.map(enc => service.decrypt(enc));
            const decrypted = await Promise.all(decryptionPromises);

            expect(decrypted).toEqual(plaintexts);
        });
    });

    describe('file change detection', () => {
        it('should compute SHA-256 hash of content', async () => {
            const content = 'Test content';
            const hash = await service.computeHash(content);

            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
            expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
        });

        it('should produce same hash for same content', async () => {
            const content = 'Test content';
            const hash1 = await service.computeHash(content);
            const hash2 = await service.computeHash(content);

            expect(hash1).toBe(hash2);
        });

        it('should produce different hashes for different content', async () => {
            const hash1 = await service.computeHash('Content 1');
            const hash2 = await service.computeHash('Content 2');

            expect(hash1).not.toBe(hash2);
        });

        it('should detect file changes by comparing hashes', async () => {
            const content1 = 'Original content';
            const content2 = 'Modified content';
            const hash1 = await service.computeHash(content1);
            const hash2 = await service.computeHash(content2);

            const hasChanged = hash1 !== hash2;
            expect(hasChanged).toBe(true);
        });
    });

    describe('conflict detection', () => {
        it('should detect conflicts when server has newer version', async () => {
            const localChange = {
                path: 'test.md',
                content: 'local content',
                hash: 'local-hash',
                timestamp: 1000
            };

            const serverChange = {
                path: 'test.md',
                content: 'server content',
                hash: 'server-hash',
                timestamp: 2000 // Newer than local
            };

            const hasConflict = service.detectConflict(localChange, serverChange);
            expect(hasConflict).toBe(true);
        });

        it('should not detect conflicts when local is newer', async () => {
            const localChange = {
                path: 'test.md',
                content: 'local content',
                hash: 'local-hash',
                timestamp: 2000
            };

            const serverChange = {
                path: 'test.md',
                content: 'server content',
                hash: 'server-hash',
                timestamp: 1000 // Older than local
            };

            const hasConflict = service.detectConflict(localChange, serverChange);
            expect(hasConflict).toBe(false);
        });

        it('should not detect conflicts for different files', async () => {
            const localChange = {
                path: 'file1.md',
                content: 'content1',
                hash: 'hash1',
                timestamp: 1000
            };

            const serverChange = {
                path: 'file2.md',
                content: 'content2',
                hash: 'hash2',
                timestamp: 2000
            };

            const hasConflict = service.detectConflict(localChange, serverChange);
            expect(hasConflict).toBe(false);
        });
    });

    describe('retry logic', () => {
        it('should retry on network failure', async () => {
            let attemptCount = 0;
            (obsidian.requestUrl as any).mockImplementation(() => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('Network error');
                }
                return Promise.resolve({ status: 200, json: { success: true } });
            });

            const changes = [{ path: 'test.md', content: 'encrypted', hash: '123' }];
            const result = await service.push(changes);

            expect(result).toBe(true);
            expect(attemptCount).toBe(3);
        });

        it('should fail after max retries', async () => {
            (obsidian.requestUrl as any).mockRejectedValue(new Error('Network error'));

            const changes = [{ path: 'test.md', content: 'encrypted', hash: '123' }];
            const result = await service.push(changes);

            expect(result).toBe(false);
            expect(obsidian.requestUrl).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should not retry on 4xx errors', async () => {
            (obsidian.requestUrl as any).mockResolvedValue({ status: 400, json: { error: 'Bad request' } });

            const changes = [{ path: 'test.md', content: 'encrypted', hash: '123' }];
            const result = await service.push(changes);

            expect(result).toBe(false);
            expect(obsidian.requestUrl).toHaveBeenCalledTimes(1); // No retries for 4xx
        });
    });

    describe('action detection', () => {
        it('should determine create action for new file', () => {
            const action = service.determineAction(null, 'new-content');
            expect(action).toBe('create');
        });

        it('should determine update action for modified file', () => {
            const action = service.determineAction('old-hash', 'new-content');
            expect(action).toBe('update');
        });

        it('should determine delete action when file is removed', () => {
            const action = service.determineAction('old-hash', null);
            expect(action).toBe('delete');
        });
    });
});
