
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExpandCommand } from '../../../src/commands/transformation/ExpandCommand';
import { CommandContext } from '../../../src/commands/base/CommandContext';
import { Notice } from 'obsidian';

// Mock Obsidian Notice
vi.mock('obsidian', () => ({
    Notice: vi.fn(),
    TFile: class { },
    Modal: class {
        open() { }
        close() { }
    },
}));

// Mock Logger
vi.mock('../../../src/utils/logger', () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }
}));
import { Logger } from '../../../src/utils/logger';

describe('ExpandCommand Failure Reproduction', () => {
    let mockContext: CommandContext;
    let mockApp: any;
    let mockLLMService: any;

    beforeEach(() => {
        mockLLMService = {
            isAvailable: vi.fn().mockReturnValue(true),
            expandIdea: vi.fn(),
        };

        mockApp = {
            workspace: {
                getActiveFile: vi.fn(),
            },
            vault: {
                read: vi.fn(),
                modify: vi.fn(),
            },
        };

        mockContext = {
            app: mockApp,
            llmService: mockLLMService,
            frontmatterParser: {
                parse: vi.fn().mockReturnValue({ frontmatter: {}, body: 'test idea' }),
            },
        } as any;

        // Spy on console.error
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should silently exit if no active file', async () => {
        mockApp.workspace.getActiveFile.mockReturnValue(null);

        const command = new ExpandCommand(mockContext);
        await command.execute();

        // Should show notice and log debug
        expect(Notice).toHaveBeenCalledWith(expect.stringContaining('No active note'));
        expect(Logger.debug).toHaveBeenCalledWith('No active file found');
        expect(console.error).not.toHaveBeenCalled();
    });

    it('should silently exit if LLM not available', async () => {
        mockApp.workspace.getActiveFile.mockReturnValue({ path: 'Ideas/test.md' });
        mockLLMService.isAvailable.mockReturnValue(false);

        const command = new ExpandCommand(mockContext);
        await command.execute();

        // Should show notice and log debug
        expect(Notice).toHaveBeenCalledWith(expect.stringContaining('AI service is not configured'));
        expect(Logger.debug).toHaveBeenCalledWith('LLM service not available');
        expect(console.error).not.toHaveBeenCalled();
    });

    it('should silently exit if expandIdea not supported', async () => {
        mockApp.workspace.getActiveFile.mockReturnValue({ path: 'Ideas/test.md' });
        mockApp.vault.read.mockResolvedValue('content');
        // expandIdea method missing from service
        mockContext.llmService = { isAvailable: () => true } as any;

        const command = new ExpandCommand(mockContext);
        await command.execute();

        expect(Notice).toHaveBeenCalledWith(expect.stringContaining('not supported'));
        expect(Logger.debug).toHaveBeenCalledWith('LLM service does not support expandIdea');
        expect(console.error).not.toHaveBeenCalled();
    });
});
