import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService, SyncConfig, FileChange } from '../../src/services/SyncService';
import * as obsidian from 'obsidian';

// Mock Obsidian's requestUrl
vi.mock('obsidian', () => ({
    requestUrl: vi.fn()
}));

describe('SyncService Integration Tests', () => {
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

    describe('end-to-end sync flow', () => {
        it('should encrypt content before pushing', async () => {
            const plaintext = 'Test idea content';
            const hash = await service.computeHash(plaintext);
            const encrypted = await service.encrypt(plaintext);

            const changes: FileChange[] = [{
                path: 'Ideas/2025-11-29-test.md',
                content: encrypted,
                hash: hash,
                action: 'create',
                timestamp: Date.now()
            }];

            const mockResponse = { status: 200, json: { success: true } };
            (obsidian.requestUrl as any).mockResolvedValue(mockResponse);

            const result = await service.push(changes);

            expect(result).toBe(true);
            // Verify encrypted content was sent (not plaintext)
            const callArgs = (obsidian.requestUrl as any).mock.calls[0][0];
            const payload = JSON.parse(callArgs.body);
            expect(payload.changes[0].content).toBe(encrypted);
            expect(payload.changes[0].content).not.toBe(plaintext);
        });

        it('should decrypt content after pulling', async () => {
            const plaintext = 'Remote idea content';
            const hash = await service.computeHash(plaintext);
            const encrypted = await service.encrypt(plaintext);

            const mockChanges: FileChange[] = [{
                path: 'Ideas/2025-11-29-remote.md',
                content: encrypted,
                hash: hash,
                action: 'update',
                timestamp: Date.now()
            }];

            const mockResponse = { status: 200, json: { changes: mockChanges } };
            (obsidian.requestUrl as any).mockResolvedValue(mockResponse);

            const result = await service.pull(0);

            expect(result).toHaveLength(1);
            expect(result[0].path).toBe('Ideas/2025-11-29-remote.md');
            // Content should be encrypted when pulled
            expect(result[0].content).toBe(encrypted);

            // Decrypt to verify
            const decrypted = await service.decrypt(result[0].content);
            expect(decrypted).toBe(plaintext);
        });

        it('should handle conflict detection in sync flow', async () => {
            const localContent = 'Local content';
            const serverContent = 'Server content';
            const localHash = await service.computeHash(localContent);
            const serverHash = await service.computeHash(serverContent);

            const localChange: FileChange = {
                path: 'Ideas/conflict.md',
                content: await service.encrypt(localContent),
                hash: localHash,
                action: 'update',
                timestamp: 1000
            };

            const serverChange: FileChange = {
                path: 'Ideas/conflict.md',
                content: await service.encrypt(serverContent),
                hash: serverHash,
                action: 'update',
                timestamp: 2000 // Newer than local
            };

            const hasConflict = service.detectConflict(localChange, serverChange);
            expect(hasConflict).toBe(true);
        });

        it('should handle multiple file changes in one sync', async () => {
            const files = [
                { path: 'Ideas/file1.md', content: 'Content 1' },
                { path: 'Ideas/file2.md', content: 'Content 2' },
                { path: 'Ideas/file3.md', content: 'Content 3' }
            ];

            const changes: FileChange[] = await Promise.all(
                files.map(async (file) => {
                    const hash = await service.computeHash(file.content);
                    const encrypted = await service.encrypt(file.content);
                    return {
                        path: file.path,
                        content: encrypted,
                        hash: hash,
                        action: 'create' as const,
                        timestamp: Date.now()
                    };
                })
            );

            const mockResponse = { status: 200, json: { success: true } };
            (obsidian.requestUrl as any).mockResolvedValue(mockResponse);

            const result = await service.push(changes);

            expect(result).toBe(true);
            const callArgs = (obsidian.requestUrl as any).mock.calls[0][0];
            const payload = JSON.parse(callArgs.body);
            expect(payload.changes).toHaveLength(3);
        });
    });

    describe('network failure scenarios', () => {
        it('should handle network timeout with retry', async () => {
            let attemptCount = 0;
            (obsidian.requestUrl as any).mockImplementation(() => {
                attemptCount++;
                if (attemptCount < 2) {
                    throw new Error('Network timeout');
                }
                return Promise.resolve({ status: 200, json: { success: true } });
            });

            const changes: FileChange[] = [{
                path: 'test.md',
                content: await service.encrypt('content'),
                hash: await service.computeHash('content'),
                action: 'create'
            }];

            const result = await service.push(changes);

            expect(result).toBe(true);
            expect(attemptCount).toBe(2);
        });

        it('should handle server errors with retry', async () => {
            let attemptCount = 0;
            (obsidian.requestUrl as any).mockImplementation(() => {
                attemptCount++;
                if (attemptCount < 2) {
                    return Promise.resolve({ status: 500, json: { error: 'Internal server error' } });
                }
                return Promise.resolve({ status: 200, json: { success: true } });
            });

            const changes: FileChange[] = [{
                path: 'test.md',
                content: await service.encrypt('content'),
                hash: await service.computeHash('content'),
                action: 'create'
            }];

            const result = await service.push(changes);

            expect(result).toBe(true);
            expect(attemptCount).toBe(2);
        });
    });

    describe('conflict resolution scenarios', () => {
        it('should apply last-writer-wins for conflicts', async () => {
            const localChange: FileChange = {
                path: 'Ideas/test.md',
                content: await service.encrypt('Local version'),
                hash: await service.computeHash('Local version'),
                timestamp: 1000
            };

            const serverChange: FileChange = {
                path: 'Ideas/test.md',
                content: await service.encrypt('Server version'),
                hash: await service.computeHash('Server version'),
                timestamp: 2000 // Server is newer
            };

            // Server version should win (last writer wins)
            const hasConflict = service.detectConflict(localChange, serverChange);
            expect(hasConflict).toBe(true);
        });

        it('should allow local changes when local is newer', async () => {
            const localChange: FileChange = {
                path: 'Ideas/test.md',
                content: await service.encrypt('Local version'),
                hash: await service.computeHash('Local version'),
                timestamp: 2000
            };

            const serverChange: FileChange = {
                path: 'Ideas/test.md',
                content: await service.encrypt('Server version'),
                hash: await service.computeHash('Server version'),
                timestamp: 1000 // Server is older
            };

            // No conflict - local should win
            const hasConflict = service.detectConflict(localChange, serverChange);
            expect(hasConflict).toBe(false);
        });
    });

    describe('patch application', () => {
        it('should prepare changes for application by decrypting', async () => {
            const plaintext = 'File content to apply';
            const hash = await service.computeHash(plaintext);
            const encrypted = await service.encrypt(plaintext);

            const remoteChanges: FileChange[] = [{
                path: 'Ideas/2025-11-29-new.md',
                content: encrypted,
                hash: hash,
                action: 'create',
                timestamp: Date.now()
            }];

            const prepared = await service.prepareChangesForApplication(remoteChanges);

            expect(prepared).toHaveLength(1);
            expect(prepared[0].path).toBe('Ideas/2025-11-29-new.md');
            expect(prepared[0].content).toBe(plaintext); // Should be decrypted
            expect(prepared[0].hash).toBe(hash);
            expect(prepared[0].action).toBe('create');
        });

        it('should handle delete actions without decryption', async () => {
            const remoteChanges: FileChange[] = [{
                path: 'Ideas/2025-11-29-deleted.md',
                content: '', // No content for delete
                hash: '',
                action: 'delete',
                timestamp: Date.now()
            }];

            const prepared = await service.prepareChangesForApplication(remoteChanges);

            expect(prepared).toHaveLength(1);
            expect(prepared[0].action).toBe('delete');
            expect(prepared[0].content).toBe('');
        });

        it('should validate file change integrity', async () => {
            const content = 'Test content';
            const hash = await service.computeHash(content);

            const isValid = await service.validateFileChange({
                path: 'test.md',
                content: content,
                hash: hash
            });

            expect(isValid).toBe(true);
        });

        it('should detect invalid file changes', async () => {
            const content = 'Test content';
            const wrongHash = 'wrong-hash';

            const isValid = await service.validateFileChange({
                path: 'test.md',
                content: content,
                hash: wrongHash
            });

            expect(isValid).toBe(false);
        });

        it('should handle multiple changes in batch', async () => {
            const files = [
                { path: 'Ideas/file1.md', content: 'Content 1', action: 'create' as const },
                { path: 'Ideas/file2.md', content: 'Content 2', action: 'update' as const },
                { path: 'Ideas/file3.md', content: '', action: 'delete' as const }
            ];

            const remoteChanges: FileChange[] = await Promise.all(
                files.map(async (file) => {
                    const hash = file.action === 'delete' ? '' : await service.computeHash(file.content);
                    const encrypted = file.action === 'delete' ? '' : await service.encrypt(file.content);
                    return {
                        path: file.path,
                        content: encrypted,
                        hash: hash,
                        action: file.action,
                        timestamp: Date.now()
                    };
                })
            );

            const prepared = await service.prepareChangesForApplication(remoteChanges);

            expect(prepared).toHaveLength(3);
            expect(prepared[0].action).toBe('create');
            expect(prepared[0].content).toBe('Content 1');
            expect(prepared[1].action).toBe('update');
            expect(prepared[1].content).toBe('Content 2');
            expect(prepared[2].action).toBe('delete');
            expect(prepared[2].content).toBe('');
        });
    });

    describe('rollback and conflict handling', () => {
        it('should create rollback state for file update', async () => {
            const originalContent = 'Original content';
            const rollbackState = await service.createRollbackState(
                'Ideas/test.md',
                originalContent,
                'update'
            );

            expect(rollbackState.path).toBe('Ideas/test.md');
            expect(rollbackState.originalContent).toBe(originalContent);
            expect(rollbackState.action).toBe('update');
            expect(rollbackState.originalHash).toBeDefined();
            expect(rollbackState.originalHash).toBe(await service.computeHash(originalContent));
        });

        it('should create rollback state for file creation', async () => {
            const rollbackState = await service.createRollbackState(
                'Ideas/new.md',
                null,
                'create'
            );

            expect(rollbackState.path).toBe('Ideas/new.md');
            expect(rollbackState.originalContent).toBeNull();
            expect(rollbackState.originalHash).toBeNull();
            expect(rollbackState.action).toBe('create');
        });

        it('should create rollback state for file deletion', async () => {
            const originalContent = 'Content to delete';
            const rollbackState = await service.createRollbackState(
                'Ideas/delete.md',
                originalContent,
                'delete'
            );

            expect(rollbackState.path).toBe('Ideas/delete.md');
            expect(rollbackState.originalContent).toBe(originalContent);
            expect(rollbackState.action).toBe('delete');
        });

        it('should generate conflict file name', () => {
            const conflictName = service.generateConflictFileName('Ideas/test.md');
            
            expect(conflictName).toContain('test');
            expect(conflictName).toContain('conflict-');
            expect(conflictName).toContain('.md');
            expect(conflictName).toMatch(/Ideas\/test \(conflict-\d+\)\.md/);
        });

        it('should generate conflict file name with custom timestamp', () => {
            const timestamp = 1234567890;
            const conflictName = service.generateConflictFileName('Ideas/test.md', timestamp);
            
            expect(conflictName).toBe('Ideas/test (conflict-1234567890).md');
        });

        it('should generate conflict file content with both versions', () => {
            const localContent = 'Local version content';
            const remoteContent = 'Remote version content';
            const localTimestamp = 1000;
            const remoteTimestamp = 2000;

            const conflictContent = service.generateConflictFileContent(
                'Ideas/test.md',
                localContent,
                remoteContent,
                localTimestamp,
                remoteTimestamp
            );

            expect(conflictContent).toContain('type: conflict');
            expect(conflictContent).toContain('Ideas/test.md');
            expect(conflictContent).toContain('Local Version');
            expect(conflictContent).toContain('Remote Version');
            expect(conflictContent).toContain(localContent);
            expect(conflictContent).toContain(remoteContent);
            expect(conflictContent).toContain('Resolution Instructions');
        });

        it('should include rollback state when preparing changes with original content provider', async () => {
            const remoteChanges: FileChange[] = [{
                path: 'Ideas/test.md',
                content: await service.encrypt('Remote content'),
                hash: await service.computeHash('Remote content'),
                action: 'update',
                timestamp: Date.now()
            }];

            const getOriginalContent = async (path: string) => {
                if (path === 'Ideas/test.md') {
                    return 'Original content';
                }
                return null;
            };

            const prepared = await service.prepareChangesForApplication(remoteChanges, getOriginalContent);

            expect(prepared).toHaveLength(1);
            expect(prepared[0].rollbackState).toBeDefined();
            expect(prepared[0].rollbackState?.originalContent).toBe('Original content');
            expect(prepared[0].rollbackState?.action).toBe('update');
        });
    });
});

