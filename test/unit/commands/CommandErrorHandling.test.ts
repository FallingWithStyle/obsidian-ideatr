
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Plugin } from '../../mocks/obsidian';
import { CommandRegistry } from '../../../src/commands/CommandRegistry';
import { CommandContext } from '../../../src/commands/base/CommandContext';

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

// Mock CaptureCommand to throw in constructor
vi.mock('../../../src/commands/capture/CaptureCommand', () => {
    return {
        CaptureCommand: class {
            constructor() {
                throw new Error('Constructor Error');
            }
            execute() {
                return Promise.resolve();
            }
        }
    };
});

describe('CommandRegistry Reproduction (Fixed)', () => {
    let mockPlugin: Plugin;
    let mockContext: CommandContext;
    let registeredCommands: Array<{ id: string; name: string; callback: () => void }>;

    beforeEach(() => {
        registeredCommands = [];

        mockPlugin = {
            addCommand: vi.fn((command) => {
                registeredCommands.push(command);
            }),
        } as any;

        mockContext = {} as any;

        // Spy on console.error
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should log error if command constructor throws', async () => {
        // Register all commands (which includes our mocked CaptureCommand)
        CommandRegistry.registerAll(mockPlugin, mockContext);

        const command = registeredCommands.find(c => c.id === 'capture-idea');
        expect(command).toBeDefined();

        // Execute the callback
        // It should NOT throw now, because safeExecute catches it
        await expect(async () => {
            await command?.callback();
        }).not.toThrow();

        // Verify Logger.error WAS called
        expect(Logger.error).toHaveBeenCalledWith(
            expect.stringContaining("Command 'Capture Idea' failed:"),
            expect.any(Error)
        );

        // Verify start log was called
        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining("Starting command: Capture Idea"));
    });
});
